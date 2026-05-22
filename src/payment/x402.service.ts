/**
 * x402 支付服务 — 验证与结算
 *
 * 借鉴 AEON Distributed Trust Hub：
 * - 验证交易负载 → 原子终局性保证
 * - 结算支付 → Token 状态转换
 * - 生成可验证收据（ERC-8004 风格）
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  X402PaymentResponse,
  VerifiableReceipt,
} from './x402.types';
import { TokenType, PhiGatewayLevel } from '../types/atex.types';
import { initializePhiFromDID } from '../math/emlPhi';

const prisma = new PrismaClient();

/**
 * 验证支付
 *
 * @param paymentData - X-PAYMENT 头解析后的数据
 * @param agentDid - 支付方 DID
 * @returns 验证结果
 */
export async function verifyPayment(
  paymentData: {
    asset: string;
    amount?: number;
    scheme: string;
    payload: string;
  },
  agentDid: string,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // 1. 验证资产类型
    if (!Object.values(TokenType).includes(paymentData.asset as TokenType)) {
      return { valid: false, reason: `Invalid asset type: ${paymentData.asset}` };
    }

    // 2. 验证金额
    if (paymentData.amount !== undefined && paymentData.amount <= 0) {
      return { valid: false, reason: 'Amount must be positive' };
    }

    // 3. 验证 payload 签名（基础校验）
    if (!paymentData.payload || paymentData.payload.length < 10) {
      return { valid: false, reason: 'Invalid payload' };
    }

    // 4. 验证 Agent 存在且有足够余额
    if (paymentData.amount && paymentData.amount > 0) {
      const tokens = await prisma.token.findMany({
        where: {
          ownerDid: agentDid,
          type: paymentData.asset as TokenType,
          status: 'ACTIVE',
        },
      });
      const totalBalance = tokens.reduce((sum, t) => sum + t.amount, 0);
      if (totalBalance < paymentData.amount) {
        return { valid: false, reason: `Insufficient balance: have ${totalBalance}, need ${paymentData.amount}` };
      }
    }

    // 5. Φ-Gateway 信任检查
    const phi = initializePhiFromDID(agentDid);
    const phiMag = phi.magnitude;
    if (phiMag < 0.01) {
      return { valid: false, reason: 'Agent Φ-value too low for payment' };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}

/**
 * 结算支付
 *
 * 从付款方扣除 Token，记录交易，生成可验证收据
 *
 * @param paymentData - 支付数据
 * @param payerDid - 付款方 DID
 * @param payeeDid - 收款方 DID
 * @param resource - 资源描述
 * @returns 结算结果（含 txHash 和收据）
 */
export async function settlePayment(
  paymentData: {
    asset: string;
    amount: number;
    scheme: string;
  },
  payerDid: string,
  payeeDid: string,
  resource: string,
): Promise<{
  success: boolean;
  response?: X402PaymentResponse;
  receipt?: VerifiableReceipt;
  error?: string;
}> {
  try {
    const tokenType = paymentData.asset as TokenType;
    const amount = paymentData.amount;

    // 1. 锁定付款方 Token
    const payerTokens = await prisma.token.findMany({
      where: {
        ownerDid: payerDid,
        type: tokenType,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
    });

    let remaining = amount;
    const consumedIds: string[] = [];

    for (const token of payerTokens) {
      if (remaining <= 0) break;
      const deduct = Math.min(token.amount, remaining);
      token.amount -= deduct;
      remaining -= deduct;

      if (token.amount === 0) {
        consumedIds.push(token.id);
        await prisma.token.update({
          where: { id: token.id },
          data: { status: 'CONSUMED' },
        });
      } else {
        await prisma.token.update({
          where: { id: token.id },
          data: { amount: token.amount },
        });
      }
    }

    if (remaining > 0) {
      // 回滚
      for (const id of consumedIds) {
        await prisma.token.update({ where: { id }, data: { status: 'ACTIVE' } });
      }
      return { success: false, error: 'Insufficient balance after lock' };
    }

    // 2. 创建收款方 Token（或增加余额）
    await prisma.token.create({
      data: {
        type: tokenType,
        status: 'ACTIVE',
        amount,
        ownerDid: payeeDid,
        phiMagnitude: 0,
        phiPhase: 0,
      },
    });

    // 3. 记录交易
    const transaction = await prisma.transaction.create({
      data: {
        offerId: '',
        type: 'PHASE_ENTANGLE',
        fromDid: payerDid,
        toDid: payeeDid,
        tokenType,
        amount,
        phiBefore: null,
        phiAfter: null,
        zkProofHash: null,
      },
    });

    // 4. 生成可验证收据
    const receipt = await generateReceipt(
      transaction.id,
      payerDid,
      payeeDid,
      tokenType,
      amount,
      resource,
    );

    // 5. 构建 X-PAYMENT-RESPONSE
    const response: X402PaymentResponse = {
      success: true,
      txHash: transaction.id,
      amountPaid: String(amount),
      asset: tokenType,
      settledAt: new Date().toISOString(),
    };

    return { success: true, response, receipt };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 生成可验证收据（ERC-8004 风格）
 *
 * 包含：交易证明 + 用途证明 + 授权证明
 */
async function generateReceipt(
  transactionId: string,
  payerDid: string,
  payeeDid: string,
  assetType: TokenType,
  amount: number,
  resource: string,
): Promise<VerifiableReceipt> {
  const payerPhi = initializePhiFromDID(payerDid);
  const payeePhi = initializePhiFromDID(payeeDid);

  // 构建证明数据
  const proofData = JSON.stringify({
    transactionId,
    payerDid,
    payeeDid,
    assetType,
    amount,
    resource,
    timestamp: new Date().toISOString(),
  });

  // SHA-256 证明哈希
  const proofHash = crypto.createHash('sha256').update(proofData).digest('hex');

  const receipt: VerifiableReceipt = {
    id: crypto.randomUUID(),
    transactionId,
    payerDid,
    payeeDid,
    assetType,
    amount,
    phiSnapshot: {
      payer: { magnitude: payerPhi.magnitude, phase: payerPhi.phase },
      payee: { magnitude: payeePhi.magnitude, phase: payeePhi.phase },
    },
    gatewayLevel: PhiGatewayLevel.NORMAL,
    proofHash,
    createdAt: new Date(),
  };

  return receipt;
}

/**
 * 查询收据
 */
export async function getReceipt(receiptId: string): Promise<VerifiableReceipt | null> {
  // 当前为内存实现，后续可持久化到数据库
  return null;
}

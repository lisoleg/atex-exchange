/**
 * POST /offer 路由
 * 创建交易报价
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { phaseEntangle, validateOfferBalance } from '../../core/phaseEntangle';
import { processOfferActivity, validateOfferRequest } from '../../federation/offerActivity';
import { initializePhiFromDID } from '../../math/emlPhi';
import { createOffer, getOfferById } from '../../models/offer.model';
import { createTransaction } from '../../models/transaction.model';
import { storeActivityHash } from '../../consensus/holoboundaryStore';
import { TokenType, OfferStatus, TransactionType } from '../../types/atex.types';
import { AtexError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

/** 创建 Offer 请求 Schema */
const createOfferSchema = z.object({
  offererDid: z.string().min(10),
  receiverDid: z.string().optional(),
  offerTokenType: z.enum(['CALC', 'WIT', 'WORD', 'PASS']),
  offerAmount: z.number().positive(),
  reqTokenType: z.enum(['CALC', 'WIT', 'WORD', 'PASS']),
  reqAmount: z.number().positive(),
});

/**
 * POST /offer
 * 创建交易报价
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // 1. 请求验证
    const parsed = createOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.error.message,
      });
      return;
    }

    const data = parsed.data as {
      offererDid: string;
      receiverDid?: string;
      offerTokenType: TokenType;
      offerAmount: number;
      reqTokenType: TokenType;
      reqAmount: number;
    };

    // 2. 业务验证
    const validation = validateOfferRequest(data);
    if (!validation.valid) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: validation.errors.join('; '),
      });
      return;
    }

    // 3. 获取 offerer 的 Φ 值
    const offererPhi = initializePhiFromDID(data.offererDid);

    // 4. 查询 offerer 的 Token 余额
    const tokens = await prisma.token.findMany({
      where: { ownerDid: data.offererDid, status: 'ACTIVE' },
    });

    // 5. 验证余额
    const tokenInfos = tokens.map(t => ({
      id: t.id,
      type: t.type as TokenType,
      status: t.status as unknown as import('../../types/atex.types').TokenStatus,
      amount: t.amount,
      phi: { magnitude: t.phiMagnitude, phase: t.phiPhase },
      ownerDid: t.ownerDid,
      offerId: t.offerId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    const hasBalance = validateOfferBalance(tokenInfos, data);
    if (!hasBalance) {
      throw new AtexError('ATEX_005', 400);
    }

    // 6. 执行相位缠绕算法
    const entangleResult = phaseEntangle(data, offererPhi, tokenInfos);

    // 7. 获取 Φ-Gateway 决策 (从中间件)
    const gatewayResult = req.phiGatewayResult;

    // 8. 创建 Offer 记录
    const offer = await createOffer({
      offererDid: data.offererDid,
      receiverDid: data.receiverDid,
      offerTokenType: data.offerTokenType as TokenType,
      offerAmount: data.offerAmount,
      reqTokenType: data.reqTokenType as TokenType,
      reqAmount: data.reqAmount,
      phiDiff: entangleResult.phiDiff,
      jitterImpact: entangleResult.jitterResult.impact,
      gatewayLevel: gatewayResult?.level as any || 'NORMAL',
    });

    // 9. 锁定原始 Token
    const lockTokens = tokenInfos
      .filter(t => t.type === data.offerTokenType)
      .slice(0, 1); // 锁定第一个匹配的 Token
    for (const token of lockTokens) {
      await prisma.token.update({
        where: { id: token.id },
        data: { status: 'LOCKED' },
      });
    }

    // 10. 创建临时 Token (Issued)
    const tempToken = await prisma.token.create({
      data: {
        type: entangleResult.tempTokenData.type,
        status: 'ISSUED',
        amount: entangleResult.tempTokenData.amount,
        phiMagnitude: entangleResult.tempTokenData.phiMagnitude,
        phiPhase: entangleResult.tempTokenData.phiPhase,
        ownerDid: data.offererDid,
        offerId: offer.id,
      },
    });

    // 11. 创建交易记录 (相位缠绕)
    await createTransaction({
      offerId: offer.id,
      type: TransactionType.PHASE_ENTANGLE,
      fromDid: data.offererDid,
      toDid: data.receiverDid || '',
      tokenType: data.offerTokenType as TokenType,
      amount: data.offerAmount,
      phiBefore: offererPhi.phase,
      phiAfter: entangleResult.tempTokenData.phiPhase,
    });

    // 12. 处理联邦逻辑
    const activityResult = processOfferActivity(
      offer.id,
      data,
      gatewayResult || { level: 'NORMAL' as any, didVerified: true, gradientMagnitude: 0, intentScore: 1, antiPhaseDetected: false, singularity139Detected: false },
      entangleResult.phiDiff
    );

    // 13. 存储哈希到全息边界
    storeActivityHash(activityResult.activity);

    // 14. 返回响应
    res.status(201).json({
      offerId: offer.id,
      status: OfferStatus.OPEN,
      gatewayLevel: gatewayResult?.level || 'NORMAL',
      phiDiff: entangleResult.phiDiff,
      jitterImpact: entangleResult.jitterResult.impact,
      tempTokenId: tempToken.id,
      activityId: activityResult.activityId,
    });
  } catch (error) {
    if (error instanceof AtexError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    throw error;
  }
});

export default router;

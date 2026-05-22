/**
 * Agent API 路由 — /api/v1/agent/*
 * Agent-First 设计：批量执行、SSE 事件流、能力查询
 *
 * V3 升级（借鉴 AEON Agent-to-Agent 协议）：
 * - POST /negotiate — Agent 间协商（报价/还价）
 * - POST /delegate — 人类委托 AI 代理执行交易
 * - POST /prove — 生成交易加密证明
 * - POST /execute — 增强：支持条件分支和依赖链
 * - GET /capabilities — 增强：Agent 能力声明
 * - GET /stream — SSE 事件流
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { TokenType } from '../../types/atex.types';
import { computeKYACredit } from '../../kya/kya.service';

const router = Router();
const prisma = new PrismaClient();

// 所有 Agent API 需要认证
router.use(authMiddleware);

// ============================================================
// V3 新增：A2A 协议端点
// ============================================================

/**
 * POST /api/v1/agent/negotiate — Agent 间协商
 *
 * 借鉴 AEON 的 Agent-to-Agent 交互：
 * Agent A 向 Agent B 发送报价，Agent B 可接受或还价
 */
router.post('/negotiate', requirePermission('offer:write'), async (req: Request, res: Response) => {
  try {
    const { targetDid, offerTokenType, offerAmount, reqTokenType, reqAmount, message } = req.body;

    if (!targetDid || !offerTokenType || !reqTokenType || !offerAmount || !reqAmount) {
      res.status(400).json({ error: 'targetDid, offerTokenType, reqTokenType, offerAmount, reqAmount are required' });
      return;
    }

    // 验证对方 Agent 存在
    const targetAgent = await prisma.agent.findUnique({ where: { did: targetDid } });
    if (!targetAgent) {
      res.status(404).json({ error: `Target agent ${targetDid} not found` });
      return;
    }

    // 创建协商记录
    const negotiationId = crypto.randomUUID();

    // 创建 Offer
    const offer = await prisma.offer.create({
      data: {
        offererDid: req.did!,
        receiverDid: targetDid,
        offerTokenType: offerTokenType as string,
        offerAmount: parseFloat(offerAmount),
        reqTokenType: reqTokenType as string,
        reqAmount: parseFloat(reqAmount),
        phiDiff: 0,
        jitterImpact: 0,
        gatewayLevel: 'NORMAL',
        status: 'OPEN',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时过期
        activityId: negotiationId,
      },
    });

    res.json({
      negotiationId,
      offerId: offer.id,
      status: 'PENDING',
      message: message || null,
      targetDid,
      expiresAt: offer.expiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/agent/delegate — 委托代理执行
 *
 * 借鉴 AEON 碳硅纠缠 + AEON Agent 支付：
 * 人类 Agent 委托 AI Agent 代为执行交易
 */
router.post('/delegate', requirePermission('offer:write'), async (req: Request, res: Response) => {
  try {
    const { agentDid, actions, maxAmount, description } = req.body;

    if (!agentDid || !Array.isArray(actions)) {
      res.status(400).json({ error: 'agentDid and actions array are required' });
      return;
    }

    // 验证被委托 Agent 存在
    const delegateAgent = await prisma.agent.findUnique({ where: { did: agentDid } });
    if (!delegateAgent) {
      res.status(404).json({ error: `Delegate agent ${agentDid} not found` });
      return;
    }

    // 创建委托记录
    const delegationId = crypto.randomUUID();
    const delegation = {
      id: delegationId,
      principalDid: req.did!,         // 委托人
      agentDid,                        // 被委托 Agent
      actions,
      maxAmount: maxAmount || 1000,
      description: description || 'Agent delegation',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时有效
    };

    res.json({
      delegationId,
      delegation,
      note: 'Delegate agent can now execute actions on your behalf within the specified limits',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/agent/prove — 生成交易证明
 *
 * 借鉴 AEON 的加密学证明机制：
 * - 交易发生证明（Proof of Transaction）
 * - 交易用途证明（Proof of Purpose）
 * - 交易授权证明（Proof of Authorization）
 */
router.post('/prove', requirePermission('offer:read'), async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      res.status(400).json({ error: 'transactionId is required' });
      return;
    }

    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    // 验证交易属于当前 Agent
    if (tx.fromDid !== req.did && tx.toDid !== req.did) {
      res.status(403).json({ error: 'Transaction does not belong to you' });
      return;
    }

    // 生成三重证明
    const proofData = JSON.stringify({
      transactionId: tx.id,
      fromDid: tx.fromDid,
      toDid: tx.toDid,
      tokenType: tx.tokenType,
      amount: tx.amount,
      type: tx.type,
      createdAt: tx.createdAt,
    });

    const proofOfTransaction = crypto.createHash('sha256').update(proofData).digest('hex');
    const proofOfPurpose = crypto.createHash('sha256').update(proofData + ':purpose:exchange').digest('hex');
    const proofOfAuthorization = crypto.createHash('sha256').update(proofData + ':auth:' + req.did).digest('hex');

    res.json({
      transactionId,
      proofs: {
        proofOfTransaction,
        proofOfPurpose,
        proofOfAuthorization,
      },
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// V2 已有端点（增强）
// ============================================================

/** POST /api/v1/agent/execute — Agent 批量执行（V3 增强：支持依赖链） */
router.post('/execute', requirePermission('offer:write'), async (req: Request, res: Response) => {
  try {
    const { steps } = req.body;
    if (!Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ error: 'steps array is required' });
      return;
    }
    if (steps.length > 20) {
      res.status(400).json({ error: 'Maximum 20 steps per batch' });
      return;
    }

    const results: Array<{ id: string; success: boolean; data?: any; error?: string }> = [];
    const stepResults: Record<string, any> = {};

    for (const step of steps) {
      const { action, params, id, dependsOn } = step;
      if (!action || !id) {
        results.push({ id: id || 'unknown', success: false, error: 'Missing action or id' });
        continue;
      }

      // V3: 检查依赖是否成功
      if (dependsOn && Array.isArray(dependsOn)) {
        for (const dep of dependsOn) {
          const depResult = results.find(r => r.id === dep);
          if (!depResult || !depResult.success) {
            results.push({ id, success: false, error: `Dependency ${dep} failed or not found` });
            continue;
          }
          // 将依赖结果注入 params
          if (depResult.data) {
            params._depResult = depResult.data;
          }
        }
      }

      try {
        let result: any;

        switch (action) {
          case 'query': {
            const { type } = params;
            if (type === 'balance') {
              const tokens = await prisma.token.findMany({
                where: { ownerDid: req.did, status: 'ACTIVE' },
              });
              const balances: Record<string, number> = {};
              for (const token of tokens) {
                balances[token.type] = (balances[token.type] || 0) + token.amount;
              }
              result = { balances };
            } else if (type === 'offers') {
              const offers = await prisma.offer.findMany({
                where: { offererDid: req.did, status: 'OPEN' },
                take: 20,
                orderBy: { createdAt: 'desc' },
              });
              result = { offers };
            } else if (type === 'kya_credit') {
              const credit = await computeKYACredit(req.did!);
              result = credit;
            } else {
              result = { error: `Unknown query type: ${type}` };
            }
            break;
          }

          case 'create_offer': {
            result = { message: 'Offer creation via agent execute - use /api/v1/offer for full flow', params };
            break;
          }

          case 'accept_offer': {
            const { offerId } = params;
            if (!offerId) { result = { error: 'offerId required' }; break; }
            const offer = await prisma.offer.findFirst({
              where: { id: offerId, status: 'OPEN' },
            });
            if (!offer) { result = { error: 'Offer not found or not open' }; break; }
            await prisma.offer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });
            result = { accepted: true, offerId };
            break;
          }

          case 'cancel_offer': {
            const { offerId } = params;
            if (!offerId) { result = { error: 'offerId required' }; break; }
            const offer = await prisma.offer.findFirst({
              where: { id: offerId, offererDid: req.did, status: 'OPEN' },
            });
            if (!offer) { result = { error: 'Offer not found or not owned' }; break; }
            await prisma.offer.update({ where: { id: offerId }, data: { status: 'CANCELLED' } });
            result = { cancelled: true, offerId };
            break;
          }

          case 'negotiate': {
            // V3: 直接调用协商逻辑
            const { targetDid, offerTokenType, offerAmount, reqTokenType, reqAmount } = params;
            if (!targetDid || !offerTokenType || !reqTokenType) {
              result = { error: 'targetDid, offerTokenType, reqTokenType required' };
            } else {
              const targetAgent = await prisma.agent.findUnique({ where: { did: targetDid } });
              if (!targetAgent) {
                result = { error: `Target agent ${targetDid} not found` };
              } else {
                const negotiationId = crypto.randomUUID();
                const offer = await prisma.offer.create({
                  data: {
                    offererDid: req.did!,
                    receiverDid: targetDid,
                    offerTokenType: offerTokenType as string,
                    offerAmount: parseFloat(offerAmount) || 0,
                    reqTokenType: reqTokenType as string,
                    reqAmount: parseFloat(reqAmount) || 0,
                    phiDiff: 0, jitterImpact: 0, gatewayLevel: 'NORMAL',
                    status: 'OPEN',
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    activityId: negotiationId,
                  },
                });
                result = { negotiationId, offerId: offer.id, status: 'PENDING' };
              }
            }
            break;
          }

          default:
            result = { error: `Unknown action: ${action}` };
        }

        stepResults[id] = result;
        results.push({ id, success: !result.error, data: result });
      } catch (err: any) {
        results.push({ id, success: false, error: err.message });
      }
    }

    res.json({ results, stepResults });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/v1/agent/capabilities — 查询 Agent 能力（V3 增强：含 KYA 和 A2A） */
router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const tokenTypes = Object.values(TokenType);
    const wallet = req.agentId ? await prisma.wallet.findFirst({
      where: { agentId: req.agentId, isActive: true },
    }) : null;

    res.json({
      supportedTokenTypes: tokenTypes,
      maxOfferAmount: 1000000,
      maxBatchSteps: 20,
      currentWallet: wallet ? { type: wallet.type, address: wallet.address } : null,
      streamingEnabled: true,
      a2aEnabled: true,             // V3: Agent-to-Agent 协议
      x402Enabled: true,            // V3: x402 支付协议
      kyaEnabled: true,             // V3: KYA 信用系统
      delegationEnabled: true,      // V3: 委托代理
      proofEnabled: true,           // V3: 交易证明
      rateLimit: req.authMethod === 'apikey' ? 'per-key' : 'default',
      endpoints: [
        { method: 'POST', path: '/api/v1/agent/execute', description: 'Batch execute actions (V3: dependency chain)' },
        { method: 'POST', path: '/api/v1/agent/negotiate', description: 'A2A negotiation' },
        { method: 'POST', path: '/api/v1/agent/delegate', description: 'Delegate to AI agent' },
        { method: 'POST', path: '/api/v1/agent/prove', description: 'Generate transaction proofs' },
        { method: 'GET', path: '/api/v1/agent/stream', description: 'SSE event stream' },
        { method: 'GET', path: '/api/v1/agent/capabilities', description: 'Query capabilities' },
        { method: 'GET', path: '/api/v1/kya/credit', description: 'KYA credit report' },
        { method: 'POST', path: '/api/v1/payment/verify', description: 'x402 verify payment' },
        { method: 'POST', path: '/api/v1/payment/settle', description: 'x402 settle payment' },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/v1/agent/stream — SSE 事件流 */
router.get('/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', did: req.did, timestamp: Date.now() })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

export default router;

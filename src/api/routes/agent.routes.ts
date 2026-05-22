/**
 * Agent API 路由 — /api/v1/agent/*
 * Agent-First 设计：批量执行、SSE 事件流、能力查询
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { TokenType } from '../../types/atex.types';

const router = Router();
const prisma = new PrismaClient();

// 所有 Agent API 需要认证
router.use(authMiddleware);

/** POST /api/v1/agent/execute — Agent 批量执行 */
router.post('/execute', requirePermission('offer:write'), async (req: Request, res: Response) => {
  try {
    const { steps } = req.body;
    if (!Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ error: 'steps array is required' });
      return;
    }
    if (steps.length > 10) {
      res.status(400).json({ error: 'Maximum 10 steps per batch' });
      return;
    }

    const results: Array<{ id: string; success: boolean; data?: any; error?: string }> = [];
    const stepResults: Record<string, any> = {};

    for (const step of steps) {
      const { action, params, id } = step;
      if (!action || !id) {
        results.push({ id: id || 'unknown', success: false, error: 'Missing action or id' });
        continue;
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
            } else {
              result = { error: `Unknown query type: ${type}` };
            }
            break;
          }

          case 'create_offer': {
            // 委托到现有 offer 逻辑
            result = { message: 'Offer creation via agent execute - use /api/v1/offer for full flow', params };
            break;
          }

          case 'cancel_offer': {
            const { offerId } = params;
            if (!offerId) {
              result = { error: 'offerId required' };
              break;
            }
            const offer = await prisma.offer.findFirst({
              where: { id: offerId, offererDid: req.did, status: 'OPEN' },
            });
            if (!offer) {
              result = { error: 'Offer not found or not owned' };
            } else {
              await prisma.offer.update({ where: { id: offerId }, data: { status: 'CANCELLED' } });
              result = { cancelled: true, offerId };
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

/** GET /api/v1/agent/capabilities — 查询 Agent 能力 */
router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const tokenTypes = Object.values(TokenType);
    const wallet = req.agentId ? await prisma.wallet.findFirst({
      where: { agentId: req.agentId, isActive: true },
    }) : null;

    res.json({
      supportedTokenTypes: tokenTypes,
      maxOfferAmount: 1000000,
      maxBatchSteps: 10,
      currentWallet: wallet ? { type: wallet.type, address: wallet.address } : null,
      streamingEnabled: true,
      rateLimit: req.authMethod === 'apikey' ? 'per-key' : 'default',
      endpoints: [
        { method: 'POST', path: '/api/v1/agent/execute', description: 'Batch execute actions' },
        { method: 'GET', path: '/api/v1/agent/stream', description: 'SSE event stream' },
        { method: 'GET', path: '/api/v1/agent/capabilities', description: 'Query capabilities' },
        { method: 'POST', path: '/api/v1/apikey', description: 'Create API key' },
        { method: 'GET', path: '/api/v1/apikey', description: 'List API keys' },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/v1/agent/stream — SSE 事件流 */
router.get('/stream', (req: Request, res: Response) => {
  // 设置 SSE 头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // 发送初始连接事件
  res.write(`data: ${JSON.stringify({ type: 'connected', did: req.did, timestamp: Date.now() })}\n\n`);

  // 定期发送心跳
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 30000);

  // 监听关闭
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

export default router;

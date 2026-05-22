/**
 * 全局 SSE 流路由 — /api/v1/stream
 * 替代30秒轮询，提供实时事件推送
 */

import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { initializePhiFromDID } from '../../math/emlPhi';

const router = Router();
const prisma = new PrismaClient();

// 活跃的 SSE 连接
const clients = new Map<string, Response>();

/** GET /api/v1/stream — 全局 SSE 事件流 */
router.get('/', optionalAuth, (req: Request, res: Response) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // 设置 SSE 头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });

  // 发送初始连接事件
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, did: req.did || null, timestamp: Date.now() })}\n\n`);

  // 注册客户端
  clients.set(clientId, res);

  // 心跳
  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
  }, 15000);

  // 定期推送 Φ 值更新（替代前端 30s 轮询）
  const phiInterval = setInterval(async () => {
    try {
      const did = req.did || 'did:agent:current';
      const phi = initializePhiFromDID(did);
      res.write(`event: phi-update\ndata: ${JSON.stringify({ did, phi, timestamp: Date.now() })}\n\n`);
    } catch { /* ignore */ }
  }, 5000);

  // 定期推送订单簿更新
  const orderbookInterval = setInterval(async () => {
    try {
      const openCount = await prisma.offer.count({
        where: { status: 'OPEN', expiresAt: { gt: new Date() } },
      });
      res.write(`event: orderbook-update\ndata: ${JSON.stringify({ openOffers: openCount, timestamp: Date.now() })}\n\n`);
    } catch { /* ignore */ }
  }, 10000);

  // 监听关闭
  req.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(phiInterval);
    clearInterval(orderbookInterval);
    clients.delete(clientId);
  });
});

/** 向所有客户端广播事件（供其他模块调用） */
export function broadcastEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify({ ...data, timestamp: Date.now() })}\n\n`;
  for (const [, client] of clients) {
    try {
      client.write(payload);
    } catch { /* connection likely closed */ }
  }
}

/** 获取当前连接数 */
export function getConnectedClients(): number {
  return clients.size;
}

export default router;

/**
 * ATEX 应用入口
 * AgentWeb Token Exchange 服务器
 */

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { API_PORT, API_PREFIX, CORS_ORIGIN, OFFER_CLEANUP_INTERVAL } from './config/atex.config';
import { errorHandler } from './api/middleware/errorHandler';
import offerRoutes from './api/routes/offer.routes';
import acceptRoutes from './api/routes/accept.routes';
import cancelRoutes from './api/routes/cancel.routes';
import orderbookRoutes from './api/routes/orderbook.routes';
import historyRoutes from './api/routes/history.routes';
import { cleanupExpiredOffers } from './models/offer.model';
import { getFederationStatus } from './federation/liuRouter';
import { getHoloboundaryStats } from './consensus/holoboundaryStore';
import { cleanupExpiredSessions } from './auth/jwt.service';

// V2 新增路由
import authRoutes from './api/routes/auth.routes';
import walletRoutes from './api/routes/wallet.routes';
import agentRoutes from './api/routes/agent.routes';
import apikeyRoutes from './api/routes/apikey.routes';
import streamRoutes, { getConnectedClients } from './api/routes/stream.routes';

// V3 新增路由（AEON 借鉴）
import paymentRoutes from './api/routes/payment.routes';
import kyaRoutes from './api/routes/kya.routes';

// V3.1 新增路由（性能优化 + 开放问题）
import matchingRoutes from './api/routes/matching.routes';

const app = express();
const prisma = new PrismaClient();

// ============================================================
// 中间件
// ============================================================
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// 请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// 路由
// ============================================================

// 健康检查
app.get('/health', (_req, res) => {
  const federation = getFederationStatus();
  const holoboundary = getHoloboundaryStats();

  res.json({
    status: 'ok',
    service: 'ATEX - AgentWeb Token Exchange',
    version: '3.0.0',
    auth: { webAuthn: true, jwt: true, apiKey: true },
    x402: true,
    kya: true,
    sseClients: getConnectedClients(),
    federation,
    holoboundary: {
      totalRecords: holoboundary.totalRecords,
      chainHead: holoboundary.chainHead.substring(0, 16) + '...',
    },
    timestamp: new Date().toISOString(),
  });
});

// API 路由 — V1 (原有)
app.use(`${API_PREFIX}/offer`, offerRoutes);
app.use(`${API_PREFIX}/accept`, acceptRoutes);
app.use(`${API_PREFIX}/cancel`, cancelRoutes);
app.use(`${API_PREFIX}/orderbook`, orderbookRoutes);
app.use(`${API_PREFIX}/history`, historyRoutes);

// API 路由 — V2 新增
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/wallet`, walletRoutes);
app.use(`${API_PREFIX}/agent`, agentRoutes);
app.use(`${API_PREFIX}/apikey`, apikeyRoutes);
app.use(`${API_PREFIX}/stream`, streamRoutes);

// API 路由 — V3 新增（AEON 借鉴）
app.use(`${API_PREFIX}/payment`, paymentRoutes);
app.use(`${API_PREFIX}/kya`, kyaRoutes);

// API 路由 — V3.1 新增（性能优化 + 开放问题）
app.use(`${API_PREFIX}/matching`, matchingRoutes);

// 状态 API
app.get(`${API_PREFIX}/status`, async (_req, res) => {
  try {
    // 获取各类 Token 的总供应量
    const supplyStats = await prisma.token.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: {
        status: { notIn: ['RECYCLED', 'CONSUMED'] },
      },
    });

    // 获取订单簿统计
    const openOfferCount = await prisma.offer.count({
      where: { status: 'OPEN', expiresAt: { gt: new Date() } },
    });

    // 获取联邦网络状态
    const federation = getFederationStatus();

    res.json({
      supply: supplyStats.map(s => ({
        type: s.type,
        amount: s._sum.amount || 0,
      })),
      openOffers: openOfferCount,
      federation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Agent 余额查询 API
app.get(`${API_PREFIX}/balance/:did`, async (req, res) => {
  try {
    const { did } = req.params;
    const tokens = await prisma.token.findMany({
      where: { ownerDid: did, status: 'ACTIVE' },
    });

    // 按 Token 类型分组汇总
    const balances: Record<string, number> = {};
    for (const token of tokens) {
      balances[token.type] = (balances[token.type] || 0) + token.amount;
    }

    // 获取 Agent 的 Φ 值
    const agent = await prisma.agent.findUnique({ where: { did } });

    res.json({
      did,
      balances,
      phi: agent ? {
        magnitude: agent.phiMagnitude,
        phase: agent.phiPhase,
      } : null,
      tokenCount: tokens.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// 错误处理
app.use(errorHandler);

// ============================================================
// 定时任务
// ============================================================

// 定期清理过期 Offer
setInterval(async () => {
  try {
    const count = await cleanupExpiredOffers();
    if (count > 0) {
      console.log(`[Cleanup] 清理了 ${count} 个过期 Offer`);
    }
  } catch (error) {
    console.error('[Cleanup] 清理过期 Offer 失败:', error);
  }
}, OFFER_CLEANUP_INTERVAL);

// 定期清理过期 Session
setInterval(async () => {
  try {
    const count = await cleanupExpiredSessions();
    if (count > 0) {
      console.log(`[Cleanup] 清理了 ${count} 个过期 Session`);
    }
  } catch (error) {
    console.error('[Cleanup] 清理过期 Session 失败:', error);
  }
}, 60 * 60 * 1000); // 每小时

// ============================================================
// 启动服务器
// ============================================================

async function main() {
  try {
    // 连接数据库
    await prisma.$connect();
    console.log('[ATEX] 数据库连接成功');

    // 启动 HTTP 服务器
    app.listen(API_PORT, () => {
      console.log(`[ATEX] 服务器启动成功: http://localhost:${API_PORT}`);
      console.log(`[ATEX] API 前缀: ${API_PREFIX}`);
      console.log(`[ATEX] 健康检查: http://localhost:${API_PORT}/health`);
    });
  } catch (error) {
    console.error('[ATEX] 启动失败:', error);
    process.exit(1);
  }
}

main();

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('[ATEX] 正在关闭...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[ATEX] 正在关闭...');
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };

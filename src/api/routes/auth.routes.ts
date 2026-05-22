/**
 * 认证路由 — /api/v1/auth/*
 * WebAuthn 注册/登录 + JWT 刷新/注销
 */

import { Router, Request, Response } from 'express';
import {
  getRegistrationOptions,
  getAuthenticationOptions,
  verifyAuthentication,
  registerAndLogin,
  getRpConfig,
} from '../../auth/webauthn.service';
import { refreshSession, revokeSession, verifyRefreshToken } from '../../auth/jwt.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ============================================================
// 公开端点（无需认证）
// ============================================================

/** GET /api/v1/auth/rp-config — 获取 RP 配置（前端初始化需要） */
router.get('/rp-config', (_req: Request, res: Response) => {
  res.json(getRpConfig());
});

/** POST /api/v1/auth/register-options — 生成 WebAuthn 注册选项 */
router.post('/register-options', async (req: Request, res: Response) => {
  try {
    const { did, name } = req.body;
    if (!did) {
      res.status(400).json({ error: 'DID is required' });
      return;
    }

    // 确保 Agent 存在
    await prisma.agent.upsert({
      where: { did },
      update: { name: name || did },
      create: { did, name: name || did },
    });

    const options = await getRegistrationOptions(did);
    res.json({ did, options });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** POST /api/v1/auth/register — 验证注册 + 登录 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { did, name, webauthnResponse, deviceInfo } = req.body;
    if (!did || !webauthnResponse) {
      res.status(400).json({ error: 'did and webauthnResponse are required' });
      return;
    }

    const result = await registerAndLogin(did, name || did, webauthnResponse, deviceInfo);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/** POST /api/v1/auth/login-options — 生成 WebAuthn 登录选项 */
router.post('/login-options', async (req: Request, res: Response) => {
  try {
    const { did } = req.body;
    const { options, challengeKey } = await getAuthenticationOptions(did);
    res.json({ options, challengeKey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** POST /api/v1/auth/login — 验证 WebAuthn 登录 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { challengeKey, webauthnResponse, deviceInfo } = req.body;
    if (!challengeKey || !webauthnResponse) {
      res.status(400).json({ error: 'challengeKey and webauthnResponse are required' });
      return;
    }

    const result = await verifyAuthentication(challengeKey, webauthnResponse, deviceInfo);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

/** POST /api/v1/auth/dev-login — 开发模式：DID 直接登录（无 WebAuthn） */
router.post('/dev-login', async (req: Request, res: Response) => {
  try {
    const { did, name } = req.body;
    if (!did) {
      res.status(400).json({ error: 'DID is required' });
      return;
    }

    // 仅开发环境
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Dev login not available in production' });
      return;
    }

    const { signTokenPair, createSession } = await import('../../auth/jwt.service');
    const agent = await prisma.agent.upsert({
      where: { did },
      update: { name: name || did, lastLoginAt: new Date() },
      create: { did, name: name || did, lastLoginAt: new Date() },
    });

    const payload = { agentId: agent.id, did: agent.did, walletType: agent.walletType || undefined };
    const tokens = signTokenPair(payload);
    await createSession(agent.id, tokens.accessToken, tokens.refreshToken, agent.walletType || undefined);

    res.json({
      verified: true,
      agent: { id: agent.id, did: agent.did, name: agent.name, walletType: agent.walletType },
      tokens,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 受保护端点（需要认证）
// ============================================================

/** POST /api/v1/auth/refresh — 刷新 JWT */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const newTokens = await refreshSession(refreshToken);
    if (!newTokens) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    res.json({ tokens: newTokens });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** POST /api/v1/auth/logout — 注销 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || '';
    await revokeSession(token);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/v1/auth/me — 当前用户信息 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.agentId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const agent = await prisma.agent.findUnique({ where: { id: req.agentId } });
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // 获取余额
    const tokens = await prisma.token.findMany({ where: { ownerDid: agent.did, status: 'ACTIVE' } });
    const balances: Record<string, number> = {};
    for (const token of tokens) {
      balances[token.type] = (balances[token.type] || 0) + token.amount;
    }

    res.json({
      id: agent.id,
      did: agent.did,
      name: agent.name,
      walletType: agent.walletType,
      phi: { magnitude: agent.phiMagnitude, phase: agent.phiPhase },
      reputation: agent.reputation,
      balances,
      lastLoginAt: agent.lastLoginAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

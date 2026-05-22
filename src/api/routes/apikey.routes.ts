/**
 * API Key 路由 — /api/v1/apikey/*
 * Agent API Key 管理（创建/列表/吊销）
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// 所有 API Key 端点需要 JWT 认证（不允许用 API Key 管理 API Key）
router.use(authMiddleware);

/** POST /api/v1/apikey — 创建 API Key */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.agentId || req.authMethod !== 'jwt') {
      res.status(403).json({ error: 'API keys can only be created via JWT authentication' });
      return;
    }

    const { name, permissions, rateLimit, expiresIn } = req.body;
    if (!name) {
      res.status(400).json({ error: 'API key name is required' });
      return;
    }

    // 生成 API Key: atex_sk_<32 random hex chars>
    const rawKey = `atex_sk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 16);

    // 权限校验
    const validPermissions = [
      'offer:read', 'offer:write',
      'balance:read',
      'wallet:read', 'wallet:write',
      'agent:read', 'agent:write',
      '*',
    ];
    const perms = Array.isArray(permissions) ? permissions : ['offer:read', 'balance:read'];
    const invalidPerms = perms.filter((p: string) => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      res.status(400).json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` });
      return;
    }

    // 过期时间
    let expiresAt: Date | undefined;
    if (expiresIn) {
      const ms = parseDuration(expiresIn);
      if (ms) expiresAt = new Date(Date.now() + ms);
    }

    // 保存到 DB
    const apiKey = await prisma.apiKey.create({
      data: {
        agentId: req.agentId!,
        name,
        keyHash,
        keyPrefix,
        permissions: JSON.stringify(perms),
        rateLimit: rateLimit || 1000,
        expiresAt,
      },
    });

    // 返回完整 key（只显示一次！）
    res.json({
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,  // ⚠️ 只显示一次
      keyPrefix: apiKey.keyPrefix,
      permissions: perms,
      rateLimit: apiKey.rateLimit,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/v1/apikey — 列出 API Keys */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.agentId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const keys = await prisma.apiKey.findMany({
      where: { agentId: req.agentId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      keys: keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        permissions: JSON.parse(k.permissions),
        rateLimit: k.rateLimit,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** DELETE /api/v1/apikey/:id — 吊销 API Key */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.agentId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const key = await prisma.apiKey.findFirst({ where: { id, agentId: req.agentId } });
    if (!key) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    await prisma.apiKey.update({ where: { id }, data: { isActive: false } });

    res.json({ revoked: true, id, name: key.name });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** 解析时长字符串（如 "30d", "1y"） */
function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)(d|m|y)$/);
  if (!match) return null;
  const n = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 'd': return n * 24 * 60 * 60 * 1000;
    case 'm': return n * 30 * 24 * 60 * 60 * 1000;
    case 'y': return n * 365 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export default router;

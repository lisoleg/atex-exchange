/**
 * 认证中间件 — JWT + API Key 双通道
 * 支持 Bearer token (JWT) 和 API Key (atex_sk_...) 两种认证方式
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../auth/jwt.service';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      agentId?: string;
      did?: string;
      walletType?: string;
      authMethod?: 'jwt' | 'apikey';
      apiKeyPermissions?: string[];
    }
  }
}

/** JWT / API Key 双通道认证中间件 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid authorization scheme, use Bearer' });
    return;
  }

  // 尝试 API Key 认证（atex_sk_ 前缀）
  if (token.startsWith('atex_sk_')) {
    try {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const apiKey = await prisma.apiKey.findFirst({
        where: { keyHash, isActive: true },
      });

      if (!apiKey) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        res.status(401).json({ error: 'API key expired' });
        return;
      }

      // 更新 lastUsedAt
      await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

      // 查找 Agent
      const agent = await prisma.agent.findUnique({ where: { id: apiKey.agentId } });
      if (!agent) {
        res.status(401).json({ error: 'Agent not found' });
        return;
      }

      req.agentId = agent.id;
      req.did = agent.did;
      req.walletType = agent.walletType || undefined;
      req.authMethod = 'apikey';
      req.apiKeyPermissions = JSON.parse(apiKey.permissions);

      next();
      return;
    } catch (err) {
      res.status(401).json({ error: 'API key verification failed' });
      return;
    }
  }

  // 尝试 JWT 认证
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.agentId = payload.agentId;
  req.did = payload.did;
  req.walletType = payload.walletType;
  req.authMethod = 'jwt';

  next();
}

/** 可选认证 — 不强制要求，但有 token 就解析 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme === 'Bearer' && token) {
      if (token.startsWith('atex_sk_')) {
        try {
          const keyHash = crypto.createHash('sha256').update(token).digest('hex');
          const apiKey = await prisma.apiKey.findFirst({ where: { keyHash, isActive: true } });
          if (apiKey) {
            const agent = await prisma.agent.findUnique({ where: { id: apiKey.agentId } });
            if (agent) {
              req.agentId = agent.id;
              req.did = agent.did;
              req.authMethod = 'apikey';
              req.apiKeyPermissions = JSON.parse(apiKey.permissions);
            }
          }
        } catch { /* ignore */ }
      } else {
        const payload = verifyAccessToken(token);
        if (payload) {
          req.agentId = payload.agentId;
          req.did = payload.did;
          req.walletType = payload.walletType;
          req.authMethod = 'jwt';
        }
      }
    }
  }
  next();
}

/** 权限检查中间件（需在 authMiddleware 之后） */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.authMethod === 'jwt') {
      // JWT 认证默认拥有所有权限
      next();
      return;
    }
    if (req.authMethod === 'apikey' && req.apiKeyPermissions) {
      if (req.apiKeyPermissions.includes(permission) || req.apiKeyPermissions.includes('*')) {
        next();
        return;
      }
      res.status(403).json({ error: `Permission denied: ${permission}` });
      return;
    }
    res.status(403).json({ error: 'Permission denied' });
  };
}

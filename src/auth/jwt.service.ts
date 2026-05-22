/**
 * JWT 服务 — 签发/校验/刷新
 * access token 15min + refresh token 7d
 */

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'atex-dev-secret-change-in-production';
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

export interface JwtPayload {
  agentId: string;
  did: string;
  walletType?: string;
}

/** 签发 access + refresh token 对 */
export function signTokenPair(payload: JwtPayload): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { accessToken, refreshToken };
}

/** 校验 access token */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { type?: string };
    if (decoded.type === 'refresh') return null; // 不允许用 refresh token 充当 access
    return { agentId: decoded.agentId, did: decoded.did, walletType: decoded.walletType };
  } catch {
    return null;
  }
}

/** 校验 refresh token */
export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { type?: string };
    if (decoded.type !== 'refresh') return null;
    return { agentId: decoded.agentId, did: decoded.did, walletType: decoded.walletType };
  } catch {
    return null;
  }
}

/** 创建会话记录 */
export async function createSession(
  agentId: string,
  accessToken: string,
  refreshToken: string,
  walletType?: string,
  deviceInfo?: string
): Promise<void> {
  const tokenHash = hashToken(accessToken);
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天

  await prisma.session.create({
    data: { agentId, token: tokenHash, refreshToken: refreshHash, walletType, deviceInfo, expiresAt },
  });
}

/** 刷新 token — 验证旧 refresh，签发新对，更新 session */
export async function refreshSession(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const payload = verifyRefreshToken(oldRefreshToken);
  if (!payload) return null;

  // 查找旧 session
  const oldHash = hashToken(oldRefreshToken);
  const session = await prisma.session.findUnique({ where: { refreshToken: oldHash } });
  if (!session || session.expiresAt < new Date()) return null;

  // 签发新 token 对
  const newPair = signTokenPair(payload);

  // 删除旧 session，创建新 session
  await prisma.session.delete({ where: { id: session.id } });
  await createSession(payload.agentId, newPair.accessToken, newPair.refreshToken, payload.walletType, session.deviceInfo ?? undefined);

  return newPair;
}

/** 注销 — 删除 session */
export async function revokeSession(accessToken: string): Promise<boolean> {
  const tokenHash = hashToken(accessToken);
  try {
    await prisma.session.deleteMany({ where: { token: tokenHash } });
    return true;
  } catch {
    return false;
  }
}

/** 清理 Agent 的所有过期 session */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}

/** Token hash (SHA-256) */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// self-test
if (require.main === module) {
  const pair = signTokenPair({ agentId: 'test-id', did: 'did:agent:test' });
  const verified = verifyAccessToken(pair.accessToken);
  console.log('[jwt.service] self-test:', verified ? 'PASS' : 'FAIL', verified);
}

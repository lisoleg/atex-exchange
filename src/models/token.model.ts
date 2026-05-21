/**
 * Token 数据模型
 * 封装 Prisma Client 的 Token 相关数据库操作
 */

import { PrismaClient } from '@prisma/client';
import { TokenType, TokenStatus } from '../types/atex.types';
import type { TokenInfo, PhiValue } from '../types/atex.types';

const prisma = new PrismaClient();

/**
 * 创建 Token
 */
export async function createToken(data: {
  type: TokenType;
  status?: TokenStatus;
  amount: number;
  phiMagnitude: number;
  phiPhase: number;
  ownerDid: string;
  offerId?: string;
}): Promise<TokenInfo> {
  const token = await prisma.token.create({
    data: {
      type: data.type,
      status: data.status || TokenStatus.ACTIVE,
      amount: data.amount,
      phiMagnitude: data.phiMagnitude,
      phiPhase: data.phiPhase,
      ownerDid: data.ownerDid,
      offerId: data.offerId,
    },
  });

  return prismaTokenToInfo(token);
}

/**
 * 根据 ID 查询 Token
 */
export async function getTokenById(id: string): Promise<TokenInfo | null> {
  const token = await prisma.token.findUnique({ where: { id } });
  return token ? prismaTokenToInfo(token) : null;
}

/**
 * 查询 Agent 持有的所有 Token
 */
export async function getTokensByOwner(ownerDid: string): Promise<TokenInfo[]> {
  const tokens = await prisma.token.findMany({
    where: { ownerDid },
    orderBy: { createdAt: 'desc' },
  });
  return tokens.map(prismaTokenToInfo);
}

/**
 * 查询 Agent 指定类型和状态的 Token
 */
export async function getTokensByOwnerAndType(
  ownerDid: string,
  type: TokenType,
  status: TokenStatus = TokenStatus.ACTIVE
): Promise<TokenInfo[]> {
  const tokens = await prisma.token.findMany({
    where: { ownerDid, type, status },
  });
  return tokens.map(prismaTokenToInfo);
}

/**
 * 更新 Token 状态
 */
export async function updateTokenStatus(
  id: string,
  status: TokenStatus
): Promise<TokenInfo> {
  const token = await prisma.token.update({
    where: { id },
    data: { status, updatedAt: new Date() },
  });
  return prismaTokenToInfo(token);
}

/**
 * 更新 Token 的 Φ 值
 */
export async function updateTokenPhi(
  id: string,
  phiMagnitude: number,
  phiPhase: number
): Promise<TokenInfo> {
  const token = await prisma.token.update({
    where: { id },
    data: { phiMagnitude, phiPhase, updatedAt: new Date() },
  });
  return prismaTokenToInfo(token);
}

/**
 * 删除 Token (物理删除，仅在测试/清理时使用)
 */
export async function deleteToken(id: string): Promise<void> {
  await prisma.token.delete({ where: { id } });
}

/**
 * 查询关联 Offer 的临时 Token
 */
export async function getTempTokensByOfferId(offerId: string): Promise<TokenInfo[]> {
  const tokens = await prisma.token.findMany({
    where: { offerId, status: TokenStatus.ISSUED },
  });
  return tokens.map(prismaTokenToInfo);
}

/**
 * 查询被锁定的 Token (指定 Offer 关联)
 */
export async function getLockedTokensByOwner(ownerDid: string): Promise<TokenInfo[]> {
  const tokens = await prisma.token.findMany({
    where: { ownerDid, status: TokenStatus.LOCKED },
  });
  return tokens.map(prismaTokenToInfo);
}

/**
 * 计算 Agent 指定类型的可用余额
 */
export async function getAvailableBalance(
  ownerDid: string,
  type: TokenType
): Promise<number> {
  const result = await prisma.token.aggregate({
    _sum: { amount: true },
    where: { ownerDid, type, status: TokenStatus.ACTIVE },
  });
  return result._sum.amount || 0;
}

/**
 * 批量更新 Token 状态
 */
export async function batchUpdateTokenStatus(
  ids: string[],
  status: TokenStatus
): Promise<number> {
  const result = await prisma.token.updateMany({
    where: { id: { in: ids } },
    data: { status, updatedAt: new Date() },
  });
  return result.count;
}

/**
 * 批量删除 Token
 */
export async function batchDeleteTokens(ids: string[]): Promise<number> {
  const result = await prisma.token.deleteMany({
    where: { id: { in: ids } },
  });
  return result.count;
}

/**
 * 计算指定类型的总供应量
 */
export async function getTotalSupply(type?: TokenType): Promise<number> {
  const where: Record<string, unknown> = {
    status: { notIn: [TokenStatus.RECYCLED, TokenStatus.CONSUMED] },
  };
  if (type) where.type = type;

  const result = await prisma.token.aggregate({
    _sum: { amount: true },
    where,
  });
  return result._sum.amount || 0;
}

/** Prisma Token 对象转 TokenInfo (Prisma String 字段 → 应用层枚举) */
function prismaTokenToInfo(token: {
  id: string;
  type: string;
  status: string;
  amount: number;
  phiMagnitude: number;
  phiPhase: number;
  ownerDid: string;
  offerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TokenInfo {
  return {
    id: token.id,
    type: token.type as TokenType,
    status: token.status as TokenStatus,
    amount: token.amount,
    phi: {
      magnitude: token.phiMagnitude,
      phase: token.phiPhase,
    },
    ownerDid: token.ownerDid,
    offerId: token.offerId,
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
  };
}

export { prisma };

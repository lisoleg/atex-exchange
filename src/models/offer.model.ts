/**
 * Offer 数据模型
 * 封装 Prisma Client 的 Offer 相关数据库操作
 */

import { PrismaClient } from '@prisma/client';
import { OfferStatus, PhiGatewayLevel, TokenType } from '../types/atex.types';
import type { OfferInfo } from '../types/atex.types';
import { OFFER_TTL } from '../config/atex.config';

const prisma = new PrismaClient();

/**
 * 创建 Offer
 */
export async function createOffer(data: {
  offererDid: string;
  receiverDid?: string;
  offerTokenType: TokenType;
  offerAmount: number;
  reqTokenType: TokenType;
  reqAmount: number;
  phiDiff?: number;
  jitterImpact?: number;
  gatewayLevel?: PhiGatewayLevel;
  activityId?: string;
  ttlSeconds?: number;
}): Promise<OfferInfo> {
  const ttl = data.ttlSeconds || OFFER_TTL;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const offer = await prisma.offer.create({
    data: {
      offererDid: data.offererDid,
      receiverDid: data.receiverDid,
      offerTokenType: data.offerTokenType,
      offerAmount: data.offerAmount,
      reqTokenType: data.reqTokenType,
      reqAmount: data.reqAmount,
      phiDiff: data.phiDiff,
      jitterImpact: data.jitterImpact,
      gatewayLevel: data.gatewayLevel || PhiGatewayLevel.NORMAL,
      status: OfferStatus.OPEN,
      expiresAt,
      activityId: data.activityId,
    },
  });

  return prismaOfferToInfo(offer);
}

/**
 * 根据 ID 查询 Offer
 */
export async function getOfferById(id: string): Promise<OfferInfo | null> {
  const offer = await prisma.offer.findUnique({ where: { id } });
  return offer ? prismaOfferToInfo(offer) : null;
}

/**
 * 查询开放的 Offer 列表 (订单簿)
 */
export async function getOpenOffers(filters?: {
  offerTokenType?: TokenType;
  reqTokenType?: TokenType;
  limit?: number;
  offset?: number;
}): Promise<{ entries: OfferInfo[]; total: number }> {
  const where: Record<string, unknown> = {
    status: OfferStatus.OPEN,
    expiresAt: { gt: new Date() },
  };
  if (filters?.offerTokenType) where.offerTokenType = filters.offerTokenType;
  if (filters?.reqTokenType) where.reqTokenType = filters.reqTokenType;

  const [entries, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.offer.count({ where }),
  ]);

  return {
    entries: entries.map(prismaOfferToInfo),
    total,
  };
}

/**
 * 查询 Agent 发起的 Offer
 */
export async function getOffersByOfferer(
  offererDid: string,
  status?: OfferStatus
): Promise<OfferInfo[]> {
  const where: Record<string, unknown> = { offererDid };
  if (status) where.status = status;

  const offers = await prisma.offer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return offers.map(prismaOfferToInfo);
}

/**
 * 更新 Offer 状态
 */
export async function updateOfferStatus(
  id: string,
  status: OfferStatus
): Promise<OfferInfo> {
  const offer = await prisma.offer.update({
    where: { id },
    data: { status, updatedAt: new Date() },
  });
  return prismaOfferToInfo(offer);
}

/**
 * 接受 Offer (设置 receiverDid 和状态)
 */
export async function acceptOffer(
  id: string,
  receiverDid: string
): Promise<OfferInfo> {
  const offer = await prisma.offer.update({
    where: { id },
    data: {
      receiverDid,
      status: OfferStatus.ACCEPTED,
      updatedAt: new Date(),
    },
  });
  return prismaOfferToInfo(offer);
}

/**
 * 取消 Offer
 */
export async function cancelOffer(id: string): Promise<OfferInfo> {
  const offer = await prisma.offer.update({
    where: { id },
    data: {
      status: OfferStatus.CANCELLED,
      updatedAt: new Date(),
    },
  });
  return prismaOfferToInfo(offer);
}

/**
 * 清理过期 Offer
 */
export async function cleanupExpiredOffers(): Promise<number> {
  const result = await prisma.offer.updateMany({
    where: {
      status: OfferStatus.OPEN,
      expiresAt: { lt: new Date() },
    },
    data: { status: OfferStatus.EXPIRED, updatedAt: new Date() },
  });
  return result.count;
}

/** Prisma Offer 对象转 OfferInfo (Prisma String 字段 → 应用层枚举) */
function prismaOfferToInfo(offer: {
  id: string;
  offererDid: string;
  receiverDid: string | null;
  offerTokenType: string;
  offerAmount: number;
  reqTokenType: string;
  reqAmount: number;
  phiDiff: number | null;
  jitterImpact: number | null;
  gatewayLevel: string;
  status: string;
  expiresAt: Date;
  activityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): OfferInfo {
  return {
    id: offer.id,
    offererDid: offer.offererDid,
    receiverDid: offer.receiverDid,
    offerTokenType: offer.offerTokenType as TokenType,
    offerAmount: offer.offerAmount,
    reqTokenType: offer.reqTokenType as TokenType,
    reqAmount: offer.reqAmount,
    phiDiff: offer.phiDiff,
    jitterImpact: offer.jitterImpact,
    gatewayLevel: offer.gatewayLevel as PhiGatewayLevel,
    status: offer.status as OfferStatus,
    expiresAt: offer.expiresAt,
    activityId: offer.activityId,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

export { prisma };

/**
 * Transaction 数据模型
 * 封装 Prisma Client 的 Transaction 相关数据库操作
 */

import { PrismaClient } from '@prisma/client';
import type { TransactionInfo, TransactionType, HistoryQueryParams } from '../types/atex.types';
import { TokenType, OfferStatus } from '../types/atex.types';

const prisma = new PrismaClient();

/**
 * 创建交易记录
 */
export async function createTransaction(data: {
  offerId: string;
  type: TransactionType;
  fromDid: string;
  toDid: string;
  tokenType: TokenType;
  amount: number;
  phiBefore?: number;
  phiAfter?: number;
  zkProofHash?: string;
}): Promise<TransactionInfo> {
  const tx = await prisma.transaction.create({
    data: {
      offerId: data.offerId,
      type: data.type,
      fromDid: data.fromDid,
      toDid: data.toDid,
      tokenType: data.tokenType,
      amount: data.amount,
      phiBefore: data.phiBefore,
      phiAfter: data.phiAfter,
      zkProofHash: data.zkProofHash,
    },
  });

  return prismaTxToInfo(tx);
}

/**
 * 根据 ID 查询交易
 */
export async function getTransactionById(id: string): Promise<TransactionInfo | null> {
  const tx = await prisma.transaction.findUnique({ where: { id } });
  return tx ? prismaTxToInfo(tx) : null;
}

/**
 * 查询 Offer 关联的所有交易
 */
export async function getTransactionsByOfferId(offerId: string): Promise<TransactionInfo[]> {
  const txs = await prisma.transaction.findMany({
    where: { offerId },
    orderBy: { createdAt: 'desc' },
  });
  return txs.map(prismaTxToInfo);
}

/**
 * 分页查询交易历史
 */
export async function getTransactionHistory(
  params: HistoryQueryParams
): Promise<{ transactions: TransactionInfo[]; total: number }> {
  const { tokenType, fromDid, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (tokenType) where.tokenType = tokenType;
  if (fromDid) where.fromDid = fromDid;

  const [txs, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions: txs.map(prismaTxToInfo),
    total,
  };
}

/**
 * 查询最近 N 条交易
 */
export async function getRecentTransactions(limit: number = 10): Promise<TransactionInfo[]> {
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return txs.map(prismaTxToInfo);
}

/** Prisma Transaction 对象转 TransactionInfo (Prisma String 字段 → 应用层枚举) */
function prismaTxToInfo(tx: {
  id: string;
  offerId: string;
  type: string;
  fromDid: string;
  toDid: string;
  tokenType: string;
  amount: number;
  phiBefore: number | null;
  phiAfter: number | null;
  zkProofHash: string | null;
  createdAt: Date;
}): TransactionInfo {
  return {
    id: tx.id,
    offerId: tx.offerId,
    type: tx.type as TransactionType,
    fromDid: tx.fromDid,
    toDid: tx.toDid,
    tokenType: tx.tokenType as TokenType,
    amount: tx.amount,
    phiBefore: tx.phiBefore,
    phiAfter: tx.phiAfter,
    zkProofHash: tx.zkProofHash,
    createdAt: tx.createdAt,
  };
}

export { prisma };

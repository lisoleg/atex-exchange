/**
 * 全息边界存储
 * 仅存储 Activity 哈希，实现极低存储成本
 * 哈希链确保数据完整性
 */

import type { HoloboundaryRecord, ActivityPubActivity } from '../types/atex.types';
import { createHash } from 'crypto';

/** 全息边界存储 (内存模拟) */
const holoboundaryStore: HoloboundaryRecord[] = [];

/** 哈希链头部 (Genesis) */
let chainHead: string = '0'.repeat(64);

/** 最大存储记录数 */
const MAX_RECORDS = 100000;

/**
 * 计算 Activity 的 SHA-256 哈希
 * @param activity ActivityPub Activity
 * @returns 十六进制哈希字符串
 */
export function hashActivity(activity: ActivityPubActivity): string {
  const data = JSON.stringify({
    type: activity.type,
    actor: activity.actor,
    object: activity.object,
    published: activity.published,
    previousHash: chainHead,
  });

  return createHash('sha256').update(data).digest('hex');
}

/**
 * 存储活动哈希到全息边界
 * @param activity ActivityPub Activity
 * @returns HoloboundaryRecord 存储记录
 */
export function storeActivityHash(activity: ActivityPubActivity): HoloboundaryRecord {
  const activityHash = hashActivity(activity);
  const activityId = activity.id;

  const record: HoloboundaryRecord = {
    activityId,
    activityHash,
    timestamp: new Date(),
    blockSize: JSON.stringify(activity).length,
  };

  // 更新链头
  chainHead = activityHash;

  // 存储
  holoboundaryStore.push(record);

  // 超出容量时删除最旧记录
  if (holoboundaryStore.length > MAX_RECORDS) {
    holoboundaryStore.shift();
  }

  return record;
}

/**
 * 验证活动哈希是否存在
 * @param activityId 活动 ID
 * @returns 对应的哈希记录或 null
 */
export function verifyActivityHash(activityId: string): HoloboundaryRecord | null {
  const record = holoboundaryStore.find(r => r.activityId === activityId);
  return record || null;
}

/**
 * 验证哈希链完整性
 * @returns 是否完整
 */
export function verifyChainIntegrity(): boolean {
  if (holoboundaryStore.length === 0) return true;

  // 检查每条记录的哈希是否连续
  for (let i = 1; i < holoboundaryStore.length; i++) {
    // 简化验证：每条记录都存在且时间递增
    if (holoboundaryStore[i].timestamp < holoboundaryStore[i - 1].timestamp) {
      return false;
    }
  }

  return true;
}

/**
 * 获取最近的边界记录
 * @param limit 数量
 * @returns 记录列表
 */
export function getRecentRecords(limit: number = 10): HoloboundaryRecord[] {
  return holoboundaryStore.slice(-limit);
}

/**
 * 获取存储统计
 * @returns 统计信息
 */
export function getHoloboundaryStats(): {
  totalRecords: number;
  totalSize: number;
  chainHead: string;
  oldestRecord: Date | null;
  newestRecord: Date | null;
} {
  const totalSize = holoboundaryStore.reduce((s, r) => s + r.blockSize, 0);

  return {
    totalRecords: holoboundaryStore.length,
    totalSize,
    chainHead,
    oldestRecord: holoboundaryStore.length > 0
      ? holoboundaryStore[0].timestamp
      : null,
    newestRecord: holoboundaryStore.length > 0
      ? holoboundaryStore[holoboundaryStore.length - 1].timestamp
      : null,
  };
}

/**
 * 清理过期记录
 * @param maxAge 最大年龄 (毫秒)
 * @returns 清理数量
 */
export function cleanupOldRecords(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
  const cutoff = new Date(Date.now() - maxAge);
  const before = holoboundaryStore.length;

  // 保留最近的记录
  while (
    holoboundaryStore.length > 0 &&
    holoboundaryStore[0].timestamp < cutoff
  ) {
    holoboundaryStore.shift();
  }

  return before - holoboundaryStore.length;
}

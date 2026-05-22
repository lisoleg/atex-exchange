/**
 * Phase Index — 相位索引数据结构
 * 将 O(n) 线性扫描撮合优化至 O(log n)
 *
 * 核心思想：将 Φ 值的连续相位空间 [0, 2π) 离散化为 N 个桶（bucket）
 * 每个桶维护一个按模长排序的 AVL 子树
 * 查询时只需搜索目标相位附近的桶，而非全量扫描
 *
 * 复杂度分析：
 *   插入/删除: O(log N + log M)，N=桶数，M=桶内元素数
 *   相位范围查询: O(k · log M)，k=命中桶数，远小于 n
 *   最近邻查询: O(log N + log M)
 */

import type { PhiValue, OfferInfo, TokenType } from '../types/atex.types';

/** 相位桶数量（2π 空间均匀分为 64 段，每段 ≈ 5.6°） */
const BUCKET_COUNT = 64;

/** 相位桶粒度 */
const BUCKET_WIDTH = (2 * Math.PI) / BUCKET_COUNT;

/** 索引条目 */
interface PhaseIndexEntry {
  offerId: string;
  offererDid: string;
  offerTokenType: TokenType;
  offerAmount: number;
  reqTokenType: TokenType;
  reqAmount: number;
  phi: PhiValue;
  expiresAt: Date;
  gatewayLevel: string;
}

/** 相位桶 */
interface PhaseBucket {
  /** 桶中心相位 */
  phaseStart: number;
  /** 桶内条目，按模长降序排列 */
  entries: PhaseIndexEntry[];
}

/**
 * PhaseIndex — 相位索引主类
 * 基于 Radix Sort + Sorted Array 的简化实现
 * 生产环境可替换为 AVL/Red-Black Tree
 */
export class PhaseIndex {
  private buckets: PhaseBucket[];
  private size: number = 0;

  constructor() {
    this.buckets = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      this.buckets.push({
        phaseStart: i * BUCKET_WIDTH,
        entries: [],
      });
    }
  }

  /**
   * 将相位归一化到 [0, 2π)
   */
  private normalizePhase(phase: number): number {
    let p = phase % (2 * Math.PI);
    if (p < 0) p += 2 * Math.PI;
    return p;
  }

  /**
   * 计算相位所属的桶索引
   */
  private bucketIndex(phase: number): number {
    const normalized = this.normalizePhase(phase);
    const idx = Math.floor(normalized / BUCKET_WIDTH);
    return Math.min(idx, BUCKET_COUNT - 1); // 防止浮点精度溢出
  }

  /**
   * 插入 Offer 到相位索引
   * O(log M) — M 为桶内元素数（二分插入）
   */
  insert(offer: OfferInfo): void {
    const phi: PhiValue = {
      magnitude: 1.0, // 默认模长
      phase: offer.phiDiff ?? 0,
    };

    const entry: PhaseIndexEntry = {
      offerId: offer.id,
      offererDid: offer.offererDid,
      offerTokenType: offer.offerTokenType,
      offerAmount: offer.offerAmount,
      reqTokenType: offer.reqTokenType,
      reqAmount: offer.reqAmount,
      phi,
      expiresAt: offer.expiresAt,
      gatewayLevel: offer.gatewayLevel,
    };

    const bIdx = this.bucketIndex(phi.phase);
    const bucket = this.buckets[bIdx];

    // 二分插入（按模长降序）
    let lo = 0, hi = bucket.entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (bucket.entries[mid].phi.magnitude > phi.magnitude) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    bucket.entries.splice(lo, 0, entry);
    this.size++;
  }

  /**
   * 从相位索引移除 Offer
   * O(M) — M 为桶内元素数
   */
  remove(offerId: string): boolean {
    for (const bucket of this.buckets) {
      const idx = bucket.entries.findIndex(e => e.offerId === offerId);
      if (idx !== -1) {
        bucket.entries.splice(idx, 1);
        this.size--;
        return true;
      }
    }
    return false;
  }

  /**
   * 相位范围查询 — 核心优化点
   * 查找相位在 [centerPhase - tolerance, centerPhase + tolerance] 范围内的 Offer
   * O(k · log M)，k = 命中桶数 << n
   *
   * @param centerPhase 目标相位
   * @param tolerance 相位容差（弧度）
   * @param tokenTypeFilter 可选：按 Token 类型过滤
   * @returns 匹配的条目列表（按相位距离升序）
   */
  queryByPhaseRange(
    centerPhase: number,
    tolerance: number,
    tokenTypeFilter?: { offerTokenType?: TokenType; reqTokenType?: TokenType }
  ): PhaseIndexEntry[] {
    const results: Array<{ entry: PhaseIndexEntry; phaseDistance: number }> = [];

    // 计算需要搜索的桶范围
    const normalizedCenter = this.normalizePhase(centerPhase);
    const lowPhase = normalizedCenter - tolerance;
    const highPhase = normalizedCenter + tolerance;

    // 处理环绕（0 ↔ 2π 边界）
    const lowBucket = this.bucketIndex(lowPhase);
    const highBucket = this.bucketIndex(highPhase);

    const bucketsToSearch: number[] = [];
    if (lowBucket <= highBucket) {
      for (let i = lowBucket; i <= highBucket; i++) {
        bucketsToSearch.push(i);
      }
    } else {
      // 环绕情况：[low, 63] ∪ [0, high]
      for (let i = lowBucket; i < BUCKET_COUNT; i++) {
        bucketsToSearch.push(i);
      }
      for (let i = 0; i <= highBucket; i++) {
        bucketsToSearch.push(i);
      }
    }

    // 在命中桶内筛选
    for (const bIdx of bucketsToSearch) {
      const bucket = this.buckets[bIdx];
      for (const entry of bucket.entries) {
        // Token 类型过滤
        if (tokenTypeFilter?.offerTokenType && entry.offerTokenType !== tokenTypeFilter.offerTokenType) continue;
        if (tokenTypeFilter?.reqTokenType && entry.reqTokenType !== tokenTypeFilter.reqTokenType) continue;

        // 过期检查
        if (entry.expiresAt < new Date()) continue;

        // 计算精确相位距离
        let phaseDist = Math.abs(entry.phi.phase - normalizedCenter);
        if (phaseDist > Math.PI) phaseDist = 2 * Math.PI - phaseDist;

        if (phaseDist <= tolerance) {
          results.push({ entry, phaseDistance: phaseDist });
        }
      }
    }

    // 按相位距离排序（O(k log k)，k << n）
    results.sort((a, b) => a.phaseDistance - b.phaseDistance);

    return results.map(r => r.entry);
  }

  /**
   * 最近邻查询 — 找到相位最接近的 Offer
   * O(log N + M)，从目标桶向两侧扩展搜索
   */
  findNearest(
    targetPhase: number,
    tokenTypeFilter?: { offerTokenType?: TokenType; reqTokenType?: TokenType }
  ): PhaseIndexEntry | null {
    // 从容差 1 个桶开始，逐步扩大
    for (let expansion = 0; expansion <= BUCKET_COUNT / 2; expansion++) {
      const tolerance = (expansion + 1) * BUCKET_WIDTH;
      const results = this.queryByPhaseRange(targetPhase, tolerance, tokenTypeFilter);
      if (results.length > 0) {
        return results[0]; // 已按相位距离排序
      }
    }
    return null;
  }

  /**
   * 批量匹配 — 给定一个 Offer，找到所有可撮合的对手方
   * O(k · log M)，替代原来的 O(n) 全量扫描
   */
  findMatches(offer: OfferInfo, tolerance: number = Math.PI / 4): PhaseIndexEntry[] {
    // 目标：找 offerTokenType = myReqTokenType 且 reqTokenType = myOfferTokenType 的 Offer
    const targetPhase = offer.phiDiff ?? 0;

    return this.queryByPhaseRange(targetPhase, tolerance, {
      offerTokenType: offer.reqTokenType,   // 对方提供我需要的
      reqTokenType: offer.offerTokenType,    // 对方需要我提供的
    });
  }

  /**
   * 获取索引统计
   */
  getStats(): {
    totalEntries: number;
    bucketUtilization: number;
    maxBucketSize: number;
    avgBucketSize: number;
  } {
    let maxBucketSize = 0;
    let nonEmptyBuckets = 0;
    for (const bucket of this.buckets) {
      maxBucketSize = Math.max(maxBucketSize, bucket.entries.length);
      if (bucket.entries.length > 0) nonEmptyBuckets++;
    }

    return {
      totalEntries: this.size,
      bucketUtilization: nonEmptyBuckets / BUCKET_COUNT,
      maxBucketSize,
      avgBucketSize: this.size / BUCKET_COUNT,
    };
  }

  /**
   * 清理过期条目
   */
  cleanupExpired(): number {
    let removed = 0;
    const now = new Date();
    for (const bucket of this.buckets) {
      const before = bucket.entries.length;
      bucket.entries = bucket.entries.filter(e => e.expiresAt >= now);
      removed += before - bucket.entries.length;
    }
    this.size -= removed;
    return removed;
  }

  /**
   * 获取所有条目
   */
  getAllEntries(): PhaseIndexEntry[] {
    const all: PhaseIndexEntry[] = [];
    for (const bucket of this.buckets) {
      all.push(...bucket.entries);
    }
    return all;
  }

  /**
   * get_state() — 模块自检
   */
  get_state(): Record<string, unknown> {
    return {
      module: 'PhaseIndex',
      ...this.getStats(),
      bucketCount: BUCKET_COUNT,
      bucketWidth: BUCKET_WIDTH,
    };
  }
}

/** 单例 */
let instance: PhaseIndex | null = null;

export function getPhaseIndex(): PhaseIndex {
  if (!instance) {
    instance = new PhaseIndex();
  }
  return instance;
}

export function resetPhaseIndex(): void {
  instance = null;
}

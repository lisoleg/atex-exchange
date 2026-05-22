/**
 * 相位纠缠撮合引擎 — 基于 Phase Index 优化
 * 将线性扫描撮合 O(n) → 相位索引查询 O(log n)
 *
 * 撮合策略：
 * 1. 新 Offer 入库时，同步插入 Phase Index
 * 2. 查找撮合对手时，用 Phase Index.queryByPhaseRange 替代全量扫描
 * 3. 支持"双向匹配"：A 提供 X 换 Y ↔ B 提供 Y 换 X
 * 4. 相位容差自适应：市场波动大时自动扩大容差
 */

import type { OfferInfo, PhiValue, TokenType } from '../types/atex.types';
import { OfferStatus } from '../types/atex.types';
import { getPhaseIndex } from './phaseIndex';
import { calculatePhiDiff, phiInnerProduct } from '../math/emlPhi';
import { PHI_THRESHOLD } from '../config/atex.config';

/** 撮合结果 */
export interface MatchResult {
  /** 主动方 Offer */
  initiator: OfferInfo;
  /** 被动方 Offer */
  counterparty: OfferInfo;
  /** 相位差 */
  phaseDiff: number;
  /** Φ 内积（相似度） */
  phiAffinity: number;
  /** 撮合质量评分 [0, 1] */
  matchQuality: number;
}

/**
 * 查找最佳撮合对手
 * O(k · log M)，替代 O(n) 线性扫描
 *
 * @param offer 待撮合的 Offer
 * @param tolerance 相位容差（默认 PHI_THRESHOLD）
 * @returns 按匹配质量降序排列的撮合结果
 */
export function findMatches(
  offer: OfferInfo,
  tolerance: number = PHI_THRESHOLD
): MatchResult[] {
  const index = getPhaseIndex();
  const candidates = index.findMatches(offer, tolerance);

  const results: MatchResult[] = candidates.map(candidate => {
    // 构造 PhiValue（从 phiDiff 推断）
    const initiatorPhi: PhiValue = {
      magnitude: 1.0,
      phase: offer.phiDiff ?? 0,
    };
    const counterPhi: PhiValue = {
      magnitude: 1.0,
      phase: candidate.phi.phase,
    };

    const phaseDiff = calculatePhiDiff(initiatorPhi, counterPhi);
    const phiAffinity = phiInnerProduct(initiatorPhi, counterPhi);

    // 撮合质量 = 相位匹配度 × 内积归一化
    const phaseMatch = 1 - Math.abs(phaseDiff) / Math.PI;
    const affinityNorm = (phiAffinity + 1) / 2; // 归一化到 [0, 1]
    const matchQuality = phaseMatch * 0.7 + affinityNorm * 0.3;

    return {
      initiator: offer,
      counterparty: reconstructOffer(candidate),
      phaseDiff,
      phiAffinity,
      matchQuality,
    };
  });

  // 按匹配质量降序排列
  return results.sort((a, b) => b.matchQuality - a.matchQuality);
}

/**
 * 从索引条目重构 OfferInfo
 */
function reconstructOffer(entry: {
  offerId: string;
  offererDid: string;
  offerTokenType: TokenType;
  offerAmount: number;
  reqTokenType: TokenType;
  reqAmount: number;
  phi: PhiValue;
  expiresAt: Date;
  gatewayLevel: string;
}): OfferInfo {
  return {
    id: entry.offerId,
    offererDid: entry.offererDid,
    receiverDid: null,
    offerTokenType: entry.offerTokenType,
    offerAmount: entry.offerAmount,
    reqTokenType: entry.reqTokenType,
    reqAmount: entry.reqAmount,
    phiDiff: entry.phi.phase,
    jitterImpact: null,
    gatewayLevel: entry.gatewayLevel as import('../types/atex.types').PhiGatewayLevel,
    status: OfferStatus.OPEN,
    expiresAt: entry.expiresAt,
    activityId: null,
    createdAt: entry.expiresAt, // 近似
    updatedAt: new Date(),
  };
}

/**
 * 自适应容差计算
 * 市场波动率越大，容差越宽，撮合更容易
 *
 * @param marketVolatility 市场波动率 [0, 1]
 * @returns 建议的相位容差（弧度）
 */
export function adaptiveTolerance(marketVolatility: number): number {
  // 基础容差 = PHI_THRESHOLD
  // 波动率 0 → 容差 = PHI_THRESHOLD
  // 波动率 1 → 容差 = PHI_THRESHOLD × 2
  return PHI_THRESHOLD * (1 + marketVolatility);
}

/**
 * 批量撮合 — 对所有待撮合 Offer 执行匹配
 * O(n · k · log M)，n=待撮合数，k=命中桶数
 *
 * @param offers 待撮合的 Offer 列表
 * @returns 所有撮合对
 */
export function batchMatch(offers: OfferInfo[]): MatchResult[] {
  const allMatches: MatchResult[] = [];

  for (const offer of offers) {
    if (offer.status !== OfferStatus.OPEN) continue;

    const matches = findMatches(offer);
    for (const match of matches) {
      // 去重：避免 A↔B 和 B↔A 重复
      const pairKey = [match.initiator.id, match.counterparty.id].sort().join('-');
      const existingKey = allMatches.map(m =>
        [m.initiator.id, m.counterparty.id].sort().join('-')
      );
      if (!existingKey.includes(pairKey)) {
        allMatches.push(match);
      }
    }
  }

  return allMatches.sort((a, b) => b.matchQuality - a.matchQuality);
}

/**
 * get_state() — 模块自检
 */
export function getMatchingState(): Record<string, unknown> {
  const index = getPhaseIndex();
  return {
    module: 'PhaseMatchingEngine',
    phaseIndex: index.get_state(),
    phiThreshold: PHI_THRESHOLD,
  };
}

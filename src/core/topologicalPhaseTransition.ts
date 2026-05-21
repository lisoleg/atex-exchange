/**
 * 拓扑相变算法
 * Accept 时的核心算法：
 * 1. 验证双方 Φ 值匹配
 * 2. 若匹配：创造新 Active Token 给双方，销毁临时 Token
 * 3. 若不匹配：相位松弛，销毁临时 Token，解锁原始 Token
 */

import type {
  PhiValue,
  OfferInfo,
  TokenInfo,
  AcceptOfferResponse,
} from '../types/atex.types';
import {
  TokenStatus,
  TokenType,
  OfferStatus,
  TransactionType,
} from '../types/atex.types';
import { PHI_THRESHOLD, ERROR_CODES } from '../config/atex.config';
import { calculatePhiDiff, calculateDynamicPrice } from '../math/emlPhi';
import { evaluateOUMeanReversion, constrainedIssuance } from '../math/ouMeanReversion';
import { createTokenInitData } from './tokenLifecycle';

/** 拓扑相变结果 */
export interface TopologicalTransitionResult {
  /** 是否匹配成功 */
  matched: boolean;
  /** 交易类型 */
  transactionType: TransactionType;
  /** Alice (请求方) 获得的新 Token 数据 */
  aliceTokenData: ReturnType<typeof createTokenInitData> | null;
  /** Bob (提供方) 获得的新 Token 数据 */
  bobTokenData: ReturnType<typeof createTokenInitData> | null;
  /** 需要销毁的临时 Token IDs */
  tempTokenIds: string[];
  /** 需要回收的原始 Token IDs */
  recycleTokenIds: string[];
  /** 需要解锁的原始 Token IDs */
  unlockTokenIds: string[];
  /** Φ 匹配详情 */
  phiMatchDetail: {
    phaseDiff: number;
    threshold: number;
    withinThreshold: boolean;
  };
  /** O-U 评估结果 */
  ouResult: ReturnType<typeof evaluateOUMeanReversion> | null;
}

/**
 * 执行拓扑相变算法
 * @param offer 当前 Offer 信息
 * @param offererPhi 提供方 (Bob) Φ 值
 * @param receiverPhi 接收方 (Alice) Φ 值
 * @param tempTokens 临时 Token 列表
 * @param lockedTokens 被锁定的原始 Token 列表
 * @param currentSupply 当前 Token 总供应量
 * @returns TopologicalTransitionResult 相变结果
 */
export function topologicalPhaseTransition(
  offer: OfferInfo,
  offererPhi: PhiValue,
  receiverPhi: PhiValue,
  tempTokens: TokenInfo[],
  lockedTokens: TokenInfo[],
  currentSupply: number
): TopologicalTransitionResult {
  // 1. 验证双方 Φ 值匹配
  const phaseDiff = calculatePhiDiff(offererPhi, receiverPhi);
  const withinThreshold = Math.abs(phaseDiff) < PHI_THRESHOLD;

  const phiMatchDetail = {
    phaseDiff,
    threshold: PHI_THRESHOLD,
    withinThreshold,
  };

  // 临时 Token ID 列表
  const tempTokenIds = tempTokens.map(t => t.id);

  // 被锁定的 Token ID 列表
  const lockedTokenIds = lockedTokens.map(t => t.id);

  // 2. Φ 匹配：执行拓扑相变
  if (withinThreshold) {
    return executePhaseTransition(
      offer,
      offererPhi,
      receiverPhi,
      tempTokenIds,
      lockedTokenIds,
      currentSupply,
      phiMatchDetail
    );
  }

  // 3. Φ 不匹配：执行相位松弛
  return executePhaseRelaxation(
    tempTokenIds,
    lockedTokenIds,
    phiMatchDetail
  );
}

/**
 * 执行拓扑相变 (Φ 匹配成功)
 */
function executePhaseTransition(
  offer: OfferInfo,
  offererPhi: PhiValue,
  receiverPhi: PhiValue,
  tempTokenIds: string[],
  lockedTokenIds: string[],
  currentSupply: number,
  phiMatchDetail: TopologicalTransitionResult['phiMatchDetail']
): TopologicalTransitionResult {
  // 计算动态价格
  const dynamicPrice = calculateDynamicPrice(offererPhi, receiverPhi);

  // O-U 均值回归检查
  const ouResult = evaluateOUMeanReversion(currentSupply);

  // 计算受 O-U 约束的发行量
  const aliceIssuance = constrainedIssuance(
    currentSupply,
    offer.reqAmount,
    ouResult.meanLevel,
    ouResult.reversionSpeed
  );

  const bobIssuance = constrainedIssuance(
    currentSupply + aliceIssuance,
    offer.offerAmount * dynamicPrice,
    ouResult.meanLevel,
    ouResult.reversionSpeed
  );

  // Alice 获得请求的 Token
  const aliceTokenData = createTokenInitData(
    offer.reqTokenType,
    aliceIssuance,
    offer.offererDid, // Alice 是 offerer，获得请求的 Token
    receiverPhi.magnitude,
    receiverPhi.phase,
    false
  );

  // Bob 获得提供的 Token 等价物
  const bobTokenData = createTokenInitData(
    offer.offerTokenType,
    bobIssuance,
    offer.receiverDid || '',
    offererPhi.magnitude,
    offererPhi.phase,
    false
  );

  return {
    matched: true,
    transactionType: TransactionType.TOPOLOGICAL_TRANSITION,
    aliceTokenData,
    bobTokenData,
    tempTokenIds,
    recycleTokenIds: lockedTokenIds, // 原始 Token 回收
    unlockTokenIds: [],
    phiMatchDetail,
    ouResult,
  };
}

/**
 * 执行相位松弛 (Φ 不匹配)
 */
function executePhaseRelaxation(
  tempTokenIds: string[],
  lockedTokenIds: string[],
  phiMatchDetail: TopologicalTransitionResult['phiMatchDetail']
): TopologicalTransitionResult {
  return {
    matched: false,
    transactionType: TransactionType.PHASE_RELAXATION,
    aliceTokenData: null,
    bobTokenData: null,
    tempTokenIds,        // 临时 Token 销毁
    recycleTokenIds: [],
    unlockTokenIds: lockedTokenIds, // 原始 Token 解锁
    phiMatchDetail,
    ouResult: null,
  };
}

/**
 * 验证 Offer 是否可被接受
 * @param offer 当前 Offer
 * @returns 验证结果和错误信息
 */
export function validateAcceptOffer(offer: OfferInfo): {
  valid: boolean;
  error?: string;
} {
  // Offer 必须是 OPEN 状态
  if (offer.status !== OfferStatus.OPEN) {
    return {
      valid: false,
      error: `Offer 状态不是 OPEN，当前状态: ${offer.status}`,
    };
  }

  // Offer 不能过期
  if (offer.expiresAt < new Date()) {
    return {
      valid: false,
      error: ERROR_CODES.ATEX_004,
    };
  }

  return { valid: true };
}

/**
 * 相位缠绕算法
 * Offer 创建时的核心算法：
 * 1. 计算 offerer 的 Token Φ 值
 * 2. 计算请求 Token 的 Φ 值
 * 3. 创建临时 Token (状态: Issued)
 * 4. 锁定原始 Token
 */

import type {
  PhiValue,
  CreateOfferRequest,
  TokenInfo,
} from '../types/atex.types';
import { TokenType, TokenStatus } from '../types/atex.types';
import {
  calculatePhiDiff,
  calculateDynamicPrice,
  initializePhiFromDID,
} from '../math/emlPhi';
import { calculateJitterSlippage } from '../math/jitterSlippage';
import { createTokenInitData } from './tokenLifecycle';

/** 相位缠绕结果 */
export interface PhaseEntangleResult {
  /** 临时 Token 数据 (Issued 状态) */
  tempTokenData: ReturnType<typeof createTokenInitData>;
  /** 被锁定的原始 Token 需要更新的状态 */
  lockedStatus: TokenStatus;
  /** Φ 值相位差 */
  phiDiff: number;
  /** 动态价格系数 */
  dynamicPrice: number;
  /** Jitter 滑点结果 */
  jitterResult: {
    jitter: number;
    slippage: number;
    impact: number;
  };
  /** 请求 Token 的预估 Φ 值 */
  requestedPhiEstimate: PhiValue;
}

/**
 * 执行相位缠绕算法
 * @param request 创建 Offer 请求
 * @param offererPhi 提供方 Φ 值
 * @param offererTokens 提供方当前持有的 Token 列表
 * @returns PhaseEntangleResult 缠绕结果
 */
export function phaseEntangle(
  request: CreateOfferRequest,
  offererPhi: PhiValue,
  offererTokens: TokenInfo[]
): PhaseEntangleResult {
  // 1. 估算请求 Token 的 Φ 值
  //    基于请求方 DID 和 Token 类型的确定性估算
  const requestedPhiEstimate = estimateRequestedPhi(
    request.offererDid,
    request.reqTokenType
  );

  // 2. 计算相位差 Δθ
  const phiDiff = calculatePhiDiff(offererPhi, requestedPhiEstimate);

  // 3. 计算动态价格系数
  const dynamicPrice = calculateDynamicPrice(offererPhi, requestedPhiEstimate);

  // 4. 计算 Jitter 滑点
  const jitterResult = calculateJitterSlippage(
    [offererPhi, requestedPhiEstimate],
    request.offerAmount
  );

  // 5. 创建临时 Token (Issued 状态)
  //    临时 Token 的相位 = offerer 相位 + 目标相位偏移
  const tempTokenPhase = offererPhi.phase + phiDiff * 0.5; // 取偏移的一半
  const tempTokenMagnitude = offererPhi.magnitude * dynamicPrice;

  const tempTokenData = createTokenInitData(
    request.offerTokenType,
    request.offerAmount,
    request.offererDid,
    tempTokenMagnitude,
    tempTokenPhase,
    true // 临时 Token
  );

  // 6. 锁定原始 Token
  const lockedStatus = TokenStatus.LOCKED;

  return {
    tempTokenData,
    lockedStatus,
    phiDiff,
    dynamicPrice,
    jitterResult,
    requestedPhiEstimate,
  };
}

/**
 * 估算请求 Token 的 Φ 值
 * 基于 DID 和 Token 类型的确定性估算
 * @param did 请求方 DID
 * @param tokenType 请求的 Token 类型
 * @returns 估算的 Φ 值
 */
function estimateRequestedPhi(did: string, tokenType: TokenType): PhiValue {
  // 基于 DID 生成基础 Φ 值
  const basePhi = initializePhiFromDID(did);

  // 根据 Token 类型调整模长
  const typeMultipliers: Record<TokenType, number> = {
    [TokenType.CALC]: 1.0,   // 算元基准
    [TokenType.WIT]: 1.5,    // 智元较高 (AI推理价值高)
    [TokenType.WORD]: 0.8,   // 词元较低 (语言数据量大)
    [TokenType.PASS]: 2.0,   // 通证最高 (通用价值)
  };

  const multiplier = typeMultipliers[tokenType] || 1.0;

  return {
    magnitude: basePhi.magnitude * multiplier,
    phase: basePhi.phase,
  };
}

/**
 * 计算可锁定 Token 的总额
 * @param tokens Agent 持有的 Token 列表
 * @param tokenType 要锁定的 Token 类型
 * @returns 可用金额
 */
export function calculateAvailableBalance(
  tokens: TokenInfo[],
  tokenType: TokenType
): number {
  return tokens
    .filter(t => t.type === tokenType && t.status === TokenStatus.ACTIVE)
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * 验证 Offer 请求的余额是否充足
 * @param tokens Agent 持有的 Token 列表
 * @param request 创建 Offer 请求
 * @returns 是否充足
 */
export function validateOfferBalance(
  tokens: TokenInfo[],
  request: CreateOfferRequest
): boolean {
  const available = calculateAvailableBalance(tokens, request.offerTokenType);
  return available >= request.offerAmount;
}

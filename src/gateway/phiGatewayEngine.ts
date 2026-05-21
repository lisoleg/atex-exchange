/**
 * Φ-Gateway 决策引擎
 * 四级决策：DID验证 → 共识场梯度 → 意图校验 → 反相位+139预警
 * 输出: PRIORITY / NORMAL / THROTTLE / REJECT
 */

import type { PhiGatewayResult, PhiValue, CreateOfferRequest } from '../types/atex.types';
import { PhiGatewayLevel } from '../types/atex.types';
import {
  GRADIENT_NORMAL,
  GRADIENT_THROTTLE,
  ERROR_CODES,
} from '../config/atex.config';
import { calculateConsensusGradient } from '../math/emlPhi';
import { verifyDID } from './didVerifier';
import { predictIntent } from './intentPredictor';
import { detectAntiPhaseBurst } from './antiPhaseDetector';
import { detectPhaseTransition139 } from '../math/phaseTransition139';
import type { OrderBookEntry } from '../types/atex.types';

/**
 * Φ-Gateway 四级决策引擎
 * 按顺序执行四级检查，任一级别拒绝即终止
 * @param senderDid 发送方 DID
 * @param request 交易请求
 * @param phiValues 参与方的 Φ 值集合
 * @param orderBookEntries 当前订单簿 (用于139检测)
 * @returns PhiGatewayResult 决策结果
 */
export function phiGatewayEngine(
  senderDid: string,
  request: CreateOfferRequest,
  phiValues: PhiValue[],
  orderBookEntries: OrderBookEntry[]
): PhiGatewayResult {
  // ============================================================
  // 第一层: DID 身份验证 (表皮层)
  // ============================================================
  const didVerified = verifyDID(senderDid);
  if (!didVerified) {
    return {
      level: PhiGatewayLevel.REJECT,
      didVerified: false,
      gradientMagnitude: 0,
      intentScore: 0,
      antiPhaseDetected: false,
      singularity139Detected: false,
      reason: `${ERROR_CODES.ATEX_001}: DID 验证失败`,
    };
  }

  // ============================================================
  // 第二层: 共识场梯度 (先天免疫层)
  // ============================================================
  const gradientMagnitude = calculateConsensusGradient(phiValues);

  let level: PhiGatewayLevel;
  if (gradientMagnitude < GRADIENT_NORMAL) {
    level = PhiGatewayLevel.PRIORITY; // 低梯度 = 稳定 = 优先
  } else if (gradientMagnitude < GRADIENT_THROTTLE) {
    level = PhiGatewayLevel.NORMAL;
  } else {
    level = PhiGatewayLevel.THROTTLE;
  }

  // ============================================================
  // 第三层: 数字孪生意图校验 (适应性免疫层)
  // ============================================================
  const intentScore = predictIntent(senderDid, request);
  if (intentScore < 0.3) {
    // 意图评分过低，降级
    level = PhiGatewayLevel.THROTTLE;
  }

  // ============================================================
  // 第四层: 反相位欺诈检测 + 139 相变预警
  // ============================================================
  const antiPhaseDetected = detectAntiPhaseBurst(senderDid);
  if (antiPhaseDetected) {
    return {
      level: PhiGatewayLevel.REJECT,
      didVerified: true,
      gradientMagnitude,
      intentScore,
      antiPhaseDetected: true,
      singularity139Detected: false,
      reason: `${ERROR_CODES.ATEX_006}: 反相位欺诈检测触发`,
    };
  }

  const pt139Result = detectPhaseTransition139(orderBookEntries);
  if (pt139Result.isSingularity) {
    level = PhiGatewayLevel.THROTTLE;
    return {
      level,
      didVerified: true,
      gradientMagnitude,
      intentScore,
      antiPhaseDetected: false,
      singularity139Detected: true,
      reason: `${ERROR_CODES.ATEX_007}: 139 相变预警触发 (熵=${pt139Result.lobDepthEntropy.toFixed(3)})`,
    };
  }

  return {
    level,
    didVerified: true,
    gradientMagnitude,
    intentScore,
    antiPhaseDetected: false,
    singularity139Detected: false,
  };
}

/**
 * 快速决策 (仅前两层，用于高频查询)
 * @param phiValues Φ 值集合
 * @returns 决策级别
 */
export function quickGatewayDecision(phiValues: PhiValue[]): PhiGatewayLevel {
  const gradient = calculateConsensusGradient(phiValues);
  if (gradient < GRADIENT_NORMAL) return PhiGatewayLevel.PRIORITY;
  if (gradient < GRADIENT_THROTTLE) return PhiGatewayLevel.NORMAL;
  return PhiGatewayLevel.THROTTLE;
}

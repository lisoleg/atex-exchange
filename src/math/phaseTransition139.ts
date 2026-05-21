/**
 * 139 相变阈值检测模块
 * LOB (限价订单簿) 深度熵低于阈值时触发拓扑相变预警
 * 熵 H = -Σ p_i × ln(p_i)，当 H < 阈值时市场进入奇异态
 */

import type { PhaseTransition139Result, OrderBookEntry } from '../types/atex.types';
import {
  PHASE_TRANSITION_139,
  LOB_ENTROPY_SAFETY,
  LOB_ENTROPY_WARNING,
} from '../config/atex.config';

/**
 * 计算 LOB 深度分布的概率向量
 * 将订单量归一化为概率分布
 * @param depths 各价位的订单深度数组
 * @returns 概率分布向量
 */
export function calculateDepthProbabilities(depths: number[]): number[] {
  const total = depths.reduce((sum, d) => sum + d, 0);
  if (total === 0) return depths.map(() => 1 / depths.length);
  return depths.map(d => d / total);
}

/**
 * 计算 Shannon 熵
 * H = -Σ p_i × ln(p_i)
 * @param probabilities 概率分布
 * @returns 熵值
 */
export function calculateShannonEntropy(probabilities: number[]): number {
  let entropy = 0;
  for (const p of probabilities) {
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  }
  return entropy;
}

/**
 * 从订单簿条目计算 LOB 深度熵
 * @param entries 订单簿条目
 * @returns 熵值
 */
export function calculateLOBEntropy(entries: OrderBookEntry[]): number {
  if (entries.length === 0) return 0;

  // 按请求 Token 类型分组
  const depthMap = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.offerTokenType}_${entry.reqTokenType}`;
    const current = depthMap.get(key) || 0;
    depthMap.set(key, current + entry.offerAmount);
  }

  // 提取深度值
  const depths = Array.from(depthMap.values());
  const probabilities = calculateDepthProbabilities(depths);
  return calculateShannonEntropy(probabilities);
}

/**
 * 计算 LOB 深度熵的归一化值
 * 最大熵 = ln(N)，其中 N 为价位数
 * @param entries 订单簿条目
 * @returns 归一化熵 [0, 1]
 */
export function calculateNormalizedLOBEntropy(entries: OrderBookEntry[]): number {
  const entropy = calculateLOBEntropy(entries);
  if (entries.length <= 1) return 0;
  const maxEntropy = Math.log(entries.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/**
 * 139 相变阈值检测
 * 当 LOB 深度熵低于阈值时，市场进入拓扑相变奇异态
 * @param entries 当前订单簿条目
 * @param customThreshold 自定义阈值 (可选)
 * @returns PhaseTransition139Result 检测结果
 */
export function detectPhaseTransition139(
  entries: OrderBookEntry[],
  customThreshold?: number
): PhaseTransition139Result {
  // 计算 LOB 深度熵
  const lobDepthEntropy = calculateLOBEntropy(entries);

  // 使用自定义阈值或默认安全阈值
  const threshold = customThreshold ?? LOB_ENTROPY_SAFETY;

  // 计算偏离度
  const deviation = threshold - lobDepthEntropy;

  // 判断是否触发相变预警
  const isSingularity = lobDepthEntropy < threshold;

  // 计算预警级别 [0, 1]
  // 熵越低，预警级别越高
  let alertLevel = 0;
  if (isSingularity) {
    // 偏离越大，预警越高
    alertLevel = Math.min(1, deviation / threshold);
  }

  // 如果熵低于警告阈值，强制高级别
  if (lobDepthEntropy < LOB_ENTROPY_WARNING) {
    alertLevel = Math.max(alertLevel, 0.8);
  }

  return {
    lobDepthEntropy,
    isSingularity,
    alertLevel,
    deviation,
  };
}

/**
 * 计算 139 奇异值
 * 基于订单簿深度和价格分布的奇异点检测
 * 使用 Fisher 信息量作为相变前兆指标
 * @param entries 订单簿条目
 * @returns Fisher 信息量 (越大越接近相变)
 */
export function calculateFisherInformation(entries: OrderBookEntry[]): number {
  if (entries.length < 2) return 0;

  // 按 φ 差值排序
  const sorted = [...entries].sort((a, b) => a.phiDiff - b.phiDiff);

  // 计算概率密度导数的平方积分（Fisher 信息的离散近似）
  let fisherInfo = 0;
  const depths = sorted.map(e => e.offerAmount);
  const total = depths.reduce((s, d) => s + d, 0);

  if (total === 0) return 0;

  for (let i = 1; i < depths.length; i++) {
    const p1 = depths[i - 1] / total;
    const p2 = depths[i] / total;
    const dp = p2 - p1;
    const pAvg = (p1 + p2) / 2;
    if (pAvg > 0) {
      fisherInfo += (dp * dp) / pAvg;
    }
  }

  return fisherInfo;
}

/**
 * 综合相变评估
 * 结合 LOB 熵和 Fisher 信息量
 * @param entries 订单簿条目
 * @returns 综合相变风险评估 [0, 1]
 */
export function comprehensivePhaseRisk(entries: OrderBookEntry[]): number {
  const ptResult = detectPhaseTransition139(entries);
  const fisherInfo = calculateFisherInformation(entries);

  // 归一化 Fisher 信息量
  const normalizedFisher = Math.min(fisherInfo / PHASE_TRANSITION_139, 1);

  // 加权组合
  const risk = 0.6 * ptResult.alertLevel + 0.4 * normalizedFisher;
  return Math.min(risk, 1);
}

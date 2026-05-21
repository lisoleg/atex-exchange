/**
 * Jitter 滑点模型
 * 交易到达时间不确定性导致滑点
 * Jitter = N(μ, σ²)，滑点 = ∇Ψ × Jitter
 */

import type { JitterResult, PhiValue } from '../types/atex.types';
import {
  JITTER_BASELINE,
  JITTER_STDDEV,
  MAX_SLIPPAGE_RATIO,
} from '../config/atex.config';
import { calculateConsensusGradient } from './emlPhi';

/**
 * Box-Muller 变换生成标准正态分布随机数
 * @returns 标准正态随机数 N(0,1)
 */
function boxMullerRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  // 防止 log(0)
  const safeU1 = Math.max(u1, 1e-10);
  return Math.sqrt(-2 * Math.log(safeU1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * 生成正态分布随机数
 * @param mean 均值
 * @param stddev 标准差
 * @returns 正态分布随机数
 */
export function normalRandom(mean: number, stddev: number): number {
  return mean + stddev * boxMullerRandom();
}

/**
 * 计算时间 Jitter 值
 * @param baseJitter 基线 Jitter (ms)，默认使用配置值
 * @param jitterStddev Jitter 标准差 (ms)
 * @returns Jitter 时间值 (ms)
 */
export function calculateJitter(
  baseJitter: number = JITTER_BASELINE,
  jitterStddev: number = JITTER_STDDEV
): number {
  const jitter = normalRandom(baseJitter, jitterStddev);
  // Jitter 不为负
  return Math.max(jitter, 0);
}

/**
 * 计算滑点
 * 滑点 = ∇Ψ × Jitter / 1000 (将ms转为秒作为比例因子)
 * @param consensusGradient 共识场梯度 ∇Ψ
 * @param jitter 时间 Jitter 值 (ms)
 * @returns 滑点比例
 */
export function calculateSlippage(consensusGradient: number, jitter: number): number {
  // 滑点 = 梯度 × 时间抖动 / 归一化因子
  const slippage = consensusGradient * (jitter / 1000);
  // 滑点不超过最大比例
  return Math.min(Math.abs(slippage), MAX_SLIPPAGE_RATIO);
}

/**
 * 完整的 Jitter 滑点计算
 * 包含：Jitter 生成 → 滑点计算 → 影响评估
 * @param phiValues 参与交易的 Φ 值集合
 * @param tradeAmount 交易数量
 * @param baseJitter 基线 Jitter
 * @param jitterStddev Jitter 标准差
 * @returns JitterResult 完整结果
 */
export function calculateJitterSlippage(
  phiValues: PhiValue[],
  tradeAmount: number,
  baseJitter: number = JITTER_BASELINE,
  jitterStddev: number = JITTER_STDDEV
): JitterResult {
  // 1. 计算共识场梯度
  const gradient = calculateConsensusGradient(phiValues);

  // 2. 生成 Jitter
  const jitter = calculateJitter(baseJitter, jitterStddev);

  // 3. 计算滑点
  const slippage = calculateSlippage(gradient, jitter);

  // 4. 计算总影响
  const impact = slippage * tradeAmount;

  return {
    jitter,
    slippage,
    impact,
  };
}

/**
 * 判断滑点是否超限
 * @param result Jitter 计算结果
 * @returns 是否超限
 */
export function isSlippageExceeded(result: JitterResult): boolean {
  return result.slippage > MAX_SLIPPAGE_RATIO;
}

/**
 * 基于历史数据估计 Jitter 分布参数
 * 使用在线算法更新均值和方差
 * @param historicalJitters 历史 Jitter 值数组
 * @returns 估计的 { mean, stddev }
 */
export function estimateJitterParams(historicalJitters: number[]): { mean: number; stddev: number } {
  if (historicalJitters.length === 0) {
    return { mean: JITTER_BASELINE, stddev: JITTER_STDDEV };
  }

  // 在线均值
  let mean = 0;
  let m2 = 0;
  for (let i = 0; i < historicalJitters.length; i++) {
    const delta = historicalJitters[i] - mean;
    mean += delta / (i + 1);
    const delta2 = historicalJitters[i] - mean;
    m2 += delta * delta2;
  }

  const variance = m2 / historicalJitters.length;
  const stddev = Math.sqrt(Math.max(variance, 0));

  return { mean, stddev: Math.max(stddev, 1) };
}

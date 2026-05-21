/**
 * O-U 均值回归 (Ornstein-Uhlenbeck Process) 模块
 * Token 供应量遵循 O-U 过程防通胀
 * dS = θ(μ - S)dt + σdW
 * 其中 S=供应量, θ=回归速度, μ=长期均衡, σ=波动率, W=维纳过程
 */

import type { OUMeanReversionResult } from '../types/atex.types';
import {
  OU_REVERSION_SPEED,
  OU_MEAN_LEVEL,
  OU_VOLATILITY,
  OU_DEVIATION_THRESHOLD,
} from '../config/atex.config';

/**
 * Box-Muller 生成标准正态随机数
 * @returns N(0,1) 随机数
 */
function standardNormal(): number {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * O-U 过程单步演化
 * dS = θ(μ - S)dt + σdW
 * 离散化: S(t+dt) = S(t) + θ(μ - S(t))dt + σ√dt × Z
 * @param currentSupply 当前供应量
 * @param theta 回归速度
 * @param mu 长期均衡值
 * @param sigma 波动率
 * @param dt 时间步长
 * @returns 下一步供应量
 */
export function ouStep(
  currentSupply: number,
  theta: number = OU_REVERSION_SPEED,
  mu: number = OU_MEAN_LEVEL,
  sigma: number = OU_VOLATILITY,
  dt: number = 1
): number {
  // 确定性部分：均值回归
  const deterministic = theta * (mu - currentSupply) * dt;
  // 随机部分：布朗运动增量
  const stochastic = sigma * Math.sqrt(dt) * standardNormal();
  // 更新供应量
  const newSupply = currentSupply + deterministic + stochastic;
  // 供应量不为负
  return Math.max(newSupply, 0);
}

/**
 * 计算 O-U 过程的稳态方差
 * Var(S) = σ² / (2θ)
 * @param theta 回归速度
 * @param sigma 波动率
 * @returns 稳态方差
 */
export function ouStationaryVariance(
  theta: number = OU_REVERSION_SPEED,
  sigma: number = OU_VOLATILITY
): number {
  return (sigma * sigma) / (2 * theta);
}

/**
 * 计算 O-U 过程的稳态标准差
 * @param theta 回归速度
 * @param sigma 波动率
 * @returns 稳态标准差
 */
export function ouStationaryStddev(
  theta: number = OU_REVERSION_SPEED,
  sigma: number = OU_VOLATILITY
): number {
  return Math.sqrt(ouStationaryVariance(theta, sigma));
}

/**
 * O-U 均值回归评估
 * 判断当前供应量是否偏离长期均衡，以及是否需要干预
 * @param currentSupply 当前供应量
 * @param mu 长期均衡值
 * @param theta 回归速度
 * @param sigma 波动率
 * @returns OUMeanReversionResult 评估结果
 */
export function evaluateOUMeanReversion(
  currentSupply: number,
  mu: number = OU_MEAN_LEVEL,
  theta: number = OU_REVERSION_SPEED,
  sigma: number = OU_VOLATILITY
): OUMeanReversionResult {
  // 偏离度
  const deviation = mu > 0 ? (currentSupply - mu) / mu : 0;

  // 是否需要干预
  const needsIntervention = Math.abs(deviation) > OU_DEVIATION_THRESHOLD;

  // 建议调整量 (正=需回收, 负=可增发)
  let suggestedAdjustment = 0;
  if (needsIntervention) {
    // 调整量 = 偏离量 × 回归速度
    suggestedAdjustment = -(currentSupply - mu) * theta;
  }

  return {
    currentSupply,
    meanLevel: mu,
    deviation,
    reversionSpeed: theta,
    needsIntervention,
    suggestedAdjustment,
  };
}

/**
 * 模拟 O-U 过程 N 步
 * @param initialSupply 初始供应量
 * @param steps 步数
 * @param theta 回归速度
 * @param mu 长期均衡
 * @param sigma 波动率
 * @param dt 时间步长
 * @returns 供应量路径数组
 */
export function simulateOUProcess(
  initialSupply: number,
  steps: number,
  theta: number = OU_REVERSION_SPEED,
  mu: number = OU_MEAN_LEVEL,
  sigma: number = OU_VOLATILITY,
  dt: number = 1
): number[] {
  const path: number[] = [initialSupply];
  let current = initialSupply;

  for (let i = 0; i < steps; i++) {
    current = ouStep(current, theta, mu, sigma, dt);
    path.push(current);
  }

  return path;
}

/**
 * 基于 O-U 过程计算 Token 发行量
 * 交易即发行 (TAI) 模式下，新 Token 发行量受 O-U 约束
 * @param currentSupply 当前总供应量
 * @param requestAmount 请求发行量
 * @param mu 长期均衡
 * @param theta 回归速度
 * @returns 实际可发行量
 */
export function constrainedIssuance(
  currentSupply: number,
  requestAmount: number,
  mu: number = OU_MEAN_LEVEL,
  theta: number = OU_REVERSION_SPEED
): number {
  const evaluation = evaluateOUMeanReversion(currentSupply, mu, theta);

  // 如果已经严重超供，限制发行
  if (evaluation.deviation > OU_DEVIATION_THRESHOLD) {
    // 超供时，发行量按比例缩减
    const reductionFactor = 1 - (Math.abs(evaluation.deviation) - OU_DEVIATION_THRESHOLD);
    return requestAmount * Math.max(reductionFactor, 0);
  }

  // 如果供应不足，允许超额发行
  if (evaluation.deviation < -OU_DEVIATION_THRESHOLD) {
    const bonusFactor = 1 + (Math.abs(evaluation.deviation) - OU_DEVIATION_THRESHOLD) * 0.5;
    return requestAmount * Math.min(bonusFactor, 2);
  }

  // 正常范围内，正常发行
  return requestAmount;
}

/**
 * 计算回收量
 * 当供应量超过均衡值时，计算需要回收的 Token 数量
 * @param currentSupply 当前供应量
 * @param mu 长期均衡
 * @param theta 回归速度
 * @returns 回收量
 */
export function calculateRecycleAmount(
  currentSupply: number,
  mu: number = OU_MEAN_LEVEL,
  theta: number = OU_REVERSION_SPEED
): number {
  if (currentSupply <= mu) return 0;

  // 回收量 = 偏离量 × 回归速度
  const excess = currentSupply - mu;
  return excess * theta;
}

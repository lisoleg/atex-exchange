/**
 * 三旋风控模型
 * 面旋(空间分散度) + 体旋(杠杆自适应) + 线旋(递归预测)
 * 三维风险评估：R = w1×面旋 + w2×体旋 + w3×线旋
 */

import type { TriSpinRiskResult, PhiValue } from '../types/atex.types';
import {
  SURFACE_SPIN_THRESHOLD,
  BODY_SPIN_THRESHOLD,
  LINE_SPIN_THRESHOLD,
  COMPOSITE_REJECT_THRESHOLD,
  COMPOSITE_CAUTION_THRESHOLD,
} from '../config/atex.config';

/**
 * 面旋：空间分散度风险评估
 * 基于 Agent 的 Token 持有分布计算空间分散度
 * 分散度越高，风险越低（不把鸡蛋放一个篮子）
 * @param tokenAmounts 各类 Token 的持有量
 * @returns 面旋风险值 [0, 1]
 */
export function calculateSurfaceSpin(tokenAmounts: number[]): number {
  if (tokenAmounts.length === 0) return 1;

  const total = tokenAmounts.reduce((sum, a) => sum + a, 0);
  if (total === 0) return 1;

  // 计算 Herfindahl 指数 (集中度)
  let herfindahl = 0;
  for (const amount of tokenAmounts) {
    const share = amount / total;
    herfindahl += share * share;
  }

  // 完全分散: herfindahl ≈ 1/N (低风险)
  // 完全集中: herfindahl = 1 (高风险)
  // 风险 = herfindahl (集中度越高，风险越高)
  return herfindahl;
}

/**
 * 面旋：基于 Φ 值的相位分散度
 * @param phiValues 多个 Φ 值
 * @returns 相位分散度风险 [0, 1]
 */
export function calculatePhaseDispersion(phiValues: PhiValue[]): number {
  if (phiValues.length < 2) return 1;

  // 计算相位均值
  let sinSum = 0;
  let cosSum = 0;
  for (const phi of phiValues) {
    sinSum += Math.sin(phi.phase);
    cosSum += Math.cos(phi.phase);
  }

  // 合取向量长度 R
  const R = Math.sqrt(sinSum * sinSum + cosSum * cosSum) / phiValues.length;
  // R → 1: 所有相位相同(高风险, 集中)
  // R → 0: 相位均匀分散(低风险)
  return R;
}

/**
 * 体旋：杠杆自适应风险评估
 * 基于 Agent 的交易杠杆率和 Φ 值稳定性
 * @param leverageRatio 当前杠杆率 (债务/资产)
 * @param phiVolatility Φ 值波动率
 * @returns 体旋风险值 [0, 1]
 */
export function calculateBodySpin(leverageRatio: number, phiVolatility: number): number {
  // 杠杆风险：leverage 越高风险越大
  const leverageRisk = Math.min(leverageRatio / 5, 1); // 5x 以上为满风险

  // 波动风险：volatility 越高风险越大
  const volatilityRisk = Math.min(phiVolatility / 0.5, 1); // 50% 波动率为满风险

  // 杠杆 × 波动 = 复合风险 (非线性)
  const compositeRisk = leverageRisk * 0.6 + volatilityRisk * 0.4;
  const amplified = compositeRisk * (1 + leverageRisk * 0.3); // 杠杆放大效应

  return Math.min(amplified, 1);
}

/**
 * 体旋：自适应杠杆调整建议
 * @param currentLeverage 当前杠杆
 * @param bodySpinRisk 体旋风险
 * @returns 建议杠杆
 */
export function suggestAdaptiveLeverage(currentLeverage: number, bodySpinRisk: number): number {
  if (bodySpinRisk > BODY_SPIN_THRESHOLD) {
    // 高风险：降低杠杆
    return currentLeverage * (1 - (bodySpinRisk - BODY_SPIN_THRESHOLD));
  }
  // 低风险：可适当提高
  return currentLeverage * (1 + (1 - bodySpinRisk) * 0.1);
}

/**
 * 线旋：递归预测风险评估
 * 基于历史交易序列的自相关性和趋势预测
 * @param historyValues 历史交易量/价值序列
 * @param depth 递归深度 (默认3)
 * @returns 线旋风险值 [0, 1]
 */
export function calculateLineSpin(historyValues: number[], depth: number = 3): number {
  if (historyValues.length < depth + 1) return 0.5;

  // 计算1阶差分
  const diffs: number[] = [];
  for (let i = 1; i < historyValues.length; i++) {
    diffs.push(historyValues[i] - historyValues[i - 1]);
  }

  // 计算自相关系数 (lag-1)
  const autocorr = autocorrelation(diffs, 1);

  // 递归检测：如果差分序列的自相关高，说明存在递归模式
  // 递归模式 + 同方向 = 高风险 (趋势延续可能崩盘)
  const trendDirection = diffs.length > 0 ? diffs[diffs.length - 1] : 0;
  const trendRisk = Math.abs(autocorr) * (trendDirection > 0 ? 1.2 : 0.8);

  // 深层递归检测
  let recursiveRisk = 0;
  if (depth > 1 && diffs.length > depth) {
    const subDiffs = diffs.slice(0, -1);
    recursiveRisk = calculateLineSpin(subDiffs, depth - 1) * 0.5;
  }

  return Math.min(trendRisk + recursiveRisk, 1);
}

/**
 * 计算序列的自相关系数
 * @param series 数值序列
 * @param lag 滞后阶数
 * @returns 自相关系数 [-1, 1]
 */
function autocorrelation(series: number[], lag: number): number {
  if (series.length <= lag) return 0;

  const mean = series.reduce((s, v) => s + v, 0) / series.length;
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < series.length - lag; i++) {
    const diff1 = series[i] - mean;
    const diff2 = series[i + lag] - mean;
    numerator += diff1 * diff2;
  }

  for (let i = 0; i < series.length; i++) {
    const diff = series[i] - mean;
    denominator += diff * diff;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * 三旋风控综合评估
 * @param tokenAmounts 各类 Token 持有量
 * @param leverageRatio 杠杆率
 * @param phiVolatility Φ 波动率
 * @param historyValues 历史交易量序列
 * @param weights 三个维度的权重 [面旋, 体旋, 线旋]
 * @returns TriSpinRiskResult 综合风险评估
 */
export function evaluateTriSpinRisk(
  tokenAmounts: number[],
  leverageRatio: number,
  phiVolatility: number,
  historyValues: number[],
  weights: [number, number, number] = [0.3, 0.4, 0.3]
): TriSpinRiskResult {
  // 面旋
  const surfaceSpin = calculateSurfaceSpin(tokenAmounts);

  // 体旋
  const bodySpin = calculateBodySpin(leverageRatio, phiVolatility);

  // 线旋
  const lineSpin = calculateLineSpin(historyValues);

  // 加权综合风险
  const compositeRisk =
    weights[0] * surfaceSpin +
    weights[1] * bodySpin +
    weights[2] * lineSpin;

  // 风控建议
  let recommendation: 'APPROVE' | 'CAUTION' | 'REJECT';
  if (compositeRisk >= COMPOSITE_REJECT_THRESHOLD) {
    recommendation = 'REJECT';
  } else if (compositeRisk >= COMPOSITE_CAUTION_THRESHOLD) {
    recommendation = 'CAUTION';
  } else {
    recommendation = 'APPROVE';
  }

  return {
    surfaceSpin,
    bodySpin,
    lineSpin,
    compositeRisk,
    recommendation,
  };
}

/**
 * 369 振动模态共振检测模块
 * 基于 Nikola Tesla 3-6-9 理论
 * 3(触发) → 6(共振) → 9(归整) 周期检测
 * 数字根 (Digital Root) 计算：反复求数位和直到单位数
 */

import type { Resonance369Result } from '../types/atex.types';
import { RESONANCE_369, RESONANCE_INTENSITY_THRESHOLD } from '../config/atex.config';

/**
 * 计算数字根 (Digital Root)
 * dr(n) = 1 + (n - 1) % 9, 当 n > 0；dr(0) = 0
 * @param n 非负整数
 * @returns 数字根 (0-9)
 */
export function digitalRoot(n: number): number {
  if (n < 0) n = Math.abs(Math.floor(n));
  if (n === 0) return 0;
  return 1 + ((n - 1) % 9);
}

/**
 * 判断数字根是否为 3/6/9 共振模态
 * @param dr 数字根
 * @returns 共振模态 (0 表示无共振)
 */
export function getResonanceMode(dr: number): 0 | 3 | 6 | 9 {
  if (dr === 3) return 3;
  if (dr === 6) return 6;
  if (dr === 9) return 9;
  return 0;
}

/**
 * 根据数字根判断 369 周期阶段
 * 3 → 触发 (trigger)：新事件启动
 * 6 → 共振 (resonance)：事件放大
 * 9 → 归整 (consolidate)：事件收敛
 * @param dr 数字根
 * @returns 周期阶段
 */
export function getCyclePhase(dr: number): 'trigger' | 'resonance' | 'consolidate' | 'none' {
  if (dr === 3) return 'trigger';
  if (dr === 6) return 'resonance';
  if (dr === 9) return 'consolidate';
  return 'none';
}

/**
 * 计算振动强度
 * 基于连续序列中 3/6/9 模态出现的频率和顺序
 * @param sequence 数值序列
 * @returns 振动强度 [0, 1]
 */
export function calculateVibrationIntensity(sequence: number[]): number {
  if (sequence.length < 3) return 0;

  // 计算序列中每个数的数字根
  const roots = sequence.map(n => digitalRoot(n));

  // 计算 3-6-9 出现的比例
  let count369 = 0;
  for (const r of roots) {
    if (r === 3 || r === 6 || r === 9) {
      count369++;
    }
  }
  const ratio369 = count369 / roots.length;

  // 检测完整 3→6→9 序列
  let completeCycles = 0;
  for (let i = 0; i < roots.length - 2; i++) {
    if (roots[i] === 3 && roots[i + 1] === 6 && roots[i + 2] === 9) {
      completeCycles++;
    }
  }
  const cycleBonus = Math.min(completeCycles * 0.2, 0.4);

  // 总强度
  const intensity = ratio369 * 0.6 + cycleBonus;
  return Math.min(intensity, 1);
}

/**
 * 369 振动模态完整检测
 * @param currentValue 当前值 (如交易量、Token数量)
 * @param history 历史值序列 (最近N期)
 * @returns Resonance369Result 完整检测结果
 */
export function detectResonance369(
  currentValue: number,
  history: number[]
): Resonance369Result {
  // 1. 计算当前数字根
  const dr = digitalRoot(Math.floor(Math.abs(currentValue)));

  // 2. 判断共振模态
  const resonanceMode = getResonanceMode(dr);

  // 3. 判断周期阶段
  const cyclePhase = getCyclePhase(dr);

  // 4. 计算振动强度 (包含历史序列)
  const fullSequence = [...history, currentValue];
  const intensity = calculateVibrationIntensity(fullSequence);

  return {
    digitalRoot: dr,
    resonanceMode,
    cyclePhase,
    intensity,
  };
}

/**
 * 基于共振模态调整交易参数
 * 在共振期间(6)适当放宽，在归整期间(9)适当收紧
 * @param resonance 共振检测结果
 * @param baseAmount 基础交易量
 * @returns 调整后的交易量
 */
export function adjustForResonance(
  resonance: Resonance369Result,
  baseAmount: number
): number {
  if (resonance.intensity < RESONANCE_INTENSITY_THRESHOLD) {
    return baseAmount;
  }

  switch (resonance.cyclePhase) {
    case 'trigger':
      // 触发期：少量增加 (新能量注入)
      return baseAmount * 1.05;
    case 'resonance':
      // 共振期：显著放大
      return baseAmount * (1 + resonance.intensity * 0.1);
    case 'consolidate':
      // 归整期：收敛压缩
      return baseAmount * (1 - resonance.intensity * 0.05);
    default:
      return baseAmount;
  }
}

/**
 * 预测下一个振动周期节点
 * 基于 3→6→9→3 循环预测
 * @param currentPhase 当前阶段
 * @returns 距离下一个节点的步数 (1-3)
 */
export function predictNextNode(currentPhase: 'trigger' | 'resonance' | 'consolidate' | 'none'): number {
  switch (currentPhase) {
    case 'trigger': return 1;     // 3→6 一步
    case 'resonance': return 1;   // 6→9 一步
    case 'consolidate': return 1; // 9→3 一步（新周期）
    default: return 3;            // 未知→3 最远
  }
}

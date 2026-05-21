/**
 * EML Φ 值计算模块
 * 基于 EML 一元数 Φ 值理论，计算 Token 的相位值
 * Φ = |Φ|e^(iθ)，其中 |Φ| 为模长，θ 为相位角
 */

import Complex from 'complex.js';
import type { PhiValue } from '../types/atex.types';
import { PHI_MAGNITUDE_BASE } from '../config/atex.config';

/**
 * 从模长和相位构造 Φ 值复数
 * @param magnitude 模长 |Φ|
 * @param phase 相位角 θ (弧度)
 * @returns Complex 复数表示
 */
export function constructPhi(magnitude: number, phase: number): Complex {
  // complex.js 没有 fromPolar 静态方法，手动构造
  const re = magnitude * Math.cos(phase);
  const im = magnitude * Math.sin(phase);
  return new Complex(re, im);
}

/**
 * 从 Complex 对象提取 Φ 值
 * @param c 复数
 * @returns PhiValue 结构
 */
export function extractPhi(c: Complex): PhiValue {
  return {
    magnitude: c.abs(),
    phase: c.arg(),
  };
}

/**
 * 计算两个 Φ 值的相位差 Δθ
 * 相位差范围归一化到 [-π, π]
 * @param phi1 第一个 Φ 值
 * @param phi2 第二个 Φ 值
 * @returns 相位差 (弧度)
 */
export function calculatePhiDiff(phi1: PhiValue, phi2: PhiValue): number {
  let diff = phi1.phase - phi2.phase;
  // 归一化到 [-π, π]
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/**
 * 计算两个 Φ 值的模长比
 * @param phi1 第一个 Φ 值
 * @param phi2 第二个 Φ 值
 * @returns 模长比 (phi1 / phi2)
 */
export function calculateMagnitudeRatio(phi1: PhiValue, phi2: PhiValue): number {
  if (phi2.magnitude === 0) return phi1.magnitude > 0 ? Infinity : 1;
  return phi1.magnitude / phi2.magnitude;
}

/**
 * 基于相位差和模长比计算动态价格
 * price = |Φ_offerer| / |Φ_requested| × cos(Δθ)
 * @param offererPhi 提供方 Φ 值
 * @param requestedPhi 请求方 Φ 值
 * @returns 动态价格系数
 */
export function calculateDynamicPrice(offererPhi: PhiValue, requestedPhi: PhiValue): number {
  const magnitudeRatio = calculateMagnitudeRatio(offererPhi, requestedPhi);
  const phaseDiff = calculatePhiDiff(offererPhi, requestedPhi);
  // cos(Δθ) 作为相位匹配系数，同相=1，反相=-1
  const phaseAlignment = Math.cos(phaseDiff);
  // 价格 = 模长比 × 相位匹配系数（取绝对值确保正向定价）
  const price = magnitudeRatio * Math.abs(phaseAlignment);
  return Math.max(price, 0.001); // 最低价格下限
}

/**
 * 共识场 Ψ → 价格标量势
 * 价格 = ∇Ψ，即共识场梯度
 * @param phiValues 多个 Φ 值数组
 * @returns 共识场梯度模长（价格标量势）
 */
export function calculateConsensusGradient(phiValues: PhiValue[]): number {
  if (phiValues.length < 2) return 0;

  // 计算所有 Φ 值的矢量和
  let sumReal = 0;
  let sumImag = 0;
  for (const phi of phiValues) {
    const c = constructPhi(phi.magnitude, phi.phase);
    sumReal += c.re;
    sumImag += c.im;
  }

  // 场矢量
  const fieldVector = new Complex(sumReal, sumImag);
  // 场模长
  const fieldMagnitude = fieldVector.abs();
  // 梯度 = 场模长的对数导数（标量势近似）
  const gradient = fieldMagnitude > 0
    ? Math.log(1 + fieldMagnitude / PHI_MAGNITUDE_BASE)
    : 0;

  return gradient;
}

/**
 * Wick 旋转：Token 稳定态 ↔ 波动态转换
 * 稳定态(实数域) → 波动态(虚数域)：乘以 i
 * 波动态(虚数域) → 稳定态(实数域)：除以 i
 * @param phi 输入 Φ 值
 * @param toWave 是否转为波动态
 * @returns 转换后的 Φ 值
 */
export function wickRotation(phi: PhiValue, toWave: boolean): PhiValue {
  const c = constructPhi(phi.magnitude, phi.phase);
  // Wick 旋转：θ → θ ± π/2
  const rotatedPhase = toWave
    ? phi.phase + Math.PI / 2
    : phi.phase - Math.PI / 2;
  return {
    magnitude: phi.magnitude,
    phase: rotatedPhase,
  };
}

/**
 * 计算Φ值的内积（相似度）
 * @param phi1 第一个 Φ 值
 * @param phi2 第二个 Φ 值
 * @returns 内积值，正值=同相，负值=反相
 */
export function phiInnerProduct(phi1: PhiValue, phi2: PhiValue): number {
  const c1 = constructPhi(phi1.magnitude, phi1.phase);
  const c2 = constructPhi(phi2.magnitude, phi2.phase);
  // 内积 = Re(c1 * conj(c2))
  return c1.mul(c2.conjugate()).re;
}

/**
 * 初始化 Agent 的 Φ 值
 * 基于 DID 哈希生成确定性初始相位
 * @param did Agent 的 DID 标识符
 * @returns 初始 Φ 值
 */
export function initializePhiFromDID(did: string): PhiValue {
  // 简单哈希：将 DID 字符串转为数值种子
  let hash = 0;
  for (let i = 0; i < did.length; i++) {
    const char = did.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为32位整数
  }
  // 用哈希生成确定性相位 [0, 2π)
  const phase = ((Math.abs(hash) % 10000) / 10000) * 2 * Math.PI;
  // 初始模长 = 基准值
  const magnitude = PHI_MAGNITUDE_BASE;
  return { magnitude, phase };
}

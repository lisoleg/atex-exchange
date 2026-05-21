/**
 * Φ 值前端计算工具
 * 在浏览器端执行轻量级 Φ 值计算
 */

/** Φ 值结构 */
export interface PhiValue {
  magnitude: number;
  phase: number;
}

/** Token 类型 */
export type TokenType = 'CALC' | 'WIT' | 'WORD' | 'PASS';

/**
 * 计算两个 Φ 值的相位差
 * @param phi1 第一个 Φ 值
 * @param phi2 第二个 Φ 值
 * @returns 相位差 (弧度)
 */
export function calculatePhiDiff(phi1: PhiValue, phi2: PhiValue): number {
  let diff = phi1.phase - phi2.phase;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/**
 * 计算模长比
 */
export function calculateMagnitudeRatio(phi1: PhiValue, phi2: PhiValue): number {
  if (phi2.magnitude === 0) return phi1.magnitude > 0 ? Infinity : 1;
  return phi1.magnitude / phi2.magnitude;
}

/**
 * 计算动态价格系数
 * price = |Φ1|/|Φ2| × |cos(Δθ)|
 */
export function calculateDynamicPrice(offererPhi: PhiValue, requestedPhi: PhiValue): number {
  const magnitudeRatio = calculateMagnitudeRatio(offererPhi, requestedPhi);
  const phaseDiff = calculatePhiDiff(offererPhi, requestedPhi);
  const phaseAlignment = Math.cos(phaseDiff);
  const price = magnitudeRatio * Math.abs(phaseAlignment);
  return Math.max(price, 0.001);
}

/**
 * 相位差转角度
 */
export function phaseToDegrees(phase: number): number {
  return (phase * 180) / Math.PI;
}

/**
 * 计算 Jitter 滑点 (简化版)
 */
export function estimateSlippage(gradient: number, jitterMs: number): number {
  const slippage = gradient * (jitterMs / 1000);
  return Math.min(Math.abs(slippage), 0.05);
}

/**
 * Token 类型默认 Φ 值
 */
export const DEFAULT_PHI_VALUES: Record<TokenType, PhiValue> = {
  CALC: { magnitude: 1.0, phase: 0 },
  WIT: { magnitude: 1.5, phase: Math.PI / 6 },
  WORD: { magnitude: 0.8, phase: Math.PI / 3 },
  PASS: { magnitude: 2.0, phase: Math.PI / 4 },
};

/**
 * Token 类型中文名
 */
export const TOKEN_LABELS: Record<TokenType, string> = {
  CALC: '算元',
  WIT: '智元',
  WORD: '词元',
  PASS: '通证',
};

/**
 * Token 类型颜色
 */
export const TOKEN_COLORS: Record<TokenType, string> = {
  CALC: '#6366f1',
  WIT: '#8b5cf6',
  WORD: '#06b6d4',
  PASS: '#10b981',
};

/**
 * 计算共识场梯度 (简化版)
 */
export function calculateConsensusGradient(phiValues: PhiValue[]): number {
  if (phiValues.length < 2) return 0;

  let sumReal = 0;
  let sumImag = 0;
  for (const phi of phiValues) {
    sumReal += phi.magnitude * Math.cos(phi.phase);
    sumImag += phi.magnitude * Math.sin(phi.phase);
  }

  const fieldMagnitude = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
  return fieldMagnitude > 0 ? Math.log(1 + fieldMagnitude) : 0;
}

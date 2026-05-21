/**
 * EML Φ 值计算测试
 */

import { describe, it, expect } from 'vitest';
import {
  constructPhi,
  extractPhi,
  calculatePhiDiff,
  calculateMagnitudeRatio,
  calculateDynamicPrice,
  calculateConsensusGradient,
  wickRotation,
  phiInnerProduct,
  initializePhiFromDID,
} from '../../src/math/emlPhi';
import type { PhiValue } from '../../src/types/atex.types';

describe('constructPhi', () => {
  it('应从模长和相位构造复数', () => {
    const c = constructPhi(1, 0);
    expect(c.re).toBeCloseTo(1, 10);
    expect(c.im).toBeCloseTo(0, 10);
  });

  it('应正确构造π/4相位', () => {
    const c = constructPhi(1, Math.PI / 4);
    expect(c.re).toBeCloseTo(Math.cos(Math.PI / 4), 10);
    expect(c.im).toBeCloseTo(Math.sin(Math.PI / 4), 10);
  });
});

describe('extractPhi', () => {
  it('应从复数提取模长和相位', () => {
    const phi = extractPhi(constructPhi(2, Math.PI / 3));
    expect(phi.magnitude).toBeCloseTo(2, 10);
    expect(phi.phase).toBeCloseTo(Math.PI / 3, 10);
  });
});

describe('calculatePhiDiff', () => {
  it('同相应差为0', () => {
    const phi1: PhiValue = { magnitude: 1, phase: 0.5 };
    const phi2: PhiValue = { magnitude: 2, phase: 0.5 };
    expect(calculatePhiDiff(phi1, phi2)).toBeCloseTo(0, 10);
  });

  it('反相应差为π', () => {
    const phi1: PhiValue = { magnitude: 1, phase: 0 };
    const phi2: PhiValue = { magnitude: 1, phase: Math.PI };
    const diff = calculatePhiDiff(phi1, phi2);
    expect(Math.abs(diff)).toBeCloseTo(Math.PI, 5);
  });

  it('应归一化到[-π, π]', () => {
    const phi1: PhiValue = { magnitude: 1, phase: 0 };
    const phi2: PhiValue = { magnitude: 1, phase: -3 * Math.PI / 2 };
    const diff = calculatePhiDiff(phi1, phi2);
    expect(diff).toBeGreaterThanOrEqual(-Math.PI);
    expect(diff).toBeLessThanOrEqual(Math.PI);
  });

  it('正交相位差为π/2', () => {
    const phi1: PhiValue = { magnitude: 1, phase: 0 };
    const phi2: PhiValue = { magnitude: 1, phase: Math.PI / 2 };
    expect(calculatePhiDiff(phi1, phi2)).toBeCloseTo(-Math.PI / 2, 10);
  });
});

describe('calculateMagnitudeRatio', () => {
  it('应正确计算模长比', () => {
    const phi1: PhiValue = { magnitude: 2, phase: 0 };
    const phi2: PhiValue = { magnitude: 4, phase: 0 };
    expect(calculateMagnitudeRatio(phi1, phi2)).toBeCloseTo(0.5, 10);
  });

  it('分母为0时应返回Infinity', () => {
    const phi1: PhiValue = { magnitude: 1, phase: 0 };
    const phi2: PhiValue = { magnitude: 0, phase: 0 };
    expect(calculateMagnitudeRatio(phi1, phi2)).toBe(Infinity);
  });
});

describe('calculateDynamicPrice', () => {
  it('同相时价格 = 模长比', () => {
    const phi1: PhiValue = { magnitude: 2, phase: 0 };
    const phi2: PhiValue = { magnitude: 1, phase: 0 };
    const price = calculateDynamicPrice(phi1, phi2);
    expect(price).toBeCloseTo(2, 5);
  });

  it('反相时价格等于模长比(取绝对值)', () => {
    const phi1: PhiValue = { magnitude: 1, phase: 0 };
    const phi2: PhiValue = { magnitude: 1, phase: Math.PI };
    const price = calculateDynamicPrice(phi1, phi2);
    // cos(π) = -1, abs(cos(π)) = 1, 所以价格 = magnitudeRatio * 1 = 1
    expect(price).toBeCloseTo(1, 5);
  });

  it('价格应有下限0.001', () => {
    const phi1: PhiValue = { magnitude: 0.001, phase: Math.PI / 2 };
    const phi2: PhiValue = { magnitude: 100, phase: 0 };
    const price = calculateDynamicPrice(phi1, phi2);
    expect(price).toBeGreaterThanOrEqual(0.001);
  });
});

describe('calculateConsensusGradient', () => {
  it('少于2个Φ值时应返回0', () => {
    expect(calculateConsensusGradient([])).toBe(0);
    expect(calculateConsensusGradient([{ magnitude: 1, phase: 0 }])).toBe(0);
  });

  it('同相Φ值梯度应较高', () => {
    const aligned = [
      { magnitude: 1, phase: 0.1 },
      { magnitude: 1, phase: 0.1 },
      { magnitude: 1, phase: 0.1 },
    ];
    const gradient = calculateConsensusGradient(aligned);
    expect(gradient).toBeGreaterThan(0);
  });

  it('均匀分散Φ值梯度应较低', () => {
    const dispersed = [
      { magnitude: 1, phase: 0 },
      { magnitude: 1, phase: Math.PI },
    ];
    const gradient = calculateConsensusGradient(dispersed);
    expect(gradient).toBeLessThan(0.1);
  });
});

describe('wickRotation', () => {
  it('转为波动态应相位+π/2', () => {
    const phi: PhiValue = { magnitude: 1, phase: 0 };
    const wave = wickRotation(phi, true);
    expect(wave.phase).toBeCloseTo(Math.PI / 2, 10);
    expect(wave.magnitude).toBe(1);
  });

  it('转为稳定态应相位-π/2', () => {
    const phi: PhiValue = { magnitude: 1, phase: Math.PI / 2 };
    const stable = wickRotation(phi, false);
    expect(stable.phase).toBeCloseTo(0, 10);
  });
});

describe('phiInnerProduct', () => {
  it('同相内积应为正', () => {
    const phi1: PhiValue = { magnitude: 1, phase: 0 };
    const phi2: PhiValue = { magnitude: 1, phase: 0 };
    expect(phiInnerProduct(phi1, phi2)).toBeGreaterThan(0);
  });

  it('反相内积应为负', () => {
    const phi1: PhiValue = { magnitude: 1, phase: 0 };
    const phi2: PhiValue = { magnitude: 1, phase: Math.PI };
    expect(phiInnerProduct(phi1, phi2)).toBeLessThan(0);
  });
});

describe('initializePhiFromDID', () => {
  it('应为相同DID生成确定性Φ值', () => {
    const phi1 = initializePhiFromDID('did:agent:alice');
    const phi2 = initializePhiFromDID('did:agent:alice');
    expect(phi1.magnitude).toBe(phi2.magnitude);
    expect(phi1.phase).toBe(phi2.phase);
  });

  it('应为不同DID生成不同Φ值', () => {
    const phi1 = initializePhiFromDID('did:agent:alice');
    const phi2 = initializePhiFromDID('did:agent:bob');
    // 至少相位应该不同
    expect(phi1.phase).not.toBe(phi2.phase);
  });
});

/**
 * 三旋风控模型测试
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSurfaceSpin,
  calculatePhaseDispersion,
  calculateBodySpin,
  suggestAdaptiveLeverage,
  calculateLineSpin,
  evaluateTriSpinRisk,
} from '../../src/math/triSpinRisk';
import type { PhiValue } from '../../src/types/atex.types';

describe('calculateSurfaceSpin', () => {
  it('空数组应返回1（最高风险）', () => {
    expect(calculateSurfaceSpin([])).toBe(1);
  });

  it('完全集中（单Token）应返回1', () => {
    expect(calculateSurfaceSpin([100])).toBeCloseTo(1, 5);
  });

  it('均匀分散应返回最低风险', () => {
    const risk = calculateSurfaceSpin([250, 250, 250, 250]);
    // Herfindahl = 4 * (0.25)^2 = 0.25
    expect(risk).toBeCloseTo(0.25, 5);
  });

  it('高度集中应返回较高风险', () => {
    const risk = calculateSurfaceSpin([900, 50, 30, 20]);
    expect(risk).toBeGreaterThan(0.7);
  });
});

describe('calculatePhaseDispersion', () => {
  it('少于2个Φ值应返回1', () => {
    expect(calculatePhaseDispersion([])).toBe(1);
    expect(calculatePhaseDispersion([{ magnitude: 1, phase: 0 }])).toBe(1);
  });

  it('所有相位相同应返回接近1', () => {
    const phiValues: PhiValue[] = [
      { magnitude: 1, phase: 0.5 },
      { magnitude: 1, phase: 0.5 },
      { magnitude: 1, phase: 0.5 },
    ];
    const dispersion = calculatePhaseDispersion(phiValues);
    expect(dispersion).toBeCloseTo(1, 3);
  });

  it('均匀分散相位应返回较低值', () => {
    const phiValues: PhiValue[] = [
      { magnitude: 1, phase: 0 },
      { magnitude: 1, phase: Math.PI },
    ];
    const dispersion = calculatePhaseDispersion(phiValues);
    expect(dispersion).toBeLessThan(0.1);
  });
});

describe('calculateBodySpin', () => {
  it('低杠杆 + 低波动 → 低风险', () => {
    const risk = calculateBodySpin(0.5, 0.1);
    expect(risk).toBeLessThan(0.3);
  });

  it('高杠杆 + 高波动 → 高风险', () => {
    const risk = calculateBodySpin(4.0, 0.4);
    expect(risk).toBeGreaterThan(0.5);
  });

  it('风险应在[0,1]范围内', () => {
    const risk = calculateBodySpin(10, 1.0);
    expect(risk).toBeLessThanOrEqual(1);
  });
});

describe('suggestAdaptiveLeverage', () => {
  it('高风险应降低杠杆', () => {
    const suggested = suggestAdaptiveLeverage(3.0, 0.9);
    expect(suggested).toBeLessThan(3.0);
  });

  it('低风险可适当提高杠杆', () => {
    const suggested = suggestAdaptiveLeverage(2.0, 0.1);
    expect(suggested).toBeGreaterThan(2.0);
  });
});

describe('calculateLineSpin', () => {
  it('数据不足应返回0.5', () => {
    expect(calculateLineSpin([1, 2])).toBe(0.5);
  });

  it('稳定序列应返回较低风险', () => {
    const values = [100, 101, 100, 101, 100, 101, 100];
    const risk = calculateLineSpin(values);
    expect(risk).toBeLessThanOrEqual(1);
  });

  it('风险应在[0,1]范围内', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80];
    const risk = calculateLineSpin(values);
    expect(risk).toBeGreaterThanOrEqual(0);
    expect(risk).toBeLessThanOrEqual(1);
  });
});

describe('evaluateTriSpinRisk', () => {
  it('低风险组合应返回APPROVE', () => {
    const result = evaluateTriSpinRisk(
      [250, 250, 250, 250],  // 均匀分散
      0.5,                     // 低杠杆
      0.05,                    // 低波动
      [100, 101, 100, 101, 100, 101, 100]  // 稳定
    );
    expect(result.recommendation).toBe('APPROVE');
    expect(result.compositeRisk).toBeLessThan(0.5);
  });

  it('高风险组合应返回REJECT或CAUTION', () => {
    const result = evaluateTriSpinRisk(
      [900, 50, 30, 20],       // 高度集中
      4.0,                       // 高杠杆
      0.4,                       // 高波动
      [10, 20, 40, 80, 160]     // 快速增长
    );
    expect(['CAUTION', 'REJECT']).toContain(result.recommendation);
  });

  it('所有子风险值应在[0,1]范围内', () => {
    const result = evaluateTriSpinRisk([100, 100], 2.0, 0.2, [1, 2, 3, 4, 5]);
    expect(result.surfaceSpin).toBeGreaterThanOrEqual(0);
    expect(result.surfaceSpin).toBeLessThanOrEqual(1);
    expect(result.bodySpin).toBeGreaterThanOrEqual(0);
    expect(result.bodySpin).toBeLessThanOrEqual(1);
    expect(result.lineSpin).toBeGreaterThanOrEqual(0);
    expect(result.lineSpin).toBeLessThanOrEqual(1);
    expect(result.compositeRisk).toBeGreaterThanOrEqual(0);
    expect(result.compositeRisk).toBeLessThanOrEqual(1);
  });
});

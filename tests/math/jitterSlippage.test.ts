/**
 * Jitter 滑点模型测试
 */

import { describe, it, expect } from 'vitest';
import {
  normalRandom,
  calculateJitter,
  calculateSlippage,
  calculateJitterSlippage,
  isSlippageExceeded,
  estimateJitterParams,
} from '../../src/math/jitterSlippage';
import { MAX_SLIPPAGE_RATIO } from '../../src/config/atex.config';
import type { PhiValue } from '../../src/types/atex.types';

describe('normalRandom', () => {
  it('应生成正态分布随机数', () => {
    // 大样本均值应接近0，标准差应接近1
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(normalRandom(0, 1));
    }
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.2); // 均值接近0
  });
});

describe('calculateJitter', () => {
  it('应返回非负值', () => {
    for (let i = 0; i < 100; i++) {
      const jitter = calculateJitter();
      expect(jitter).toBeGreaterThanOrEqual(0);
    }
  });

  it('应围绕基线波动', () => {
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(calculateJitter(50, 15));
    }
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    // 均值应在基线附近
    expect(mean).toBeGreaterThan(20);
    expect(mean).toBeLessThan(80);
  });
});

describe('calculateSlippage', () => {
  it('高梯度 + 高Jitter → 高滑点', () => {
    const slippage = calculateSlippage(2.0, 100);
    expect(slippage).toBeGreaterThan(0);
  });

  it('零梯度 → 零滑点', () => {
    const slippage = calculateSlippage(0, 100);
    expect(slippage).toBe(0);
  });

  it('零Jitter → 零滑点', () => {
    const slippage = calculateSlippage(2.0, 0);
    expect(slippage).toBe(0);
  });

  it('滑点不应超过最大比例', () => {
    const slippage = calculateSlippage(100, 10000);
    expect(slippage).toBeLessThanOrEqual(MAX_SLIPPAGE_RATIO);
  });
});

describe('calculateJitterSlippage', () => {
  it('应返回完整的Jitter结果', () => {
    const phiValues: PhiValue[] = [
      { magnitude: 1, phase: 0 },
      { magnitude: 1, phase: Math.PI / 4 },
    ];
    const result = calculateJitterSlippage(phiValues, 100);
    expect(result.jitter).toBeGreaterThanOrEqual(0);
    expect(result.slippage).toBeGreaterThanOrEqual(0);
    expect(result.impact).toBeGreaterThanOrEqual(0);
    expect(result.impact).toBe(result.slippage * 100);
  });
});

describe('isSlippageExceeded', () => {
  it('滑点超过最大比例应返回true', () => {
    const result = { jitter: 100, slippage: 0.1, impact: 10 };
    expect(isSlippageExceeded(result)).toBe(true);
  });

  it('滑点在范围内应返回false', () => {
    const result = { jitter: 50, slippage: 0.01, impact: 1 };
    expect(isSlippageExceeded(result)).toBe(false);
  });
});

describe('estimateJitterParams', () => {
  it('空数组应返回默认值', () => {
    const params = estimateJitterParams([]);
    expect(params.mean).toBe(50); // JITTER_BASELINE
    expect(params.stddev).toBe(15); // JITTER_STDDEV
  });

  it('应正确估计均值和标准差', () => {
    const values = [50, 52, 48, 51, 49, 50];
    const params = estimateJitterParams(values);
    expect(params.mean).toBeCloseTo(50, 0);
    expect(params.stddev).toBeGreaterThan(0);
  });
});

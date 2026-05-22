/**
 * 139 相变自动校准引擎
 * 将手动阈值升级为基于统计学习的自动校准系统
 *
 * 核心思想：
 * - 手动阈值 PHASE_TRANSITION_139 = 139 是硬编码的
 * - 实际市场中，相变点随市场状态动态变化
 * - 本模块用在线学习持续校准相变阈值
 *
 * 方法论：
 * 1. 滑动窗口统计 LOB 深度熵序列
 * 2. CUSUM（累积和）检测均值漂移 → 相变信号
 * 3. 指数加权移动平均（EWMA）平滑阈值
 * 4. 多因子融合：熵 + 交易量 + Φ 场梯度 → 综合相变指数
 * 5. 反馈闭环：相变后回测虚警率，自动调参
 */

import type { PhaseTransition139Result } from '../types/atex.types';
import {
  PHASE_TRANSITION_139,
  LOB_ENTROPY_SAFETY,
  LOB_ENTROPY_WARNING,
} from '../config/atex.config';

/** 滑动窗口大小 */
const WINDOW_SIZE = 100;

/** CUSUM 灵敏度 */
const CUSUM_SENSITIVITY = 5;

/** EWMA 平滑因子 (0 < α ≤ 1，越小越平滑) */
const EWMA_ALPHA = 0.1;

/** 虚警率目标 (低于此值时收紧阈值) */
const TARGET_FALSE_ALARM_RATE = 0.05;

/** 校准历史记录 */
interface CalibrationRecord {
  timestamp: Date;
  lobEntropy: number;
  volume: number;
  phiGradient: number;
  thresholdUsed: number;
  detectedSingularity: boolean;
  actualSingularity: boolean; // 事后回测填充
}

/** 在线统计量 */
interface OnlineStats {
  count: number;
  mean: number;
  m2: number; // Welford's algorithm: sum of squared differences
  ewma: number; // 指数加权移动平均
}

/**
 * PhaseCalibrator — 139 相变自动校准器
 */
export class PhaseCalibrator {
  /** LOB 深度熵序列 */
  private entropyWindow: number[] = [];

  /** 交易量序列 */
  private volumeWindow: number[] = [];

  /** Φ 场梯度序列 */
  private gradientWindow: number[] = [];

  /** 当前自适应阈值 */
  private adaptiveThreshold: number;

  /** 基线阈值 */
  private baselineThreshold: number;

  /** 在线统计 */
  private entropyStats: OnlineStats = { count: 0, mean: 0, m2: 0, ewma: 0 };
  private volumeStats: OnlineStats = { count: 0, mean: 0, m2: 0, ewma: 0 };

  /** CUSUM 累积和 */
  private cusumPositive: number = 0;
  private cusumNegative: number = 0;

  /** 校准历史 */
  private calibrationHistory: CalibrationRecord[] = [];

  /** 虚警率追踪 */
  private falseAlarms: number = 0;
  private totalDetections: number = 0;

  /** 上次检测到的相变时间 */
  private lastSingularityTime: Date | null = null;

  constructor() {
    this.baselineThreshold = PHASE_TRANSITION_139;
    this.adaptiveThreshold = PHASE_TRANSITION_139;
  }

  /**
   * 更新在线统计（Welford's algorithm + EWMA）
   */
  private updateStats(stats: OnlineStats, value: number): OnlineStats {
    const newCount = stats.count + 1;
    const delta = value - stats.mean;
    const newMean = stats.mean + delta / newCount;
    const delta2 = value - newMean;
    const newM2 = stats.m2 + delta * delta2;
    const newEwma = stats.ewma === 0
      ? value
      : EWMA_ALPHA * value + (1 - EWMA_ALPHA) * stats.ewma;

    return { count: newCount, mean: newMean, m2: newM2, ewma: newEwma };
  }

  /**
   * 在线方差
   */
  private onlineVariance(stats: OnlineStats): number {
    if (stats.count < 2) return 0;
    return stats.m2 / (stats.count - 1);
  }

  /**
   * 在线标准差
   */
  private onlineStddev(stats: OnlineStats): number {
    return Math.sqrt(this.onlineVariance(stats));
  }

  /**
   * CUSUM 漂移检测
   * 检测均值是否发生显著偏移（相变信号）
   *
   * @param value 当前观测值
   * @param target 目标均值
   * @param sigma 标准差
   * @returns 是否检测到漂移
   */
  private cusumDetect(value: number, target: number, sigma: number): {
    driftDetected: boolean;
    cusumPos: number;
    cusumNeg: number;
  } {
    if (sigma === 0) return { driftDetected: false, cusumPos: 0, cusumNeg: 0 };

    const k = 0.5 * sigma; // 允许偏差（slack）
    const normalizedDev = (value - target) / sigma;

    // 正向 CUSUM（上漂移）
    this.cusumPositive = Math.max(0, this.cusumPositive + normalizedDev - k);
    // 负向 CUSUM（下漂移）
    this.cusumNegative = Math.max(0, this.cusumNegative - normalizedDev - k);

    const driftDetected =
      this.cusumPositive > CUSUM_SENSITIVITY ||
      this.cusumNegative > CUSUM_SENSITIVITY;

    return {
      driftDetected,
      cusumPos: this.cusumPositive,
      cusumNeg: this.cusumNegative,
    };
  }

  /**
   * 推入新观测值并执行自动校准
   *
   * @param lobDepthEntropy LOB 深度熵
   * @param volume 交易量
   * @param phiGradient Φ 场梯度
   * @returns 相变检测结果
   */
  observe(
    lobDepthEntropy: number,
    volume: number,
    phiGradient: number
  ): PhaseTransition139Result & {
    autoCalibrated: boolean;
    adaptiveThreshold: number;
    cusumDrift: boolean;
  } {
    // 1. 更新滑动窗口
    this.entropyWindow.push(lobDepthEntropy);
    this.volumeWindow.push(volume);
    this.gradientWindow.push(phiGradient);

    if (this.entropyWindow.length > WINDOW_SIZE) {
      this.entropyWindow.shift();
      this.volumeWindow.shift();
      this.gradientWindow.shift();
    }

    // 2. 更新在线统计
    this.entropyStats = this.updateStats(this.entropyStats, lobDepthEntropy);
    this.volumeStats = this.updateStats(this.volumeStats, volume);

    // 3. CUSUM 漂移检测
    const cusumResult = this.cusumDetect(
      lobDepthEntropy,
      this.entropyStats.ewma,
      this.onlineStddev(this.entropyStats)
    );

    // 4. 计算综合相变指数
    const entropyZScore = this.onlineStddev(this.entropyStats) > 0
      ? (lobDepthEntropy - this.entropyStats.ewma) / this.onlineStddev(this.entropyStats)
      : 0;

    const volumeZScore = this.onlineStddev(this.volumeStats) > 0
      ? (volume - this.volumeStats.ewma) / this.onlineStddev(this.volumeStats)
      : 0;

    // 综合相变指数 = 熵异常 × 0.5 + 量异常 × 0.3 + Φ梯度 × 0.2
    const compositeIndex =
      Math.abs(entropyZScore) * 0.5 +
      Math.abs(volumeZScore) * 0.3 +
      Math.abs(phiGradient) * 0.2;

    // 5. 自适应阈值校准
    const autoCalibrated = this.calibrateThreshold(compositeIndex, cusumResult.driftDetected);

    // 6. 判断是否触发相变
    const isSingularity = compositeIndex > this.adaptiveThreshold || cusumResult.driftDetected;

    // 7. 计算预警级别
    const alertLevel = isSingularity
      ? Math.min(compositeIndex / this.adaptiveThreshold, 1.0)
      : Math.max(0, compositeIndex / this.adaptiveThreshold);

    const deviation = compositeIndex - this.adaptiveThreshold;

    // 8. 记录校准历史
    const record: CalibrationRecord = {
      timestamp: new Date(),
      lobEntropy: lobDepthEntropy,
      volume,
      phiGradient,
      thresholdUsed: this.adaptiveThreshold,
      detectedSingularity: isSingularity,
      actualSingularity: false, // 事后回测填充
    };
    this.calibrationHistory.push(record);

    if (this.calibrationHistory.length > 1000) {
      this.calibrationHistory.shift();
    }

    if (isSingularity) {
      this.totalDetections++;
      this.lastSingularityTime = new Date();
    }

    return {
      lobDepthEntropy,
      isSingularity,
      alertLevel,
      deviation,
      autoCalibrated,
      adaptiveThreshold: this.adaptiveThreshold,
      cusumDrift: cusumResult.driftDetected,
    };
  }

  /**
   * 自适应阈值校准
   *
   * 策略：
   * - 正常状态：阈值缓慢趋向基线
   * - CUSUM 漂移：阈值收紧（更容易触发预警）
   * - 高虚警率：阈值放宽（减少误报）
   */
  private calibrateThreshold(compositeIndex: number, cusumDrift: boolean): boolean {
    const falseAlarmRate = this.totalDetections > 0
      ? this.falseAlarms / this.totalDetections
      : 0;

    let targetThreshold = this.baselineThreshold;

    if (cusumDrift) {
      // 检测到漂移：收紧 20%
      targetThreshold = this.baselineThreshold * 0.8;
    } else if (falseAlarmRate > TARGET_FALSE_ALARM_RATE * 2) {
      // 虚警率过高：放宽 30%
      targetThreshold = this.baselineThreshold * 1.3;
    } else if (falseAlarmRate < TARGET_FALSE_ALARM_RATE * 0.5) {
      // 虚警率过低：收紧 10%
      targetThreshold = this.baselineThreshold * 0.9;
    }

    // EWMA 平滑过渡
    const oldThreshold = this.adaptiveThreshold;
    this.adaptiveThreshold = EWMA_ALPHA * targetThreshold + (1 - EWMA_ALPHA) * this.adaptiveThreshold;

    // 阈值下限保护
    this.adaptiveThreshold = Math.max(this.adaptiveThreshold, this.baselineThreshold * 0.5);
    this.adaptiveThreshold = Math.min(this.adaptiveThreshold, this.baselineThreshold * 2.0);

    return Math.abs(this.adaptiveThreshold - oldThreshold) > 0.01;
  }

  /**
   * 事后回测 — 标注实际是否发生相变
   * 用于计算虚警率
   */
  retrospectiveLabel(
    timestamp: Date,
    actualSingularity: boolean
  ): void {
    const record = this.calibrationHistory.find(r =>
      Math.abs(r.timestamp.getTime() - timestamp.getTime()) < 60000
    );
    if (record) {
      record.actualSingularity = actualSingularity;
      // 更新虚警计数
      if (record.detectedSingularity && !actualSingularity) {
        this.falseAlarms++;
      }
    }
  }

  /**
   * 获取当前阈值
   */
  getThreshold(): number {
    return this.adaptiveThreshold;
  }

  /**
   * 获取校准统计
   */
  getCalibrationStats(): {
    adaptiveThreshold: number;
    baselineThreshold: number;
    deviation: number;
    falseAlarmRate: number;
    totalDetections: number;
    falseAlarms: number;
    entropyStats: { mean: number; stddev: number; ewma: number };
    volumeStats: { mean: number; stddev: number; ewma: number };
    windowFill: number;
  } {
    return {
      adaptiveThreshold: this.adaptiveThreshold,
      baselineThreshold: this.baselineThreshold,
      deviation: this.adaptiveThreshold - this.baselineThreshold,
      falseAlarmRate: this.totalDetections > 0 ? this.falseAlarms / this.totalDetections : 0,
      totalDetections: this.totalDetections,
      falseAlarms: this.falseAlarms,
      entropyStats: {
        mean: this.entropyStats.mean,
        stddev: this.onlineStddev(this.entropyStats),
        ewma: this.entropyStats.ewma,
      },
      volumeStats: {
        mean: this.volumeStats.mean,
        stddev: this.onlineStddev(this.volumeStats),
        ewma: this.volumeStats.ewma,
      },
      windowFill: this.entropyWindow.length / WINDOW_SIZE,
    };
  }

  /**
   * get_state() — 模块自检
   */
  get_state(): Record<string, unknown> {
    return {
      module: 'PhaseCalibrator',
      ...this.getCalibrationStats(),
    };
  }
}

/** 单例 */
let instance: PhaseCalibrator | null = null;

export function getPhaseCalibrator(): PhaseCalibrator {
  if (!instance) {
    instance = new PhaseCalibrator();
  }
  return instance;
}

export function resetPhaseCalibrator(): void {
  instance = null;
}

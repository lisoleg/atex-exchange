/**
 * 反相位欺诈检测器
 * 检测在短时间内大量反相位交易的恶意行为
 * 反相位：Φ 值相位差接近 π (180°) 的交易对
 */

import { ANTIPHASE_WINDOW, ANTIPHASE_BURST_THRESHOLD } from '../config/atex.config';
import type { PhiValue } from '../types/atex.types';

/** 反相位交易记录 */
interface AntiPhaseRecord {
  did: string;
  timestamp: number;
  phaseDiff: number;
  isAntiPhase: boolean;
}

/** Agent 反相位历史 */
const antiPhaseHistory = new Map<string, AntiPhaseRecord[]>();

/** 反相位判定阈值 (接近 π = 180°) */
const ANTIPHASE_ANGLE = Math.PI * 0.8; // 144° 以上视为反相位

/**
 * 记录交易相位差
 * @param did Agent DID
 * @param phaseDiff 相位差 (弧度)
 */
export function recordPhaseTransaction(did: string, phaseDiff: number): void {
  let records = antiPhaseHistory.get(did);
  if (!records) {
    records = [];
    antiPhaseHistory.set(did, records);
  }

  const isAntiPhase = Math.abs(phaseDiff) > ANTIPHASE_ANGLE;

  records.push({
    did,
    timestamp: Date.now(),
    phaseDiff,
    isAntiPhase,
  });

  // 清理过期记录 (保留最近5分钟)
  const cutoff = Date.now() - ANTIPHASE_WINDOW * 1000 * 5;
  const filtered = records.filter(r => r.timestamp > cutoff);
  antiPhaseHistory.set(did, filtered);
}

/**
 * 检测反相位突发
 * 在检测窗口内，如果反相位交易数量超过阈值，判定为欺诈
 * @param did Agent DID
 * @returns 是否检测到反相位突发
 */
export function detectAntiPhaseBurst(did: string): boolean {
  const records = antiPhaseHistory.get(did);
  if (!records || records.length === 0) return false;

  const now = Date.now();
  const windowStart = now - ANTIPHASE_WINDOW * 1000;

  // 统计窗口内的反相位交易数
  const antiPhaseCount = records.filter(
    r => r.timestamp > windowStart && r.isAntiPhase
  ).length;

  return antiPhaseCount >= ANTIPHASE_BURST_THRESHOLD;
}

/**
 * 计算反相位风险评分
 * @param did Agent DID
 * @returns 风险评分 [0, 1]
 */
export function calculateAntiPhaseRisk(did: string): number {
  const records = antiPhaseHistory.get(did);
  if (!records || records.length === 0) return 0;

  const now = Date.now();
  const windowStart = now - ANTIPHASE_WINDOW * 1000;

  const recentRecords = records.filter(r => r.timestamp > windowStart);
  if (recentRecords.length === 0) return 0;

  const antiPhaseCount = recentRecords.filter(r => r.isAntiPhase).length;
  const ratio = antiPhaseCount / recentRecords.length;

  // 反相位比例越高，风险越高
  return Math.min(ratio * 1.5, 1);
}

/**
 * 获取 Agent 的反相位统计
 * @param did Agent DID
 * @returns 统计信息
 */
export function getAntiPhaseStats(did: string): {
  totalRecent: number;
  antiPhaseCount: number;
  ratio: number;
  isBurst: boolean;
} {
  const records = antiPhaseHistory.get(did);
  if (!records || records.length === 0) {
    return { totalRecent: 0, antiPhaseCount: 0, ratio: 0, isBurst: false };
  }

  const now = Date.now();
  const windowStart = now - ANTIPHASE_WINDOW * 1000;
  const recentRecords = records.filter(r => r.timestamp > windowStart);
  const antiPhaseCount = recentRecords.filter(r => r.isAntiPhase).length;

  return {
    totalRecent: recentRecords.length,
    antiPhaseCount,
    ratio: recentRecords.length > 0 ? antiPhaseCount / recentRecords.length : 0,
    isBurst: detectAntiPhaseBurst(did),
  };
}

/**
 * 判断两个 Φ 值是否处于反相位
 * @param phi1 第一个 Φ 值
 * @param phi2 第二个 Φ 值
 * @returns 是否反相位
 */
export function isAntiPhasePair(phi1: PhiValue, phi2: PhiValue): boolean {
  const diff = Math.abs(phi1.phase - phi2.phase);
  const normalizedDiff = diff > Math.PI ? 2 * Math.PI - diff : diff;
  return normalizedDiff > ANTIPHASE_ANGLE;
}

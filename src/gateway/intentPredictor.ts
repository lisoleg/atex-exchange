/**
 * 意图预测器 (数字孪生)
 * 基于历史行为模式预测交易意图的合理性
 * 使用简化版数字孪生模型进行意图评分
 */

import type { CreateOfferRequest } from '../types/atex.types';
import { INTENT_THRESHOLD } from '../config/atex.config';

/** Agent 交易历史记录 (内存模拟) */
interface AgentHistory {
  did: string;
  recentTrades: {
    timestamp: number;
    offerTokenType: string;
    reqTokenType: string;
    amount: number;
  }[];
  avgTradeInterval: number; // 平均交易间隔 (ms)
  lastTradeTime: number;
}

/** Agent 历史缓存 */
const agentHistories = new Map<string, AgentHistory>();

/**
 * 记录交易行为
 * @param did Agent DID
 * @param request 交易请求
 */
export function recordTradeIntent(
  did: string,
  request: CreateOfferRequest
): void {
  let history = agentHistories.get(did);
  const now = Date.now();

  if (!history) {
    history = {
      did,
      recentTrades: [],
      avgTradeInterval: 60000, // 默认1分钟
      lastTradeTime: now,
    };
    agentHistories.set(did, history);
  }

  // 更新交易间隔
  if (history.lastTradeTime > 0) {
    const interval = now - history.lastTradeTime;
    history.avgTradeInterval = (history.avgTradeInterval * 0.8) + (interval * 0.2);
  }
  history.lastTradeTime = now;

  // 记录最近交易
  history.recentTrades.push({
    timestamp: now,
    offerTokenType: request.offerTokenType,
    reqTokenType: request.reqTokenType,
    amount: request.offerAmount,
  });

  // 保留最近 50 条
  if (history.recentTrades.length > 50) {
    history.recentTrades = history.recentTrades.slice(-50);
  }
}

/**
 * 预测交易意图评分
 * 评分范围 [0, 1]，越高越可信
 * @param did Agent DID
 * @param request 当前交易请求
 * @returns 意图评分
 */
export function predictIntent(
  did: string,
  request: CreateOfferRequest
): number {
  const history = agentHistories.get(did);

  // 无历史记录的新 Agent，给予中等评分
  if (!history || history.recentTrades.length === 0) {
    return 0.5;
  }

  let score = 1.0;
  const now = Date.now();

  // === 因子1: 交易频率异常 ===
  // 交易过于频繁 → 可能是机器人攻击
  if (history.avgTradeInterval < 1000) {
    // 平均间隔小于1秒
    score *= 0.3;
  } else if (history.avgTradeInterval < 5000) {
    // 平均间隔小于5秒
    score *= 0.6;
  } else if (history.avgTradeInterval < 30000) {
    // 平均间隔小于30秒
    score *= 0.85;
  }

  // === 因子2: 最近短时间爆发交易 ===
  const recentWindow = 60000; // 1分钟窗口
  const recentCount = history.recentTrades.filter(
    t => now - t.timestamp < recentWindow
  ).length;
  if (recentCount > 20) {
    score *= 0.2; // 1分钟超过20笔
  } else if (recentCount > 10) {
    score *= 0.5;
  } else if (recentCount > 5) {
    score *= 0.8;
  }

  // === 因子3: 交易模式一致性 ===
  // 如果一直交易相同类型对，可能是正常行为
  const sameTypeCount = history.recentTrades.filter(
    t => t.offerTokenType === request.offerTokenType && t.reqTokenType === request.reqTokenType
  ).length;
  const typeConsistency = history.recentTrades.length > 0
    ? sameTypeCount / history.recentTrades.length
    : 0;
  // 适度的模式一致性是好的，但过度一致性(>0.9)可能可疑
  if (typeConsistency > 0.9) {
    score *= 0.7;
  } else if (typeConsistency > 0.5) {
    score *= 0.95;
  }

  // === 因子4: 金额合理性 ===
  const avgAmount = history.recentTrades.reduce((s, t) => s + t.amount, 0) / history.recentTrades.length;
  const amountRatio = avgAmount > 0 ? request.offerAmount / avgAmount : 1;
  // 金额偏差超过10倍可能异常
  if (amountRatio > 10 || amountRatio < 0.1) {
    score *= 0.5;
  } else if (amountRatio > 5 || amountRatio < 0.2) {
    score *= 0.7;
  }

  return Math.max(Math.min(score, 1), 0);
}

/**
 * 判断意图评分是否低于阈值
 * @param score 意图评分
 * @returns 是否低于阈值
 */
export function isIntentSuspicious(score: number): boolean {
  return score < INTENT_THRESHOLD;
}

/**
 * 获取 Agent 的意图画像
 * @param did Agent DID
 * @returns 意图画像
 */
export function getIntentProfile(did: string): {
  tradeCount: number;
  avgInterval: number;
  recentActivity: number;
} | null {
  const history = agentHistories.get(did);
  if (!history) return null;

  const now = Date.now();
  return {
    tradeCount: history.recentTrades.length,
    avgInterval: history.avgTradeInterval,
    recentActivity: history.recentTrades.filter(t => now - t.timestamp < 300000).length,
  };
}

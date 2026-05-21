/**
 * Offer Activity 处理器
 * 处理创建和广播 Offer 的联邦逻辑
 */

import type {
  CreateOfferRequest,
  OfferActivity,
  CreateOfferResponse,
  PhiGatewayResult,
} from '../types/atex.types';
import { OfferStatus, PhiGatewayLevel } from '../types/atex.types';
import { createOfferActivity } from './activityPubAdapter';
import { broadcastToPeers } from './liuRouter';
import { recordTradeIntent } from '../gateway/intentPredictor';
import { recordPhaseTransaction } from '../gateway/antiPhaseDetector';

/** Offer Activity 处理结果 */
export interface OfferActivityResult {
  activity: OfferActivity;
  broadcastPeers: number;
  activityId: string;
}

/**
 * 处理 Offer 创建的联邦逻辑
 * 1. 封装 Offer Activity
 * 2. 记录意图和相位
 * 3. 广播到联邦网络
 * @param offerId 已创建的 Offer ID
 * @param request 创建请求
 * @param gatewayResult Φ-Gateway 决策结果
 * @param phiDiff Φ 值相位差
 * @returns OfferActivityResult
 */
export function processOfferActivity(
  offerId: string,
  request: CreateOfferRequest,
  gatewayResult: PhiGatewayResult,
  phiDiff: number
): OfferActivityResult {
  // 1. 记录交易意图 (用于后续意图预测)
  recordTradeIntent(request.offererDid, request);

  // 2. 记录相位交易 (用于反相位检测)
  recordPhaseTransaction(request.offererDid, phiDiff);

  // 3. 封装为 ActivityPub Offer Activity
  const activity = createOfferActivity(offerId, request.offererDid, request, phiDiff);

  // 4. 广播到联邦网络
  const broadcastPeers = broadcastToPeers(request.offererDid, activity);

  return {
    activity,
    broadcastPeers,
    activityId: activity.id,
  };
}

/**
 * 验证 Offer Activity 数据
 * @param request 创建请求
 * @returns 验证结果
 */
export function validateOfferRequest(request: CreateOfferRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // DID 格式检查
  if (!request.offererDid || request.offererDid.length < 10) {
    errors.push('offererDid 格式无效');
  }

  // Token 类型检查
  const validTypes = ['CALC', 'WIT', 'WORD', 'PASS'];
  if (!validTypes.includes(request.offerTokenType)) {
    errors.push(`offerTokenType 无效: ${request.offerTokenType}`);
  }
  if (!validTypes.includes(request.reqTokenType)) {
    errors.push(`reqTokenType 无效: ${request.reqTokenType}`);
  }

  // 数量检查
  if (request.offerAmount <= 0) {
    errors.push('offerAmount 必须大于 0');
  }
  if (request.reqAmount <= 0) {
    errors.push('reqAmount 必须大于 0');
  }

  // 不能同类交易
  if (request.offerTokenType === request.reqTokenType) {
    errors.push('offerTokenType 和 reqTokenType 不能相同');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

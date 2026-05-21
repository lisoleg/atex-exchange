/**
 * Accept Activity 处理器
 * 处理接受 Offer 的联邦逻辑
 */

import type {
  OfferInfo,
  AcceptActivity,
  AcceptOfferResponse,
  TransactionType,
} from '../types/atex.types';
import { OfferStatus } from '../types/atex.types';
import { createAcceptActivity } from './activityPubAdapter';
import { broadcastToPeers } from './liuRouter';
import { recordPhaseTransaction } from '../gateway/antiPhaseDetector';

/** Accept Activity 处理结果 */
export interface AcceptActivityResult {
  activity: AcceptActivity;
  broadcastPeers: number;
  response: AcceptOfferResponse;
}

/**
 * 处理 Accept 的联邦逻辑
 * @param offer 已接受的 Offer
 * @param receiverDid 接受方 DID
 * @param aliceTokenId Alice 获得的 Token ID
 * @param bobTokenId Bob 获得的 Token ID
 * @param transactionType 交易类型
 * @param phiDiff Φ 值相位差
 * @returns AcceptActivityResult
 */
export function processAcceptActivity(
  offer: OfferInfo,
  receiverDid: string,
  aliceTokenId: string,
  bobTokenId: string,
  transactionType: TransactionType,
  phiDiff: number
): AcceptActivityResult {
  // 1. 记录相位交易
  recordPhaseTransaction(receiverDid, phiDiff);

  // 2. 封装为 ActivityPub Accept Activity
  const activity = createAcceptActivity(
    offer.activityId || '',
    receiverDid,
    {
      aliceTokenId,
      bobTokenId,
      transactionType,
    }
  );

  // 3. 广播到联邦网络
  const broadcastPeers = broadcastToPeers(receiverDid, activity);

  // 4. 构造响应
  const response: AcceptOfferResponse = {
    offerId: offer.id,
    status: OfferStatus.SETTLED,
    transactionType,
    aliceTokenId,
    bobTokenId,
  };

  return {
    activity,
    broadcastPeers,
    response,
  };
}

/**
 * 验证 Accept 请求
 * @param offer 当前 Offer
 * @param receiverDid 接受方 DID
 * @returns 验证结果
 */
export function validateAcceptRequest(
  offer: OfferInfo,
  receiverDid: string
): { valid: boolean; error?: string } {
  if (!receiverDid || receiverDid.length < 10) {
    return { valid: false, error: 'receiverDid 格式无效' };
  }

  if (offer.status !== OfferStatus.OPEN) {
    return { valid: false, error: `Offer 状态不是 OPEN: ${offer.status}` };
  }

  if (offer.expiresAt < new Date()) {
    return { valid: false, error: 'Offer 已过期' };
  }

  // 如果 Offer 指定了接收方，必须匹配
  if (offer.receiverDid && offer.receiverDid !== receiverDid) {
    return { valid: false, error: 'Offer 接收方不匹配' };
  }

  return { valid: true };
}

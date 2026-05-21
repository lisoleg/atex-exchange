/**
 * ActivityPub 消息适配器
 * 将 ATEX 交易操作封装为 ActivityPub Activity 格式
 * 支持联邦广播和跨实例交易
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ActivityPubActivity,
  OfferActivity,
  AcceptActivity,
  CreateOfferRequest,
  TransactionType,
  TokenType,
} from '../types/atex.types';

/** ActivityPub 上下文 */
const ACTIVITY_CONTEXT = [
  'https://www.w3.org/ns/activitystreams',
  'https://atex.sigma-cloud/ns',
];

/** 本实例基础 URL */
const BASE_URL = 'http://localhost:3001';

/**
 * 封装 Offer 为 ActivityPub Offer Activity
 * @param offerId Offer ID
 * @param offererDid 发起方 DID
 * @param request 创建请求
 * @param phiDiff Φ 值相位差
 * @returns OfferActivity
 */
export function createOfferActivity(
  offerId: string,
  offererDid: string,
  request: CreateOfferRequest,
  phiDiff: number
): OfferActivity {
  const activityId = `${BASE_URL}/activities/${offerId}`;

  return {
    '@context': ACTIVITY_CONTEXT,
    id: activityId,
    type: 'Offer',
    actor: `${BASE_URL}/actors/${encodeURIComponent(offererDid)}`,
    object: {
      type: 'TokenExchange',
      offerTokenType: request.offerTokenType,
      offerAmount: request.offerAmount,
      reqTokenType: request.reqTokenType,
      reqAmount: request.reqAmount,
      phiDiff,
    },
    target: request.receiverDid
      ? `${BASE_URL}/actors/${encodeURIComponent(request.receiverDid)}`
      : undefined,
    published: new Date().toISOString(),
  };
}

/**
 * 封装 Accept 为 ActivityPub Accept Activity
 * @param offerActivityId 原 Offer Activity ID
 * @param receiverDid 接受方 DID
 * @param result 交易结果
 * @returns AcceptActivity
 */
export function createAcceptActivity(
  offerActivityId: string,
  receiverDid: string,
  result?: {
    aliceTokenId: string;
    bobTokenId: string;
    transactionType: TransactionType;
  }
): AcceptActivity {
  const activityId = `${BASE_URL}/activities/accept/${uuidv4()}`;

  return {
    '@context': ACTIVITY_CONTEXT,
    id: activityId,
    type: 'Accept',
    actor: `${BASE_URL}/actors/${encodeURIComponent(receiverDid)}`,
    object: offerActivityId,
    result: result ? {
      aliceTokenId: result.aliceTokenId,
      bobTokenId: result.bobTokenId,
      transactionType: result.transactionType,
    } : undefined,
    published: new Date().toISOString(),
  };
}

/**
 * 封装 Cancel 为 ActivityPub Undo Activity
 * @param offerActivityId 原 Offer Activity ID
 * @param offererDid 取消方 DID
 * @returns ActivityPubActivity
 */
export function createCancelActivity(
  offerActivityId: string,
  offererDid: string
): ActivityPubActivity {
  const activityId = `${BASE_URL}/activities/cancel/${uuidv4()}`;

  return {
    '@context': ACTIVITY_CONTEXT,
    id: activityId,
    type: 'Undo',
    actor: `${BASE_URL}/actors/${encodeURIComponent(offererDid)}`,
    object: offerActivityId,
    published: new Date().toISOString(),
  };
}

/**
 * 解析收到的 ActivityPub Activity
 * @param activity 原始 Activity
 * @returns 解析后的结构化数据
 */
export function parseIncomingActivity(activity: ActivityPubActivity): {
  type: string;
  actorDid: string;
  objectId?: string;
  timestamp: Date;
} {
  // 从 actor URL 提取 DID
  const actorDid = extractDidFromUrl(activity.actor);
  const objectId = typeof activity.object === 'string'
    ? activity.object
    : undefined;

  return {
    type: activity.type,
    actorDid,
    objectId,
    timestamp: new Date(activity.published),
  };
}

/**
 * 从 Actor URL 提取 DID
 * @param url Actor URL
 * @returns DID 字符串
 */
function extractDidFromUrl(url: string): string {
  // URL 格式: http://host/actors/did:atex:alice
  const parts = url.split('/actors/');
  if (parts.length > 1) {
    return decodeURIComponent(parts[parts.length - 1]);
  }
  return url;
}

/**
 * 验证 Activity 格式
 * @param activity Activity 对象
 * @returns 是否有效
 */
export function validateActivity(activity: Partial<ActivityPubActivity>): boolean {
  if (!activity.type) return false;
  if (!activity.actor) return false;
  if (!activity.published) return false;
  return true;
}

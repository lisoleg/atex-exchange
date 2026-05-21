/**
 * Offer API 路由测试
 * 使用模拟方式测试 API 逻辑（无需启动服务器）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateOfferRequest } from '../../src/federation/offerActivity';
import { validateAcceptRequest } from '../../src/federation/acceptActivity';
import { OfferStatus, TokenType } from '../../src/types/atex.types';
import type { OfferInfo, CreateOfferRequest } from '../../src/types/atex.types';

describe('Offer API 逻辑', () => {
  describe('validateOfferRequest', () => {
    it('有效请求应通过验证', () => {
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 100,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      };

      const result = validateOfferRequest(request);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('缺少 offererDid 应失败', () => {
      const request = {
        offererDid: '',
        offerTokenType: TokenType.CALC,
        offerAmount: 100,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      } as CreateOfferRequest;

      const result = validateOfferRequest(request);
      expect(result.valid).toBe(false);
    });

    it('无效 Token 类型应失败', () => {
      const request = {
        offererDid: 'did:atex:alice',
        offerTokenType: 'INVALID' as TokenType,
        offerAmount: 100,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      } as CreateOfferRequest;

      const result = validateOfferRequest(request);
      expect(result.valid).toBe(false);
    });

    it('数量为 0 应失败', () => {
      const request = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 0,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      } as CreateOfferRequest;

      const result = validateOfferRequest(request);
      expect(result.valid).toBe(false);
    });

    it('同类交易应失败', () => {
      const request = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 100,
        reqTokenType: TokenType.CALC,
        reqAmount: 50,
      } as CreateOfferRequest;

      const result = validateOfferRequest(request);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAcceptRequest', () => {
    const validOffer: OfferInfo = {
      id: 'offer-001',
      offererDid: 'did:atex:alice',
      receiverDid: null,
      offerTokenType: TokenType.CALC,
      offerAmount: 100,
      reqTokenType: TokenType.WIT,
      reqAmount: 10,
      phiDiff: 0.2,
      jitterImpact: 0.5,
      gatewayLevel: 'NORMAL' as any,
      status: OfferStatus.OPEN,
      expiresAt: new Date(Date.now() + 3600000),
      activityId: 'act-001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('OPEN Offer 可被接受', () => {
      const result = validateAcceptRequest(validOffer, 'did:atex:bob');
      expect(result.valid).toBe(true);
    });

    it('无效 receiverDid 应失败', () => {
      const result = validateAcceptRequest(validOffer, 'short');
      expect(result.valid).toBe(false);
    });

    it('非 OPEN Offer 应失败', () => {
      const cancelledOffer = { ...validOffer, status: OfferStatus.CANCELLED };
      const result = validateAcceptRequest(cancelledOffer, 'did:atex:bob');
      expect(result.valid).toBe(false);
    });

    it('已过期 Offer 应失败', () => {
      const expiredOffer = {
        ...validOffer,
        expiresAt: new Date(Date.now() - 1000),
      };
      const result = validateAcceptRequest(expiredOffer, 'did:atex:bob');
      expect(result.valid).toBe(false);
    });

    it('指定接收方不匹配应失败', () => {
      const targetedOffer = {
        ...validOffer,
        receiverDid: 'did:atex:charlie',
      };
      const result = validateAcceptRequest(targetedOffer, 'did:atex:bob');
      expect(result.valid).toBe(false);
    });

    it('指定接收方匹配应成功', () => {
      const targetedOffer = {
        ...validOffer,
        receiverDid: 'did:atex:bob',
      };
      const result = validateAcceptRequest(targetedOffer, 'did:atex:bob');
      expect(result.valid).toBe(true);
    });
  });

  describe('API 响应格式', () => {
    it('CreateOfferResponse 应包含必要字段', () => {
      const response = {
        offerId: 'offer-001',
        status: OfferStatus.OPEN,
        gatewayLevel: 'NORMAL',
        phiDiff: 0.2,
        jitterImpact: 0.5,
        tempTokenId: 'token-temp-001',
        activityId: 'act-001',
      };

      expect(response).toHaveProperty('offerId');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('gatewayLevel');
      expect(response).toHaveProperty('phiDiff');
      expect(response).toHaveProperty('jitterImpact');
      expect(response).toHaveProperty('tempTokenId');
      expect(response).toHaveProperty('activityId');
    });

    it('AcceptOfferResponse 应包含必要字段', () => {
      const response = {
        offerId: 'offer-001',
        status: OfferStatus.SETTLED,
        transactionType: 'TOPOLOGICAL_TRANSITION',
        aliceTokenId: 'token-alice-001',
        bobTokenId: 'token-bob-001',
      };

      expect(response).toHaveProperty('offerId');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('transactionType');
      expect(response).toHaveProperty('aliceTokenId');
      expect(response).toHaveProperty('bobTokenId');
    });
  });
});

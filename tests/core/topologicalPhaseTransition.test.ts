/**
 * 拓扑相变算法测试
 */

import { describe, it, expect } from 'vitest';
import {
  topologicalPhaseTransition,
  validateAcceptOffer,
} from '../../src/core/topologicalPhaseTransition';
import { TokenType, TokenStatus, OfferStatus, TransactionType } from '../../src/types/atex.types';
import type { OfferInfo, TokenInfo, PhiValue } from '../../src/types/atex.types';

/** 构造测试用 Offer */
function makeOffer(overrides?: Partial<OfferInfo>): OfferInfo {
  return {
    id: 'offer-test-001',
    offererDid: 'did:atex:alice',
    receiverDid: 'did:atex:bob',
    offerTokenType: TokenType.CALC,
    offerAmount: 100,
    reqTokenType: TokenType.WIT,
    reqAmount: 10,
    phiDiff: Math.PI / 8,
    jitterImpact: 0.5,
    gatewayLevel: 'NORMAL' as any,
    status: OfferStatus.OPEN,
    expiresAt: new Date(Date.now() + 3600000),
    activityId: 'activity-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** 构造测试用 Token */
function makeToken(type: TokenType, amount: number, status: TokenStatus = TokenStatus.ISSUED): TokenInfo {
  return {
    id: `token-${type}-${amount}-${status}`,
    type,
    status,
    amount,
    phi: { magnitude: 1, phase: 0 },
    ownerDid: 'did:atex:alice',
    offerId: status === TokenStatus.ISSUED ? 'offer-test-001' : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('拓扑相变算法', () => {
  describe('topologicalPhaseTransition', () => {
    it('Φ 匹配时应该成功执行拓扑相变', () => {
      const offer = makeOffer();
      // 两个相近的 Φ 值 (差 < π/4)
      const offererPhi: PhiValue = { magnitude: 1, phase: 0.1 };
      const receiverPhi: PhiValue = { magnitude: 1.2, phase: 0.2 };

      const tempTokens = [makeToken(TokenType.CALC, 100, TokenStatus.ISSUED)];
      const lockedTokens = [makeToken(TokenType.CALC, 100, TokenStatus.LOCKED)];

      const result = topologicalPhaseTransition(
        offer, offererPhi, receiverPhi, tempTokens, lockedTokens, 10000
      );

      expect(result.matched).toBe(true);
      expect(result.transactionType).toBe(TransactionType.TOPOLOGICAL_TRANSITION);
      expect(result.aliceTokenData).not.toBeNull();
      expect(result.bobTokenData).not.toBeNull();
      expect(result.tempTokenIds).toHaveLength(1);
      expect(result.recycleTokenIds).toHaveLength(1);
      expect(result.unlockTokenIds).toHaveLength(0);
      expect(result.phiMatchDetail.withinThreshold).toBe(true);
      expect(result.ouResult).not.toBeNull();
    });

    it('Φ 不匹配时应该执行相位松弛', () => {
      const offer = makeOffer();
      // 两个远离的 Φ 值 (差 > π/4)
      const offererPhi: PhiValue = { magnitude: 1, phase: 0 };
      const receiverPhi: PhiValue = { magnitude: 1, phase: Math.PI };

      const tempTokens = [makeToken(TokenType.CALC, 100, TokenStatus.ISSUED)];
      const lockedTokens = [makeToken(TokenType.CALC, 100, TokenStatus.LOCKED)];

      const result = topologicalPhaseTransition(
        offer, offererPhi, receiverPhi, tempTokens, lockedTokens, 10000
      );

      expect(result.matched).toBe(false);
      expect(result.transactionType).toBe(TransactionType.PHASE_RELAXATION);
      expect(result.aliceTokenData).toBeNull();
      expect(result.bobTokenData).toBeNull();
      expect(result.tempTokenIds).toHaveLength(1);
      expect(result.unlockTokenIds).toHaveLength(1);
      expect(result.recycleTokenIds).toHaveLength(0);
      expect(result.phiMatchDetail.withinThreshold).toBe(false);
    });

    it('Φ 匹配时应创建新 Token', () => {
      const offer = makeOffer();
      const offererPhi: PhiValue = { magnitude: 1, phase: 0 };
      const receiverPhi: PhiValue = { magnitude: 1, phase: 0.1 };

      const result = topologicalPhaseTransition(
        offer, offererPhi, receiverPhi, [], [], 10000
      );

      if (result.matched) {
        expect(result.aliceTokenData!.status).toBe(TokenStatus.ACTIVE);
        expect(result.bobTokenData!.status).toBe(TokenStatus.ACTIVE);
      }
    });

    it('应该正确记录 Φ 匹配详情', () => {
      const offer = makeOffer();
      const offererPhi: PhiValue = { magnitude: 1, phase: 0 };
      const receiverPhi: PhiValue = { magnitude: 1, phase: 0.5 };

      const result = topologicalPhaseTransition(
        offer, offererPhi, receiverPhi, [], [], 10000
      );

      expect(result.phiMatchDetail.phaseDiff).toBeDefined();
      expect(result.phiMatchDetail.threshold).toBe(Math.PI / 4);
      expect(typeof result.phiMatchDetail.withinThreshold).toBe('boolean');
    });
  });

  describe('validateAcceptOffer', () => {
    it('OPEN 且未过期的 Offer 可接受', () => {
      const offer = makeOffer({
        status: OfferStatus.OPEN,
        expiresAt: new Date(Date.now() + 3600000),
      });
      const result = validateAcceptOffer(offer);
      expect(result.valid).toBe(true);
    });

    it('已接受的 Offer 不可再接受', () => {
      const offer = makeOffer({ status: OfferStatus.ACCEPTED });
      const result = validateAcceptOffer(offer);
      expect(result.valid).toBe(false);
    });

    it('已取消的 Offer 不可接受', () => {
      const offer = makeOffer({ status: OfferStatus.CANCELLED });
      const result = validateAcceptOffer(offer);
      expect(result.valid).toBe(false);
    });

    it('已过期的 Offer 不可接受', () => {
      const offer = makeOffer({
        status: OfferStatus.OPEN,
        expiresAt: new Date(Date.now() - 1000),
      });
      const result = validateAcceptOffer(offer);
      expect(result.valid).toBe(false);
    });

    it('已结算的 Offer 不可接受', () => {
      const offer = makeOffer({ status: OfferStatus.SETTLED });
      const result = validateAcceptOffer(offer);
      expect(result.valid).toBe(false);
    });
  });
});

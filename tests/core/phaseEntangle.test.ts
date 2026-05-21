/**
 * 相位缠绕算法测试
 */

import { describe, it, expect } from 'vitest';
import {
  phaseEntangle,
  calculateAvailableBalance,
  validateOfferBalance,
} from '../../src/core/phaseEntangle';
import { TokenType, TokenStatus } from '../../src/types/atex.types';
import type { CreateOfferRequest, TokenInfo, PhiValue } from '../../src/types/atex.types';

/** 构造测试用 Token */
function makeToken(type: TokenType, amount: number, status: TokenStatus = TokenStatus.ACTIVE): TokenInfo {
  return {
    id: `token-${type}-${amount}`,
    type,
    status,
    amount,
    phi: { magnitude: 1, phase: 0 },
    ownerDid: 'did:atex:alice',
    offerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('相位缠绕算法', () => {
  const offererPhi: PhiValue = { magnitude: 1.5, phase: Math.PI / 6 };

  describe('phaseEntangle', () => {
    it('应该创建临时 Token (Issued 状态)', () => {
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 100,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      };

      const tokens: TokenInfo[] = [
        makeToken(TokenType.CALC, 200),
        makeToken(TokenType.WIT, 50),
      ];

      const result = phaseEntangle(request, offererPhi, tokens);

      expect(result.tempTokenData.status).toBe(TokenStatus.ISSUED);
      expect(result.tempTokenData.type).toBe(TokenType.CALC);
      expect(result.tempTokenData.amount).toBe(100);
      expect(result.lockedStatus).toBe(TokenStatus.LOCKED);
    });

    it('应该计算 Φ 值相位差', () => {
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 100,
        reqTokenType: TokenType.PASS,
        reqAmount: 5,
      };

      const result = phaseEntangle(request, offererPhi, [makeToken(TokenType.CALC, 500)]);

      expect(typeof result.phiDiff).toBe('number');
      expect(isFinite(result.phiDiff)).toBe(true);
    });

    it('应该计算动态价格', () => {
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.WIT,
        offerAmount: 10,
        reqTokenType: TokenType.CALC,
        reqAmount: 100,
      };

      const result = phaseEntangle(request, offererPhi, [makeToken(TokenType.WIT, 50)]);

      expect(result.dynamicPrice).toBeGreaterThan(0);
    });

    it('应该计算 Jitter 滑点', () => {
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.WORD,
        offerAmount: 500,
        reqTokenType: TokenType.PASS,
        reqAmount: 2,
      };

      const result = phaseEntangle(request, offererPhi, [makeToken(TokenType.WORD, 1000)]);

      expect(result.jitterResult.jitter).toBeGreaterThanOrEqual(0);
      expect(result.jitterResult.slippage).toBeGreaterThanOrEqual(0);
      expect(result.jitterResult.impact).toBeGreaterThanOrEqual(0);
    });

    it('应该估算请求 Token 的 Φ 值', () => {
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 100,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      };

      const result = phaseEntangle(request, offererPhi, [makeToken(TokenType.CALC, 500)]);

      expect(result.requestedPhiEstimate.magnitude).toBeGreaterThan(0);
    });
  });

  describe('calculateAvailableBalance', () => {
    it('应该正确计算可用余额', () => {
      const tokens: TokenInfo[] = [
        makeToken(TokenType.CALC, 100),
        makeToken(TokenType.CALC, 200),
        makeToken(TokenType.WIT, 50),
      ];

      const balance = calculateAvailableBalance(tokens, TokenType.CALC);
      expect(balance).toBe(300);
    });

    it('LOCKED Token 不应计入', () => {
      const tokens: TokenInfo[] = [
        makeToken(TokenType.CALC, 100),
        makeToken(TokenType.CALC, 200, TokenStatus.LOCKED),
      ];

      const balance = calculateAvailableBalance(tokens, TokenType.CALC);
      expect(balance).toBe(100);
    });

    it('无匹配 Token 余额为 0', () => {
      const tokens: TokenInfo[] = [
        makeToken(TokenType.WIT, 100),
      ];

      const balance = calculateAvailableBalance(tokens, TokenType.CALC);
      expect(balance).toBe(0);
    });
  });

  describe('validateOfferBalance', () => {
    it('余额充足应返回 true', () => {
      const tokens: TokenInfo[] = [makeToken(TokenType.CALC, 500)];
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 100,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      };

      expect(validateOfferBalance(tokens, request)).toBe(true);
    });

    it('余额不足应返回 false', () => {
      const tokens: TokenInfo[] = [makeToken(TokenType.CALC, 50)];
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 100,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      };

      expect(validateOfferBalance(tokens, request)).toBe(false);
    });

    it('无对应 Token 应返回 false', () => {
      const tokens: TokenInfo[] = [makeToken(TokenType.WIT, 100)];
      const request: CreateOfferRequest = {
        offererDid: 'did:atex:alice',
        offerTokenType: TokenType.CALC,
        offerAmount: 50,
        reqTokenType: TokenType.WIT,
        reqAmount: 10,
      };

      expect(validateOfferBalance(tokens, request)).toBe(false);
    });
  });
});

/**
 * Token 生命周期状态机测试
 */

import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  transitionTokenStatus,
  isTradeable,
  isTemporary,
  isTerminal,
  getNextStates,
  createTokenInitData,
  lockToken,
  unlockToken,
  settleToken,
  recycleToken,
  consumeTempToken,
} from '../../src/core/tokenLifecycle';
import { TokenStatus, TokenType } from '../../src/types/atex.types';

describe('Token 生命周期状态机', () => {
  describe('isValidTransition', () => {
    it('NULL → ISSUED 合法', () => {
      expect(isValidTransition(TokenStatus.NULL, TokenStatus.ISSUED)).toBe(true);
    });

    it('ISSUED → ACTIVE 合法', () => {
      expect(isValidTransition(TokenStatus.ISSUED, TokenStatus.ACTIVE)).toBe(true);
    });

    it('ACTIVE → LOCKED 合法', () => {
      expect(isValidTransition(TokenStatus.ACTIVE, TokenStatus.LOCKED)).toBe(true);
    });

    it('LOCKED → SETTLED 合法', () => {
      expect(isValidTransition(TokenStatus.LOCKED, TokenStatus.SETTLED)).toBe(true);
    });

    it('SETTLED → RECYCLED 合法', () => {
      expect(isValidTransition(TokenStatus.SETTLED, TokenStatus.RECYCLED)).toBe(true);
    });

    it('RECYCLED → 任意 不合法 (终态)', () => {
      expect(isValidTransition(TokenStatus.RECYCLED, TokenStatus.ACTIVE)).toBe(false);
      expect(isValidTransition(TokenStatus.RECYCLED, TokenStatus.ISSUED)).toBe(false);
    });

    it('NULL → ACTIVE 不合法 (需先 ISSUED)', () => {
      expect(isValidTransition(TokenStatus.NULL, TokenStatus.ACTIVE)).toBe(false);
    });

    it('ACTIVE → ISSUED 不合法', () => {
      expect(isValidTransition(TokenStatus.ACTIVE, TokenStatus.ISSUED)).toBe(false);
    });
  });

  describe('transitionTokenStatus', () => {
    it('合法转换应返回新状态', () => {
      const result = transitionTokenStatus(TokenStatus.NULL, TokenStatus.ISSUED);
      expect(result).toBe(TokenStatus.ISSUED);
    });

    it('非法转换应抛出错误', () => {
      expect(() => {
        transitionTokenStatus(TokenStatus.ACTIVE, TokenStatus.ISSUED);
      }).toThrow();
    });
  });

  describe('isTradeable', () => {
    it('ACTIVE 可交易', () => {
      expect(isTradeable(TokenStatus.ACTIVE)).toBe(true);
    });

    it('LOCKED 不可交易', () => {
      expect(isTradeable(TokenStatus.LOCKED)).toBe(false);
    });

    it('ISSUED 不可交易', () => {
      expect(isTradeable(TokenStatus.ISSUED)).toBe(false);
    });
  });

  describe('isTemporary', () => {
    it('ISSUED 是临时状态', () => {
      expect(isTemporary(TokenStatus.ISSUED)).toBe(true);
    });

    it('ACTIVE 不是临时状态', () => {
      expect(isTemporary(TokenStatus.ACTIVE)).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('RECYCLED 是终态', () => {
      expect(isTerminal(TokenStatus.RECYCLED)).toBe(true);
    });

    it('ACTIVE 不是终态', () => {
      expect(isTerminal(TokenStatus.ACTIVE)).toBe(false);
    });
  });

  describe('getNextStates', () => {
    it('RECYCLED 无下一状态', () => {
      expect(getNextStates(TokenStatus.RECYCLED)).toEqual([]);
    });

    it('ACTIVE 有多个下一状态', () => {
      const next = getNextStates(TokenStatus.ACTIVE);
      expect(next).toContain(TokenStatus.LOCKED);
      expect(next).toContain(TokenStatus.CONSUMED);
      expect(next).toContain(TokenStatus.RECYCLED);
    });
  });

  describe('便捷函数', () => {
    it('lockToken: ACTIVE → LOCKED', () => {
      expect(lockToken(TokenStatus.ACTIVE)).toBe(TokenStatus.LOCKED);
    });

    it('unlockToken: LOCKED → ACTIVE', () => {
      expect(unlockToken(TokenStatus.LOCKED)).toBe(TokenStatus.ACTIVE);
    });

    it('settleToken: LOCKED → SETTLED', () => {
      expect(settleToken(TokenStatus.LOCKED)).toBe(TokenStatus.SETTLED);
    });

    it('recycleToken: SETTLED → RECYCLED', () => {
      expect(recycleToken(TokenStatus.SETTLED)).toBe(TokenStatus.RECYCLED);
    });

    it('consumeTempToken: ISSUED → CONSUMED', () => {
      expect(consumeTempToken(TokenStatus.ISSUED)).toBe(TokenStatus.CONSUMED);
    });
  });

  describe('createTokenInitData', () => {
    it('创建活跃 Token', () => {
      const data = createTokenInitData(TokenType.CALC, 100, 'did:atex:alice', 1.0, 0);
      expect(data.type).toBe(TokenType.CALC);
      expect(data.amount).toBe(100);
      expect(data.status).toBe(TokenStatus.ACTIVE);
      expect(data.ownerDid).toBe('did:atex:alice');
    });

    it('创建临时 Token', () => {
      const data = createTokenInitData(TokenType.WIT, 50, 'did:atex:bob', 1.5, Math.PI / 6, true, 'offer-123');
      expect(data.status).toBe(TokenStatus.ISSUED);
      expect(data.offerId).toBe('offer-123');
    });
  });

  describe('完整生命周期路径', () => {
    it('路径1: NULL → ISSUED → ACTIVE → LOCKED → SETTLED → RECYCLED', () => {
      let status = TokenStatus.NULL;
      status = transitionTokenStatus(status, TokenStatus.ISSUED);
      expect(status).toBe(TokenStatus.ISSUED);

      status = transitionTokenStatus(status, TokenStatus.ACTIVE);
      expect(status).toBe(TokenStatus.ACTIVE);

      status = transitionTokenStatus(status, TokenStatus.LOCKED);
      expect(status).toBe(TokenStatus.LOCKED);

      status = transitionTokenStatus(status, TokenStatus.SETTLED);
      expect(status).toBe(TokenStatus.SETTLED);

      status = transitionTokenStatus(status, TokenStatus.RECYCLED);
      expect(status).toBe(TokenStatus.RECYCLED);
    });

    it('路径2: NULL → ISSUED → CONSUMED → RECYCLED (临时Token销毁)', () => {
      let status = TokenStatus.NULL;
      status = transitionTokenStatus(status, TokenStatus.ISSUED);
      status = transitionTokenStatus(status, TokenStatus.CONSUMED);
      status = transitionTokenStatus(status, TokenStatus.RECYCLED);
      expect(status).toBe(TokenStatus.RECYCLED);
    });

    it('路径3: ACTIVE → LOCKED → ACTIVE (交易取消)', () => {
      let status = TokenStatus.ACTIVE;
      status = transitionTokenStatus(status, TokenStatus.LOCKED);
      status = transitionTokenStatus(status, TokenStatus.ACTIVE);
      expect(status).toBe(TokenStatus.ACTIVE);
    });
  });
});

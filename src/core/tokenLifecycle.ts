/**
 * Token 生命周期状态机
 * NULL → ISSUED → ACTIVE → LOCKED → CONSUMED / SETTLED → RECYCLED
 * 实现 Token 的完整状态转换逻辑
 */

import { TokenStatus, TokenType } from '../types/atex.types';
import { ERROR_CODES } from '../config/atex.config';

/** 合法状态转换映射 */
const VALID_TRANSITIONS: Record<TokenStatus, TokenStatus[]> = {
  [TokenStatus.NULL]: [TokenStatus.ISSUED],
  [TokenStatus.ISSUED]: [TokenStatus.ACTIVE, TokenStatus.CONSUMED, TokenStatus.RECYCLED],
  [TokenStatus.ACTIVE]: [TokenStatus.LOCKED, TokenStatus.CONSUMED, TokenStatus.RECYCLED],
  [TokenStatus.LOCKED]: [TokenStatus.ACTIVE, TokenStatus.SETTLED, TokenStatus.RECYCLED],
  [TokenStatus.CONSUMED]: [TokenStatus.RECYCLED],
  [TokenStatus.SETTLED]: [TokenStatus.RECYCLED],
  [TokenStatus.RECYCLED]: [], // 终态
};

/**
 * 验证状态转换是否合法
 * @param from 当前状态
 * @param to 目标状态
 * @returns 是否合法
 */
export function isValidTransition(from: TokenStatus, to: TokenStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * 执行状态转换
 * @param from 当前状态
 * @param to 目标状态
 * @returns 新状态
 * @throws Error 如果转换不合法
 */
export function transitionTokenStatus(from: TokenStatus, to: TokenStatus): TokenStatus {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `${ERROR_CODES.ATEX_003}: Token 状态转换非法 ${from} → ${to}`
    );
  }
  return to;
}

/**
 * 判断 Token 是否可用于交易
 * 只有 ACTIVE 状态的 Token 可被锁定进入交易
 * @param status Token 状态
 * @returns 是否可交易
 */
export function isTradeable(status: TokenStatus): boolean {
  return status === TokenStatus.ACTIVE;
}

/**
 * 判断 Token 是否为临时状态
 * ISSUED 状态为缠绕中的临时 Token
 * @param status Token 状态
 * @returns 是否临时
 */
export function isTemporary(status: TokenStatus): boolean {
  return status === TokenStatus.ISSUED;
}

/**
 * 判断 Token 是否为终态
 * RECYCLED 为终态，不可再转换
 * @param status Token 状态
 * @returns 是否终态
 */
export function isTerminal(status: TokenStatus): boolean {
  return status === TokenStatus.RECYCLED;
}

/**
 * 获取 Token 的下一个可能状态列表
 * @param currentStatus 当前状态
 * @returns 可转换的状态列表
 */
export function getNextStates(currentStatus: TokenStatus): TokenStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * 创建新 Token 的初始状态数据
 * @param type Token 类型
 * @param amount 数量
 * @param ownerDid 持有者 DID
 * @param phiMagnitude Φ 模长
 * @param phiPhase Φ 相位
 * @param isTemporary 是否为临时 Token (缠绕中)
 * @returns Token 创建数据
 */
export interface TokenCreateData {
  type: TokenType;
  status: TokenStatus;
  amount: number;
  phiMagnitude: number;
  phiPhase: number;
  ownerDid: string;
  offerId?: string;
}

export function createTokenInitData(
  type: TokenType,
  amount: number,
  ownerDid: string,
  phiMagnitude: number,
  phiPhase: number,
  isTemporary: boolean = false,
  offerId?: string
): TokenCreateData {
  return {
    type,
    status: isTemporary ? TokenStatus.ISSUED : TokenStatus.ACTIVE,
    amount,
    phiMagnitude,
    phiPhase,
    ownerDid,
    offerId: offerId || undefined,
  };
}

/**
 * 锁定 Token (进入交易)
 * ACTIVE → LOCKED
 * @param currentStatus 当前状态
 * @returns 锁定后状态
 */
export function lockToken(currentStatus: TokenStatus): TokenStatus {
  return transitionTokenStatus(currentStatus, TokenStatus.LOCKED);
}

/**
 * 解锁 Token (交易失败/取消)
 * LOCKED → ACTIVE
 * @param currentStatus 当前状态
 * @returns 解锁后状态
 */
export function unlockToken(currentStatus: TokenStatus): TokenStatus {
  return transitionTokenStatus(currentStatus, TokenStatus.ACTIVE);
}

/**
 * 结算 Token (交易成功)
 * LOCKED → SETTLED
 * @param currentStatus 当前状态
 * @returns 结算后状态
 */
export function settleToken(currentStatus: TokenStatus): TokenStatus {
  return transitionTokenStatus(currentStatus, TokenStatus.SETTLED);
}

/**
 * 回收 Token (流贯回收)
 * SETTLED/CONSUMED → RECYCLED
 * @param currentStatus 当前状态
 * @returns 回收后状态
 */
export function recycleToken(currentStatus: TokenStatus): TokenStatus {
  return transitionTokenStatus(currentStatus, TokenStatus.RECYCLED);
}

/**
 * 销毁临时 Token (相位松弛)
 * ISSUED → CONSUMED
 * @param currentStatus 当前状态
 * @returns 销毁后状态
 */
export function consumeTempToken(currentStatus: TokenStatus): TokenStatus {
  return transitionTokenStatus(currentStatus, TokenStatus.CONSUMED);
}

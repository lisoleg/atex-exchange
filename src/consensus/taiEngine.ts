/**
 * TAI (交易即发行) 引擎
 * 交易触发新 Token 生成而非转移
 * 结合 O-U 均值回归防止通胀
 */

import type {
  TAIResult,
  OfferInfo,
  OUMeanReversionResult,
  PhiValue,
  TokenInfo,
} from '../types/atex.types';
import { TokenType, TokenStatus, TransactionType } from '../types/atex.types';
import {
  evaluateOUMeanReversion,
  constrainedIssuance,
  calculateRecycleAmount,
} from '../math/ouMeanReversion';
import { TAI_SENSITIVITY, TAI_MAX_ISSUANCE, OU_MEAN_LEVEL } from '../config/atex.config';
import { createTokenInitData } from '../core/tokenLifecycle';

/**
 * 执行 TAI 发行流程
 * 交易即发行：成功交易创造新 Token 给双方
 * @param offer Offer 信息
 * @param offererPhi 提供方 Φ 值
 * @param receiverPhi 接收方 Φ 值
 * @param currentSupply 当前总供应量
 * @returns TAIResult 发行结果
 */
export function executeTAI(
  offer: OfferInfo,
  offererPhi: PhiValue,
  receiverPhi: PhiValue,
  currentSupply: number
): TAIResult {
  // 1. O-U 均值回归检查
  const ouCheck = evaluateOUMeanReversion(currentSupply);

  // 2. 计算受约束的发行量
  // Alice 获得请求类型的 Token
  const aliceIssuance = constrainedIssuance(
    currentSupply,
    offer.reqAmount,
    ouCheck.meanLevel,
    ouCheck.reversionSpeed
  );

  // Bob 获得提供类型的 Token
  const bobIssuance = constrainedIssuance(
    currentSupply + aliceIssuance,
    offer.offerAmount,
    ouCheck.meanLevel,
    ouCheck.reversionSpeed
  );

  // 3. TAI 敏感度调节
  const adjustedAliceAmount = taiSensitiveAdjustment(aliceIssuance);
  const adjustedBobAmount = taiSensitiveAdjustment(bobIssuance);

  // 4. 生成新 Token 数据
  const aliceTokenData = createTokenInitData(
    offer.reqTokenType,
    adjustedAliceAmount,
    offer.offererDid,
    receiverPhi.magnitude,
    receiverPhi.phase,
    false
  );

  const bobTokenData = createTokenInitData(
    offer.offerTokenType,
    adjustedBobAmount,
    offer.receiverDid || '',
    offererPhi.magnitude,
    offererPhi.phase,
    false
  );

  // 5. 计算供应量变化
  const supplyDelta = adjustedAliceAmount + adjustedBobAmount;

  return {
    newTokenIds: [], // 实际 ID 在数据库插入后生成
    destroyedTokenIds: [], // 临时 Token ID 传入
    recycledTokenIds: [], // 原始 Token ID 传入
    ouCheck,
    supplyDelta,
  };
}

/**
 * TAI 敏感度调节
 * 根据全局敏感度参数微调发行量
 * @param amount 原始发行量
 * @returns 调节后发行量
 */
function taiSensitiveAdjustment(amount: number): number {
  // 应用敏感度：发行量 = amount × (1 - sensitivity × random_factor)
  const factor = 1 - TAI_SENSITIVITY * (Math.random() * 2 - 1);
  const adjusted = amount * factor;
  // 不超过最大发行量
  return Math.min(Math.max(adjusted, 0), TAI_MAX_ISSUANCE);
}

/**
 * 执行流贯回收
 * 交易成功后，原始锁定 Token 被回收
 * @param lockedTokens 被锁定的 Token 列表
 * @param currentSupply 当前供应量
 * @returns 回收量和回收后供应量
 */
export function executeFlowRecycle(
  lockedTokens: TokenInfo[],
  currentSupply: number
): {
  recycledAmount: number;
  newSupply: number;
  recycleTokenIds: string[];
} {
  const recycledAmount = lockedTokens.reduce((sum, t) => sum + t.amount, 0);
  const recycleTokenIds = lockedTokens.map(t => t.id);
  const newSupply = currentSupply - recycledAmount;

  return {
    recycledAmount,
    newSupply: Math.max(newSupply, 0),
    recycleTokenIds,
  };
}

/**
 * 执行临时 Token 销毁
 * 相位松弛或交易完成后销毁临时 Token
 * @param tempTokens 临时 Token 列表
 * @returns 销毁的 Token ID 列表
 */
export function destroyTempTokens(tempTokens: TokenInfo[]): string[] {
  return tempTokens
    .filter(t => t.status === TokenStatus.ISSUED)
    .map(t => t.id);
}

/**
 * 综合执行交易即发行 + 回收流程
 * @param offer Offer 信息
 * @param offererPhi 提供方 Φ 值
 * @param receiverPhi 接收方 Φ 值
 * @param tempTokens 临时 Token 列表
 * @param lockedTokens 被锁定的原始 Token 列表
 * @param currentSupply 当前总供应量
 * @returns 完整的 TAI 结果
 */
export function executeFullTAI(
  offer: OfferInfo,
  offererPhi: PhiValue,
  receiverPhi: PhiValue,
  tempTokens: TokenInfo[],
  lockedTokens: TokenInfo[],
  currentSupply: number
): TAIResult {
  // 1. 执行 TAI 发行
  const taiResult = executeTAI(offer, offererPhi, receiverPhi, currentSupply);

  // 2. 销毁临时 Token
  const destroyedTokenIds = destroyTempTokens(tempTokens);

  // 3. 执行流贯回收
  const recycleResult = executeFlowRecycle(lockedTokens, currentSupply + taiResult.supplyDelta);

  return {
    newTokenIds: taiResult.newTokenIds,
    destroyedTokenIds,
    recycledTokenIds: recycleResult.recycleTokenIds,
    ouCheck: taiResult.ouCheck,
    supplyDelta: taiResult.supplyDelta - recycleResult.recycledAmount,
  };
}

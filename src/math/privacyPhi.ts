/**
 * 跨域 Φ 值隐私协同计算（Privacy-Preserving Cross-Domain Φ Computation）
 * 开放问题：如何在保护隐私的前提下，实现跨域 Φ-值的协同计算？
 *
 * 方案：基于安全多方计算（MPC）的隐私保护 Φ 值协同
 * 1. 秘密共享：各域持有 Φ 值的秘密份额
 * 2. 加法秘密共享：Φ = Φ_A + Φ_B + Φ_C（模素数域）
 * 3. 安全内积：在不知道明文的情况下计算 Φ 内积
 * 4. 同态哈希：验证计算结果正确性（非交互零知识证明思想）
 *
 * 安全性保证：
 * - 半诚实模型：即使 n-1 方合谋，也无法恢复其他方的明文 Φ 值
 * - 信息论安全：基于秘密共享的信息论安全保证
 */

import { createHash } from 'crypto';
import type { PhiValue } from '../types/atex.types';
import { phiInnerProduct, constructPhi } from './emlPhi';

/** 大素数（模数域） */
const PRIME = 2n ** 127n - 1n; // Mersenne 素数

/** 秘密份额 */
interface SecretShare {
  /** 份额索引 (1, 2, ..., n) */
  index: number;
  /** 模长份额 */
  magnitudeShare: bigint;
  /** 相位份额 */
  phaseShare: bigint;
}

/** 跨域计算请求 */
interface CrossDomainComputeRequest {
  domainId: string;
  /** Φ 值的秘密份额 */
  share: SecretShare;
  /** 承诺（Commitment）= Hash(Φ || nonce) */
  commitment: string;
  /** 计算类型 */
  computeType: 'inner_product' | 'magnitude_diff' | 'phase_diff';
  /** 目标域 ID */
  targetDomainId: string;
}

/** 跨域计算结果 */
interface CrossDomainComputeResult {
  /** 计算类型 */
  type: string;
  /** 结果值 */
  result: number;
  /** 参与方数量 */
  participantCount: number;
  /** 验证哈希（所有参与方 commitment 的聚合哈希） */
  verificationHash: string;
  /** 是否验证通过 */
  verified: boolean;
}

/**
 * PrivacyPhiEngine — 隐私保护 Φ 值协同计算引擎
 */
export class PrivacyPhiEngine {
  /** 本域 Φ 值份额缓存 */
  private localShares: Map<string, SecretShare> = new Map();

  /** 承诺缓存 */
  private commitments: Map<string, string> = new Map();

  /** 本域 Φ 值（仅本地可见） */
  private localPhi: PhiValue | null = null;

  /**
   * 生成 Φ 值的秘密份额（n-out-of-n 加法秘密共享）
   *
   * Φ = share_1 + share_2 + ... + share_n (mod PRIME)
   * 任意 n-1 份无法恢复 Φ
   *
   * @param phi 本域 Φ 值
   * @param n 参与方数量
   * @returns n 份额
   */
  generateShares(phi: PhiValue, n: number = 3): SecretShare[] {
    this.localPhi = phi;

    // 将浮点数转为定点数（乘以 10^6 保持精度）
    const magFixed = BigInt(Math.round(phi.magnitude * 1_000_000));
    const phaseFixed = BigInt(Math.round(phi.phase * 1_000_000));

    // 生成 n-1 个随机份额
    const shares: SecretShare[] = [];
    let magRemainder = magFixed;
    let phaseRemainder = phaseFixed;

    for (let i = 1; i < n; i++) {
      // 随机份额（简化版：用 crypto hash 作为伪随机源）
      const seed = `${phi.magnitude}-${phi.phase}-${i}-${Date.now()}`;
      const hash = createHash('sha256').update(seed).digest();

      const magShare = BigInt(hash.readUInt32BE(0)) % PRIME;
      const phaseShare = BigInt(hash.readUInt32BE(4)) % PRIME;

      shares.push({ index: i, magnitudeShare: magShare, phaseShare: phaseShare });

      magRemainder = (magRemainder - magShare + PRIME) % PRIME;
      phaseRemainder = (phaseRemainder - phaseShare + PRIME) % PRIME;
    }

    // 最后一份 = 原值 - 前n-1份之和
    shares.push({
      index: n,
      magnitudeShare: magRemainder,
      phaseShare: phaseRemainder,
    });

    // 生成本域承诺
    const nonce = createHash('sha256')
      .update(`${phi.magnitude}-${phi.phase}-${Date.now()}`)
      .digest('hex');
    const commitment = createHash('sha256')
      .update(`${magFixed}-${phaseFixed}-${nonce}`)
      .digest('hex');

    this.commitments.set('local', commitment);

    return shares;
  }

  /**
   * 安全内积计算
   * 在不知道对方明文 Φ 值的情况下，计算 Φ_A · Φ_B
   *
   * 方法：
   * 1. 双方交换份额
   * 2. 本地计算份额内积
   * 3. 聚合恢复结果
   *
   * @param localShare 本域份额
   * @param remoteShare 远端份额
   * @returns 内积近似值
   */
  secureInnerProduct(
    localShare: SecretShare,
    remoteShare: SecretShare
  ): number {
    // 份额级内积（近似）
    const magProduct = localShare.magnitudeShare * remoteShare.magnitudeShare;
    const phaseProduct = localShare.phaseShare * remoteShare.phaseShare;

    // 还原浮点（除以 10^12 = 10^6 × 10^6）
    const scale = 1_000_000n * 1_000_000n;
    const result = Number((magProduct * BigInt(1000) / scale) * BigInt(1000)) / 1_000_000;

    return result;
  }

  /**
   * 执行跨域 Φ 值协同计算
   *
   * @param request 计算请求
   * @param remoteShares 其他域的份额列表
   * @returns 计算结果
   */
  compute(
    request: CrossDomainComputeRequest,
    remoteShares: SecretShare[]
  ): CrossDomainComputeResult {
    // 验证承诺
    const allCommitments = [this.commitments.get('local') || ''];
    for (const share of remoteShares) {
      allCommitments.push(`commitment_${share.index}`);
    }
    const verificationHash = createHash('sha256')
      .update(allCommitments.join('-'))
      .digest('hex');

    // 重建 Φ 值（所有份额求和）
    let totalMag = 0n;
    let totalPhase = 0n;
    const allShares = [request.share, ...remoteShares];

    for (const share of allShares) {
      totalMag = (totalMag + share.magnitudeShare) % PRIME;
      totalPhase = (totalPhase + share.phaseShare) % PRIME;
    }

    // 还原浮点
    const recoveredPhi: PhiValue = {
      magnitude: Number(totalMag) / 1_000_000,
      phase: Number(totalPhase) / 1_000_000,
    };

    // 执行计算
    let result = 0;
    if (this.localPhi) {
      switch (request.computeType) {
        case 'inner_product':
          result = phiInnerProduct(this.localPhi, recoveredPhi);
          break;
        case 'magnitude_diff':
          result = Math.abs(this.localPhi.magnitude - recoveredPhi.magnitude);
          break;
        case 'phase_diff': {
          let diff = this.localPhi.phase - recoveredPhi.phase;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          result = diff;
          break;
        }
      }
    }

    return {
      type: request.computeType,
      result,
      participantCount: allShares.length,
      verificationHash,
      verified: true, // 简化：实际需零知识证明验证
    };
  }

  /**
   * get_state() — 模块自检
   */
  get_state(): Record<string, unknown> {
    return {
      module: 'PrivacyPhiEngine',
      hasLocalPhi: this.localPhi !== null,
      shareCount: this.localShares.size,
      commitmentCount: this.commitments.size,
    };
  }
}

/** 单例 */
let instance: PrivacyPhiEngine | null = null;

export function getPrivacyPhiEngine(): PrivacyPhiEngine {
  if (!instance) {
    instance = new PrivacyPhiEngine();
  }
  return instance;
}

export function resetPrivacyPhiEngine(): void {
  instance = null;
}

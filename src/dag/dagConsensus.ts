/**
 * DAG 异步共识引擎
 * 将 TAI 共识从即时发行升级为基于 DAG 的异步最终一致性
 *
 * 核心概念：
 * - 每个 TAI 交易是一个 DAG 节点
 * - 节点通过"引用"之前的交易建立因果序
 * - 共识 = 足够多的验证者确认（权重 ≥ 2/3）
 * - 最终一致性：一旦确认，不可回滚
 *
 * 与即时发行的区别：
 * - 即时：交易 → 立即发行 Token（同步）
 * - DAG：交易 → 创建待确认节点 → 累积确认 → 最终发行（异步）
 *
 * 安全性保证：
 * - 因果一致性：被引用的交易必须先被确认
 * - 诚实多数：需 ≥ 2/3 验证者权重确认
 * - 不可回滚：确认深度 ≥ k 的交易视为最终
 */

import { createHash } from 'crypto';
import type { PhiValue, OfferInfo } from '../types/atex.types';
import { initializePhiFromDID } from '../math/emlPhi';

/** DAG 节点状态 */
export enum DAGNodeStatus {
  PENDING = 'PENDING',     // 待确认
  CONFIRMING = 'CONFIRMING', // 确认中
  CONFIRMED = 'CONFIRMED',   // 已确认（最终一致）
  REJECTED = 'REJECTED',     // 被拒绝
}

/** DAG 节点 */
export interface DAGNode {
  /** 节点哈希（唯一标识） */
  hash: string;
  /** 引用的父节点哈希（因果序） */
  parentHashes: string[];
  /** 交易数据 */
  transaction: {
    offerId: string;
    fromDid: string;
    toDid: string;
    tokenType: string;
    amount: number;
    phiBefore: number;
    phiAfter: number;
  };
  /** Φ 值快照 */
  phiSnapshot: {
    from: PhiValue;
    to: PhiValue;
  };
  /** 验证者确认 */
  confirmations: Array<{
    validatorDid: string;
    weight: number;
    timestamp: Date;
    signature: string;
  }>;
  /** 确认权重总和 */
  totalConfirmationWeight: number;
  /** 状态 */
  status: DAGNodeStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 确认时间 */
  confirmedAt: Date | null;
  /** 确认深度（距离 tip 的层数） */
  depth: number;
}

/** DAG 共识配置 */
interface DAGConsensusConfig {
  /** 确认阈值（总权重百分比） */
  confirmationThreshold: number; // 默认 0.67 (2/3)
  /** 最终确认深度 */
  finalityDepth: number; // 默认 3
  /** 最大引用父节点数 */
  maxParents: number; // 默认 2
  /** 节点过期时间（毫秒） */
  nodeTTL: number; // 默认 3600000 (1h)
}

/** 默认配置 */
const DEFAULT_CONFIG: DAGConsensusConfig = {
  confirmationThreshold: 0.67,
  finalityDepth: 3,
  maxParents: 2,
  nodeTTL: 3600000,
};

/** 验证者信息 */
interface Validator {
  did: string;
  weight: number;
  isActive: boolean;
}

/**
 * DAG 异步共识引擎
 */
export class DAGConsensusEngine {
  private dag: Map<string, DAGNode> = new Map();
  private tips: Set<string> = new Set(); // DAG 顶端（未被引用的节点）
  private validators: Map<string, Validator> = new Map();
  private config: DAGConsensusConfig;
  private totalValidatorWeight: number = 0;

  constructor(config?: Partial<DAGConsensusConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeGenesis();
  }

  /**
   * 初始化创世节点
   */
  private initializeGenesis(): void {
    const genesisHash = createHash('sha256')
      .update('ATEX-DAG-GENESIS-V3')
      .digest('hex');

    const genesis: DAGNode = {
      hash: genesisHash,
      parentHashes: [],
      transaction: {
        offerId: 'genesis',
        fromDid: 'did:atex:system',
        toDid: 'did:atex:system',
        tokenType: 'PASS',
        amount: 0,
        phiBefore: 0,
        phiAfter: 0,
      },
      phiSnapshot: {
        from: { magnitude: 0, phase: 0 },
        to: { magnitude: 0, phase: 0 },
      },
      confirmations: [],
      totalConfirmationWeight: 1.0, // 创世节点自确认
      status: DAGNodeStatus.CONFIRMED,
      createdAt: new Date(),
      confirmedAt: new Date(),
      depth: 0,
    };

    this.dag.set(genesisHash, genesis);
    this.tips.add(genesisHash);
  }

  /**
   * 注册验证者
   */
  registerValidator(did: string, weight: number): void {
    this.validators.set(did, { did, weight, isActive: true });
    this.totalValidatorWeight = Array.from(this.validators.values())
      .filter(v => v.isActive)
      .reduce((sum, v) => sum + v.weight, 0);
  }

  /**
   * 提交新交易到 DAG
   * 选择 tips 作为父节点，创建新的 DAG 节点
   */
  submitTransaction(
    offer: OfferInfo,
    fromDid: string,
    toDid: string,
    amount: number,
    tokenType: string,
    phiBefore: number,
    phiAfter: number
  ): DAGNode {
    // 选择 tips 作为父节点
    const selectedTips = this.selectTips();

    const fromPhi = initializePhiFromDID(fromDid);
    const toPhi = initializePhiFromDID(toDid);

    // 计算节点哈希
    const hashInput = JSON.stringify({
      parents: selectedTips,
      offerId: offer.id,
      from: fromDid,
      to: toDid,
      amount,
      tokenType,
      timestamp: Date.now(),
    });
    const hash = createHash('sha256').update(hashInput).digest('hex');

    const node: DAGNode = {
      hash,
      parentHashes: selectedTips,
      transaction: {
        offerId: offer.id,
        fromDid,
        toDid,
        tokenType,
        amount,
        phiBefore,
        phiAfter,
      },
      phiSnapshot: {
        from: fromPhi,
        to: toPhi,
      },
      confirmations: [],
      totalConfirmationWeight: 0,
      status: DAGNodeStatus.PENDING,
      createdAt: new Date(),
      confirmedAt: null,
      depth: 0,
    };

    this.dag.set(hash, node);

    // 更新 tips：移除被引用的，添加新的
    for (const tip of selectedTips) {
      this.tips.delete(tip);
    }
    this.tips.add(hash);

    return node;
  }

  /**
   * 选择 tips（被引用的父节点）
   * 策略：加权随机选择，优先选择高权重节点
   */
  private selectTips(): string[] {
    const tipsArray = Array.from(this.tips);
    if (tipsArray.length === 0) return [];

    const count = Math.min(this.config.maxParents, tipsArray.length);

    if (tipsArray.length <= count) {
      return tipsArray;
    }

    // 加权随机选择（已确认的节点权重更高）
    const weights = tipsArray.map(tip => {
      const node = this.dag.get(tip);
      return node?.status === DAGNodeStatus.CONFIRMED ? 3 : 1;
    });

    const selected: string[] = [];
    const remaining = [...tipsArray];
    const remainingWeights = [...weights];

    for (let i = 0; i < count; i++) {
      const totalWeight = remainingWeights.reduce((s, w) => s + w, 0);
      let r = Math.random() * totalWeight;
      for (let j = 0; j < remaining.length; j++) {
        r -= remainingWeights[j];
        if (r <= 0) {
          selected.push(remaining[j]);
          remaining.splice(j, 1);
          remainingWeights.splice(j, 1);
          break;
        }
      }
    }

    return selected.length > 0 ? selected : tipsArray.slice(0, count);
  }

  /**
   * 验证者确认节点
   * 累积确认权重，达到阈值后标记为 CONFIRMED
   */
  confirmNode(nodeHash: string, validatorDid: string): {
    confirmed: boolean;
    totalWeight: number;
    requiredWeight: number;
  } {
    const node = this.dag.get(nodeHash);
    if (!node) throw new Error(`DAG 节点不存在: ${nodeHash}`);

    const validator = this.validators.get(validatorDid);
    if (!validator || !validator.isActive) {
      throw new Error(`验证者无效: ${validatorDid}`);
    }

    // 检查是否已确认过
    if (node.confirmations.some(c => c.validatorDid === validatorDid)) {
      return {
        confirmed: node.status === DAGNodeStatus.CONFIRMED,
        totalWeight: node.totalConfirmationWeight,
        requiredWeight: this.getRequiredWeight(),
      };
    }

    // 添加确认
    node.confirmations.push({
      validatorDid,
      weight: validator.weight,
      timestamp: new Date(),
      signature: `sig_${validatorDid}_${nodeHash.slice(0, 8)}`, // 模拟签名
    });

    node.totalConfirmationWeight += validator.weight;

    // 检查是否达到确认阈值
    const requiredWeight = this.getRequiredWeight();
    if (node.totalConfirmationWeight >= requiredWeight) {
      // 确认前验证父节点
      if (this.areParentsConfirmed(node)) {
        node.status = DAGNodeStatus.CONFIRMED;
        node.confirmedAt = new Date();
        node.depth = this.calculateDepth(node);
      } else {
        node.status = DAGNodeStatus.CONFIRMING;
      }
    }

    return {
      confirmed: node.status === DAGNodeStatus.CONFIRMED,
      totalWeight: node.totalConfirmationWeight,
      requiredWeight,
    };
  }

  /**
   * 检查所有父节点是否已确认
   */
  private areParentsConfirmed(node: DAGNode): boolean {
    return node.parentHashes.every(parentHash => {
      const parent = this.dag.get(parentHash);
      return parent && parent.status === DAGNodeStatus.CONFIRMED;
    });
  }

  /**
   * 计算确认深度
   */
  private calculateDepth(node: DAGNode): number {
    if (node.parentHashes.length === 0) return 0;
    const parentDepths = node.parentHashes.map(ph => {
      const parent = this.dag.get(ph);
      return parent ? parent.depth + 1 : 0;
    });
    return Math.max(...parentDepths);
  }

  /**
   * 获取确认所需权重
   */
  private getRequiredWeight(): number {
    return this.totalValidatorWeight * this.config.confirmationThreshold;
  }

  /**
   * 检查交易是否达到最终确认
   * depth ≥ finalityDepth 的已确认节点视为最终
   */
  isFinal(nodeHash: string): boolean {
    const node = this.dag.get(nodeHash);
    if (!node) return false;
    return node.status === DAGNodeStatus.CONFIRMED && node.depth >= this.config.finalityDepth;
  }

  /**
   * 获取待确认的节点列表
   */
  getPendingNodes(): DAGNode[] {
    return Array.from(this.dag.values())
      .filter(n => n.status === DAGNodeStatus.PENDING || n.status === DAGNodeStatus.CONFIRMING);
  }

  /**
   * 获取 DAG 统计
   */
  getStats(): {
    totalNodes: number;
    pendingNodes: number;
    confirmedNodes: number;
    rejectedNodes: number;
    tipCount: number;
    finalNodes: number;
    avgConfirmationTime: number;
  } {
    const nodes = Array.from(this.dag.values());
    const confirmedNodes = nodes.filter(n => n.status === DAGNodeStatus.CONFIRMED);
    const finalNodes = confirmedNodes.filter(n => n.depth >= this.config.finalityDepth);

    const confirmationTimes = confirmedNodes
      .filter(n => n.confirmedAt)
      .map(n => n.confirmedAt!.getTime() - n.createdAt.getTime());

    const avgConfirmationTime = confirmationTimes.length > 0
      ? confirmationTimes.reduce((s, t) => s + t, 0) / confirmationTimes.length
      : 0;

    return {
      totalNodes: nodes.length,
      pendingNodes: nodes.filter(n => n.status === DAGNodeStatus.PENDING).length,
      confirmedNodes: confirmedNodes.length,
      rejectedNodes: nodes.filter(n => n.status === DAGNodeStatus.REJECTED).length,
      tipCount: this.tips.size,
      finalNodes: finalNodes.length,
      avgConfirmationTime,
    };
  }

  /**
   * 清理过期节点
   */
  cleanupExpired(): number {
    const cutoff = new Date(Date.now() - this.config.nodeTTL);
    let removed = 0;

    for (const [hash, node] of this.dag.entries()) {
      if (node.status === DAGNodeStatus.PENDING && node.createdAt < cutoff) {
        node.status = DAGNodeStatus.REJECTED;
        removed++;
      }
    }

    return removed;
  }

  /**
   * 获取节点
   */
  getNode(hash: string): DAGNode | undefined {
    return this.dag.get(hash);
  }

  /**
   * 获取 DAG 结构（可视化用）
   */
  getDAGStructure(): Array<{
    hash: string;
    parents: string[];
    status: string;
    depth: number;
    offerId: string;
  }> {
    return Array.from(this.dag.values()).map(n => ({
      hash: n.hash.slice(0, 12) + '...',
      parents: n.parentHashes.map(p => p.slice(0, 12) + '...'),
      status: n.status,
      depth: n.depth,
      offerId: n.transaction.offerId,
    }));
  }

  /**
   * get_state() — 模块自检
   */
  get_state(): Record<string, unknown> {
    return {
      module: 'DAGConsensusEngine',
      ...this.getStats(),
      config: this.config,
      validatorCount: this.validators.size,
      totalValidatorWeight: this.totalValidatorWeight,
    };
  }
}

/** 单例 */
let instance: DAGConsensusEngine | null = null;

export function getDAGEngine(): DAGConsensusEngine {
  if (!instance) {
    instance = new DAGConsensusEngine();
    // 注册默认验证者
    instance.registerValidator('did:atex:system', 1.0);
    instance.registerValidator('did:atex:bob', 0.5);
    instance.registerValidator('did:atex:alice', 0.5);
  }
  return instance;
}

export function resetDAGEngine(): void {
  instance = null;
}

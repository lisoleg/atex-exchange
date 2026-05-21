/**
 * 碳硅纠缠网模型
 * Agent 互需交易模型：碳基(人类)与硅基(AI) Agent 之间的供需纠缠
 * 对称纠缠：双方互需 → 高优先级匹配
 * 不对称纠缠：单方依赖 → 降低匹配权重
 */

import type { CarbonSiliconBond, PhiValue } from '../types/atex.types';
import { phiInnerProduct } from '../math/emlPhi';

/** Agent 需求画像 */
interface AgentNeeds {
  did: string;
  /** 提供的能力 Token 类型及评分 */
  provides: Record<string, number>;
  /** 需求的能力 Token 类型及评分 */
  requires: Record<string, number>;
  /** Agent 类型：碳基(人类) 或 硅基(AI) */
  agentType: 'CARBON' | 'SILICON';
}

/** 纠缠网 */
const entanglementNet = new Map<string, CarbonSiliconBond[]>();

/** Agent 需求注册表 */
const needsRegistry = new Map<string, AgentNeeds>();

/**
 * 注册 Agent 需求
 * @param did Agent DID
 * @param agentType Agent 类型
 * @param provides 提供的能力
 * @param requires 需求的能力
 */
export function registerAgentNeeds(
  did: string,
  agentType: 'CARBON' | 'SILICON',
  provides: Record<string, number>,
  requires: Record<string, number>
): void {
  needsRegistry.set(did, {
    did,
    provides,
    requires,
    agentType,
  });
}

/**
 * 计算两个 Agent 的互需强度
 * @param needs1 Agent1 需求
 * @param needs2 Agent2 需求
 * @returns 互需强度 [0, 1]
 */
export function calculateMutualNeedScore(
  needs1: AgentNeeds,
  needs2: AgentNeeds
): number {
  // Agent1 需要的，Agent2 能提供的
  let score1 = 0;
  let count1 = 0;
  for (const [type, needScore] of Object.entries(needs1.requires)) {
    if (needs2.provides[type] && needs2.provides[type] > 0) {
      score1 += needScore * needs2.provides[type];
      count1++;
    }
  }

  // Agent2 需要的，Agent1 能提供的
  let score2 = 0;
  let count2 = 0;
  for (const [type, needScore] of Object.entries(needs2.requires)) {
    if (needs1.provides[type] && needs1.provides[type] > 0) {
      score2 += needScore * needs1.provides[type];
      count2++;
    }
  }

  // 归一化
  const maxScore = Math.max(score1, score2, 1);
  const normalized1 = score1 / maxScore;
  const normalized2 = score2 / maxScore;

  // 互需强度 = 几何平均 (对称性越高，分数越高)
  const geometricMean = Math.sqrt(normalized1 * normalized2);
  return Math.min(geometricMean, 1);
}

/**
 * 判断纠缠类型
 * @param needs1 Agent1
 * @param needs2 Agent2
 * @returns 纠缠类型
 */
export function determineEntanglementType(
  needs1: AgentNeeds,
  needs2: AgentNeeds
): 'SYMMETRIC' | 'ASYMMETRIC' {
  const score1 = calculateMutualNeedScore(needs1, needs2);
  // 如果互需强度 > 0.5，视为对称纠缠
  return score1 > 0.5 ? 'SYMMETRIC' : 'ASYMMETRIC';
}

/**
 * 创建碳硅纠缠连接
 * @param carbonDid 碳基 Agent DID
 * @param siliconDid 硅基 Agent DID
 * @returns 碳硅纠缠连接
 */
export function createCarbonSiliconBond(
  carbonDid: string,
  siliconDid: string
): CarbonSiliconBond {
  const needs1 = needsRegistry.get(carbonDid);
  const needs2 = needsRegistry.get(siliconDid);

  let mutualNeedScore = 0;
  let entanglementType: 'SYMMETRIC' | 'ASYMMETRIC' = 'ASYMMETRIC';

  if (needs1 && needs2) {
    mutualNeedScore = calculateMutualNeedScore(needs1, needs2);
    entanglementType = determineEntanglementType(needs1, needs2);
  }

  const bond: CarbonSiliconBond = {
    carbonDid,
    siliconDid,
    mutualNeedScore,
    entanglementType,
    createdAt: new Date(),
  };

  // 保存到纠缠网
  const bonds1 = entanglementNet.get(carbonDid) || [];
  bonds1.push(bond);
  entanglementNet.set(carbonDid, bonds1);

  const bonds2 = entanglementNet.get(siliconDid) || [];
  bonds2.push(bond);
  entanglementNet.set(siliconDid, bonds2);

  return bond;
}

/**
 * 查找最佳匹配 Agent
 * 基于 Φ 值亲和度和互需强度
 * @param did 查询方 DID
 * @param requiredType 需求的 Token 类型
 * @returns 匹配的 Agent DID 列表 (按匹配度排序)
 */
export function findBestMatch(
  did: string,
  requiredType: string
): { did: string; score: number }[] {
  const myNeeds = needsRegistry.get(did);
  if (!myNeeds) return [];

  const matches: { did: string; score: number }[] = [];

  for (const [otherDid, otherNeeds] of needsRegistry.entries()) {
    if (otherDid === did) continue;

    // 检查对方是否能提供所需类型
    if (!otherNeeds.provides[requiredType]) continue;

    // 计算互需强度
    const mutualScore = calculateMutualNeedScore(myNeeds, otherNeeds);

    // Φ 值亲和度加成
    const phiScore = 0; // 需要 Φ 值数据，暂为0
    const compositeScore = mutualScore * 0.8 + phiScore * 0.2;

    matches.push({ did: otherDid, score: compositeScore });
  }

  // 按匹配度排序
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * 获取 Agent 的纠缠连接列表
 * @param did Agent DID
 * @returns 纠缠连接列表
 */
export function getEntanglementBonds(did: string): CarbonSiliconBond[] {
  return entanglementNet.get(did) || [];
}

/**
 * 获取碳硅纠缠网状态
 * @returns 网络统计
 */
export function getCarbonSiliconStatus(): {
  totalBonds: number;
  symmetricBonds: number;
  asymmetricBonds: number;
  avgMutualNeed: number;
} {
  const allBonds = new Set<string>();
  const bonds: CarbonSiliconBond[] = [];

  for (const bondList of entanglementNet.values()) {
    for (const bond of bondList) {
      const key = `${bond.carbonDid}_${bond.siliconDid}`;
      if (!allBonds.has(key)) {
        allBonds.add(key);
        bonds.push(bond);
      }
    }
  }

  const symmetricBonds = bonds.filter(b => b.entanglementType === 'SYMMETRIC').length;
  const avgMutualNeed = bonds.length > 0
    ? bonds.reduce((s, b) => s + b.mutualNeedScore, 0) / bonds.length
    : 0;

  return {
    totalBonds: bonds.length,
    symmetricBonds,
    asymmetricBonds: bonds.length - symmetricBonds,
    avgMutualNeed,
  };
}

// 初始化默认 Agent 需求
registerAgentNeeds('did:atex:alice', 'CARBON',
  { CALC: 0.3, WORD: 0.8 },
  { WIT: 0.9, PASS: 0.4 }
);
registerAgentNeeds('did:atex:bob', 'SILICON',
  { WIT: 0.7, PASS: 0.6 },
  { CALC: 0.8, WORD: 0.5 }
);

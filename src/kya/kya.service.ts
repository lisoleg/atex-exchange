/**
 * KYA (Know Your Agent) 信用系统
 * 借鉴 AEON 的 KYA 信用系统 + ATEX Φ值信任体系
 *
 * 信用因子：
 * 1. 交易历史因子 — 交易次数、成功率、金额
 * 2. Φ值稳定性因子 — Φ值波动率、趋势
 * 3. 钱包安全因子 — 钱包类型、是否有备份
 * 4. DID验证因子 — WebAuthn验证、实名认证
 * 5. 时间活跃因子 — 注册时长、最近活跃时间
 */

import { PrismaClient } from '@prisma/client';
import { initializePhiFromDID } from '../math/emlPhi';

const prisma = new PrismaClient();

// ============================================================
// 信用因子定义
// ============================================================

/** 单个信用因子评分 */
export interface CreditFactor {
  name: string;
  score: number;       // 0-1
  weight: number;      // 权重 0-1
  description: string;
  details?: Record<string, unknown>;
}

/** Agent 完整信用报告 */
export interface KYACreditReport {
  agentDid: string;
  creditScore: number;          // 综合信用分 0-1000
  creditGrade: KYACreditGrade;  // 信用等级
  factors: CreditFactor[];
  computedAt: Date;
  recommendation: string;
}

/** 信用等级 */
export type KYACreditGrade = 'UNRATED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

// ============================================================
// 信用因子权重（可配置） ============================================================

const FACTOR_WEIGHTS: Record<string, number> = {
  transactionHistory: 0.30,
  phiStability: 0.25,
  walletSecurity: 0.20,
  didVerification: 0.15,
  activityAge: 0.10,
};

// ============================================================
// 信用因子计算
// ============================================================

/**
 * 1. 交易历史因子
 * 基于交易次数、成功率和交易金额
 */
async function computeTransactionFactor(did: string): Promise<CreditFactor> {
  const [sentOffers, transactions] = await Promise.all([
    prisma.offer.findMany({ where: { offererDid: did } }),
    prisma.transaction.findMany({ where: { fromDid: did } }),
  ]);

  const totalOffers = sentOffers.length;
  const successfulOffers = sentOffers.filter(o => o.status === 'SETTLED' || o.status === 'ACCEPTED').length;
  const successRate = totalOffers > 0 ? successfulOffers / totalOffers : 0;
  const totalTxVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

  // 综合评分：交易数量 + 成功率 + 金额
  const volumeScore = Math.min(totalTxVolume / 10000, 1);
  const countScore = Math.min(totalOffers / 50, 1);
  const score = (countScore * 0.3 + successRate * 0.4 + volumeScore * 0.3);

  return {
    name: 'transactionHistory',
    score,
    weight: FACTOR_WEIGHTS.transactionHistory,
    description: '交易历史',
    details: {
      totalOffers,
      successfulOffers,
      successRate: +(successRate * 100).toFixed(1) + '%',
      totalTxVolume,
    },
  };
}

/**
 * 2. Φ值稳定性因子
 * 基于Φ值的波动率和趋势
 */
async function computePhiStabilityFactor(did: string): Promise<CreditFactor> {
  const agent = await prisma.agent.findUnique({ where: { did } });
  if (!agent) {
    return { name: 'phiStability', score: 0.3, weight: FACTOR_WEIGHTS.phiStability, description: 'Φ值稳定性' };
  }

  const phi = initializePhiFromDID(did);
  const magnitude = phi.magnitude;

  // Φ值评分：模长越高越稳定（高Φ = 活跃且可信）
  const magnitudeScore = Math.min(magnitude / 5, 1);
  // 信誉分
  const reputationScore = agent.reputation;
  const score = magnitudeScore * 0.5 + reputationScore * 0.5;

  return {
    name: 'phiStability',
    score: Math.min(score, 1),
    weight: FACTOR_WEIGHTS.phiStability,
    description: 'Φ值稳定性',
    details: {
      phiMagnitude: magnitude,
      reputation: agent.reputation,
    },
  };
}

/**
 * 3. 钱包安全因子
 * 基于钱包类型和安全措施
 */
async function computeWalletSecurityFactor(did: string): Promise<CreditFactor> {
  const agent = await prisma.agent.findUnique({ where: { did } });
  const wallets = await prisma.wallet.findMany({ where: { agentId: agent?.id } });

  if (wallets.length === 0) {
    return { name: 'walletSecurity', score: 0.2, weight: FACTOR_WEIGHTS.walletSecurity, description: '钱包安全' };
  }

  // 钱包类型评分
  const typeScores: Record<string, number> = {
    SELF_CUSTODY: 1.0,  // 自托管最高安全
    THRESHOLD: 0.8,     // 门限次之
    CUSTODIAL: 0.5,     // 托管最低
  };

  const activeWallet = wallets.find(w => w.isActive) || wallets[0];
  const typeScore = typeScores[activeWallet.type] || 0.3;

  // 备份加分
  const hasBackup = activeWallet.config && JSON.parse(JSON.stringify(activeWallet.config)).backupExists;
  const backupBonus = hasBackup ? 0.1 : 0;

  return {
    name: 'walletSecurity',
    score: Math.min(typeScore + backupBonus, 1),
    weight: FACTOR_WEIGHTS.walletSecurity,
    description: '钱包安全',
    details: {
      walletType: activeWallet.type,
      walletCount: wallets.length,
      hasBackup: !!hasBackup,
    },
  };
}

/**
 * 4. DID 验证因子
 * 基于 WebAuthn 认证状态
 */
async function computeDidVerificationFactor(did: string): Promise<CreditFactor> {
  const agent = await prisma.agent.findUnique({ where: { did } });

  let score = 0.2; // 基础分（DID 存在）
  let details: Record<string, unknown> = { didExists: true };

  if (agent?.webauthnId) {
    score = 0.7; // WebAuthn 已验证
    details.webauthnVerified = true;
  }

  if (agent?.publicKey) {
    score = Math.max(score, 0.8); // 有公钥
    details.hasPublicKey = true;
  }

  if (agent?.lastLoginAt) {
    const daysSinceLogin = (Date.now() - agent.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin < 7) {
      score = Math.min(score + 0.1, 1);
      details.recentLogin = true;
    }
  }

  return {
    name: 'didVerification',
    score,
    weight: FACTOR_WEIGHTS.didVerification,
    description: 'DID验证',
    details,
  };
}

/**
 * 5. 时间活跃因子
 * 基于注册时长和最近活跃
 */
async function computeActivityAgeFactor(did: string): Promise<CreditFactor> {
  const agent = await prisma.agent.findUnique({ where: { did } });
  if (!agent) {
    return { name: 'activityAge', score: 0.1, weight: FACTOR_WEIGHTS.activityAge, description: '活跃时间' };
  }

  const ageDays = (Date.now() - agent.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const ageScore = Math.min(ageDays / 365, 1); // 1年满分

  const lastActive = agent.lastLoginAt || agent.updatedAt;
  const inactiveDays = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(1 - inactiveDays / 90, 0); // 90天不活跃则0分

  const score = ageScore * 0.4 + recencyScore * 0.6;

  return {
    name: 'activityAge',
    score,
    weight: FACTOR_WEIGHTS.activityAge,
    description: '活跃时间',
    details: {
      ageDays: Math.floor(ageDays),
      lastActiveDays: Math.floor(inactiveDays),
    },
  };
}

// ============================================================
// 综合评分
// ============================================================

/**
 * 计算综合信用分（0-1000）
 */
function computeOverallScore(factors: CreditFactor[]): number {
  const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  return Math.round(weightedSum * 1000);
}

/**
 * 信用分 → 信用等级映射
 */
function scoreToGrade(score: number): KYACreditGrade {
  if (score >= 800) return 'DIAMOND';
  if (score >= 650) return 'PLATINUM';
  if (score >= 500) return 'GOLD';
  if (score >= 350) return 'SILVER';
  if (score >= 200) return 'BRONZE';
  return 'UNRATED';
}

/**
 * 基于信用等级的建议
 */
function getGradeRecommendation(grade: KYACreditGrade): string {
  const recommendations: Record<KYACreditGrade, string> = {
    DIAMOND: '顶级信用，可享受全量 API 访问和零手续费特权',
    PLATINUM: '高信用，推荐升级为自托管钱包以获得更高评分',
    GOLD: '信用良好，保持活跃交易以维持评分',
    SILVER: '信用一般，建议启用 WebAuthn 和门限钱包',
    BRONZE: '信用较低，需提升交易活跃度和安全措施',
    UNRATED: '新用户，建议完成 WebAuthn 认证并创建钱包',
  };
  return recommendations[grade];
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 计算 Agent KYA 信用报告
 */
export async function computeKYACredit(did: string): Promise<KYACreditReport> {
  const [factor1, factor2, factor3, factor4, factor5] = await Promise.all([
    computeTransactionFactor(did),
    computePhiStabilityFactor(did),
    computeWalletSecurityFactor(did),
    computeDidVerificationFactor(did),
    computeActivityAgeFactor(did),
  ]);

  const factors = [factor1, factor2, factor3, factor4, factor5];
  const creditScore = computeOverallScore(factors);
  const creditGrade = scoreToGrade(creditScore);

  return {
    agentDid: did,
    creditScore,
    creditGrade,
    factors,
    computedAt: new Date(),
    recommendation: getGradeRecommendation(creditGrade),
  };
}

/**
 * 批量计算多个 Agent 的信用分（轻量版，仅返回分数和等级）
 */
export async function batchComputeCreditScores(dids: string[]): Promise<Array<{ did: string; score: number; grade: KYACreditGrade }>> {
  const results = await Promise.all(dids.map(async (did) => {
    const report = await computeKYACredit(did);
    return { did, score: report.creditScore, grade: report.creditGrade };
  }));
  return results;
}

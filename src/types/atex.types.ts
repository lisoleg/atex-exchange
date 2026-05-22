/**
 * ATEX 核心类型定义
 * 基于西格玛云四元Token统一场论的类型系统
 */

// ============================================================
// 枚举类型
// ============================================================

/** 四元 Token 类型：算元/智元/词元/通证 */
export enum TokenType {
  CALC = 'CALC',  // 算元
  WIT = 'WIT',    // 智元
  WORD = 'WORD',  // 词元
  PASS = 'PASS',  // 通证
}

/** Token 生命周期状态 */
export enum TokenStatus {
  NULL = 'NULL',         // 未创建
  ISSUED = 'ISSUED',     // 已发行(临时，缠绕中)
  ACTIVE = 'ACTIVE',     // 活跃(可交易)
  LOCKED = 'LOCKED',     // 锁定(正在交易中)
  CONSUMED = 'CONSUMED', // 已消费
  SETTLED = 'SETTLED',   // 已结算
  RECYCLED = 'RECYCLED', // 已回收
}

/** Φ-Gateway 决策级别 */
export enum PhiGatewayLevel {
  PRIORITY = 'PRIORITY', // 优先通过
  NORMAL = 'NORMAL',     // 正常处理
  THROTTLE = 'THROTTLE', // 限流
  REJECT = 'REJECT',     // 拒绝
}

/** Offer 状态 */
export enum OfferStatus {
  OPEN = 'OPEN',           // 开放中
  ACCEPTED = 'ACCEPTED',   // 已接受
  CANCELLED = 'CANCELLED', // 已取消
  EXPIRED = 'EXPIRED',     // 已过期
  SETTLED = 'SETTLED',     // 已结算
}

/** 交易类型 */
export enum TransactionType {
  PHASE_ENTANGLE = 'PHASE_ENTANGLE',               // 相位缠绕
  TOPOLOGICAL_TRANSITION = 'TOPOLOGICAL_TRANSITION', // 拓扑相变
  PHASE_RELAXATION = 'PHASE_RELAXATION',             // 相位松弛
}

// ============================================================
// 核心数据结构
// ============================================================

/** Φ 值复数表示 */
export interface PhiValue {
  /** 模长 |Φ| */
  magnitude: number;
  /** 相位角 θ (弧度) */
  phase: number;
}

/** Agent 画像 */
export interface AgentProfile {
  did: string;
  name: string;
  phi: PhiValue;
  reputation: number;
  tokenBalances: Record<TokenType, number>;
}

/** Token 完整信息 */
export interface TokenInfo {
  id: string;
  type: TokenType;
  status: TokenStatus;
  amount: number;
  phi: PhiValue;
  ownerDid: string;
  offerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Offer 完整信息 */
export interface OfferInfo {
  id: string;
  offererDid: string;
  receiverDid: string | null;
  offerTokenType: TokenType;
  offerAmount: number;
  reqTokenType: TokenType;
  reqAmount: number;
  phiDiff: number | null;
  jitterImpact: number | null;
  gatewayLevel: PhiGatewayLevel;
  status: OfferStatus;
  expiresAt: Date;
  activityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Transaction 完整信息 */
export interface TransactionInfo {
  id: string;
  offerId: string;
  type: TransactionType;
  fromDid: string;
  toDid: string;
  tokenType: TokenType;
  amount: number;
  phiBefore: number | null;
  phiAfter: number | null;
  zkProofHash: string | null;
  createdAt: Date;
}

// ============================================================
// 请求/响应类型
// ============================================================

/** 创建 Offer 请求 */
export interface CreateOfferRequest {
  offererDid: string;
  receiverDid?: string;
  offerTokenType: TokenType;
  offerAmount: number;
  reqTokenType: TokenType;
  reqAmount: number;
}

/** 创建 Offer 响应 */
export interface CreateOfferResponse {
  offerId: string;
  status: OfferStatus;
  gatewayLevel: PhiGatewayLevel;
  phiDiff: number;
  jitterImpact: number;
  tempTokenId: string;
  activityId: string;
}

/** 接受 Offer 响应 */
export interface AcceptOfferResponse {
  offerId: string;
  status: OfferStatus;
  transactionType: TransactionType;
  aliceTokenId: string;
  bobTokenId: string;
}

/** 取消 Offer 响应 */
export interface CancelOfferResponse {
  offerId: string;
  status: OfferStatus;
  releasedTokenId: string;
}

/** 订单簿条目 */
export interface OrderBookEntry {
  offerId: string;
  offererDid: string;
  offerTokenType: TokenType;
  offerAmount: number;
  reqTokenType: TokenType;
  reqAmount: number;
  phiDiff: number;
  expiresAt: Date;
  gatewayLevel: PhiGatewayLevel;
}

/** 订单簿响应 */
export interface OrderBookResponse {
  entries: OrderBookEntry[];
  total: number;
}

/** 历史查询参数 */
export interface HistoryQueryParams {
  tokenType?: TokenType;
  status?: OfferStatus;
  fromDid?: string;
  page?: number;
  limit?: number;
}

/** 历史记录响应 */
export interface HistoryResponse {
  transactions: TransactionInfo[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Φ-Gateway 类型
// ============================================================

/** Φ-Gateway 评估结果 */
export interface PhiGatewayResult {
  level: PhiGatewayLevel;
  didVerified: boolean;
  gradientMagnitude: number;
  intentScore: number;
  antiPhaseDetected: boolean;
  singularity139Detected: boolean;
  reason?: string;
}

// ============================================================
// 数学引擎类型
// ============================================================

/** Jitter 滑点计算结果 */
export interface JitterResult {
  /** 时间抖动值 (ms) */
  jitter: number;
  /** 滑点量 */
  slippage: number;
  /** 总影响 (滑点 × 数量) */
  impact: number;
}

/** 139 相变检测结果 */
export interface PhaseTransition139Result {
  /** LOB 深度熵 */
  lobDepthEntropy: number;
  /** 是否触发相变预警 */
  isSingularity: boolean;
  /** 预警级别 0-1 */
  alertLevel: number;
  /** 距离阈值的偏移 */
  deviation: number;
}

/** 369 振动模态结果 */
export interface Resonance369Result {
  /** 当前数字根 */
  digitalRoot: number;
  /** 共振模态 (3/6/9 或 0 表示无共振) */
  resonanceMode: 0 | 3 | 6 | 9;
  /** 当前周期阶段：触发(3)/共振(6)/归整(9) */
  cyclePhase: 'trigger' | 'resonance' | 'consolidate' | 'none';
  /** 振动强度 0-1 */
  intensity: number;
}

/** 三旋风控评估结果 */
export interface TriSpinRiskResult {
  /** 面旋风险 (空间分散度) 0-1 */
  surfaceSpin: number;
  /** 体旋风险 (杠杆自适应) 0-1 */
  bodySpin: number;
  /** 线旋风险 (递归预测) 0-1 */
  lineSpin: number;
  /** 综合风险评分 0-1 */
  compositeRisk: number;
  /** 风控建议 */
  recommendation: 'APPROVE' | 'CAUTION' | 'REJECT';
}

/** O-U 均值回归结果 */
export interface OUMeanReversionResult {
  /** 当前供应量 */
  currentSupply: number;
  /** 长期均衡值 */
  meanLevel: number;
  /** 偏离度 */
  deviation: number;
  /** 回归速度 */
  reversionSpeed: number;
  /** 是否需要干预 */
  needsIntervention: boolean;
  /** 建议发行/回收量 */
  suggestedAdjustment: number;
}

// ============================================================
// 联邦协议类型
// ============================================================

/** ActivityPub Activity 基础结构 */
export interface ActivityPubActivity {
  '@context': string[];
  id: string;
  type: string;
  actor: string;
  object?: unknown;
  target?: string;
  published: string;
}

/** Offer Activity */
export interface OfferActivity extends ActivityPubActivity {
  type: 'Offer';
  object: {
    type: 'TokenExchange';
    offerTokenType: TokenType;
    offerAmount: number;
    reqTokenType: TokenType;
    reqAmount: number;
    phiDiff: number;
  };
  target?: string;
}

/** Accept Activity */
export interface AcceptActivity extends ActivityPubActivity {
  type: 'Accept';
  object: string; // Offer Activity ID
  result?: {
    aliceTokenId: string;
    bobTokenId: string;
    transactionType: TransactionType;
  };
}

/** Liu 路由表条目 */
export interface LiuRouteEntry {
  targetDid: string;
  nextHopDid: string;
  phiAffinity: number;
  hopCount: number;
  updatedAt: Date;
}

// ============================================================
// 共识场类型
// ============================================================

/** TAI (交易即发行) 结果 */
export interface TAIResult {
  /** 新发行的 Token IDs */
  newTokenIds: string[];
  /** 销毁的临时 Token IDs */
  destroyedTokenIds: string[];
  /** 回收的 Token IDs */
  recycledTokenIds: string[];
  /** O-U 检查结果 */
  ouCheck: OUMeanReversionResult;
  /** 总供应量变化 */
  supplyDelta: number;
}

/** 碳硅纠缠连接 */
export interface CarbonSiliconBond {
  carbonDid: string;   // 人类 Agent
  siliconDid: string;  // AI Agent
  /** 互需强度 0-1 */
  mutualNeedScore: number;
  /** 纠缠态：对称/不对称 */
  entanglementType: 'SYMMETRIC' | 'ASYMMETRIC';
  createdAt: Date;
}

/** 全息边界记录 */
export interface HoloboundaryRecord {
  activityId: string;
  activityHash: string;
  timestamp: Date;
  blockSize: number;
}

// ============================================================
// V2 认证 & 钱包类型
// ============================================================

/** 钱包类型 */
export enum WalletType {
  CUSTODIAL = 'CUSTODIAL',       // 托管钱包
  THRESHOLD = 'THRESHOLD',       // 门限钱包
  SELF_CUSTODY = 'SELF_CUSTODY', // 自托管钱包
}

/** 认证方式 */
export enum AuthMethod {
  WEBAUTHN = 'WEBAUTHN',   // 生物识别/Passkey
  JWT = 'JWT',             // JWT Token
  API_KEY = 'API_KEY',     // API Key
  DEV = 'DEV',             // 开发模式
}

/** API Key 权限 */
export enum ApiKeyPermission {
  OFFER_READ = 'offer:read',
  OFFER_WRITE = 'offer:write',
  BALANCE_READ = 'balance:read',
  WALLET_READ = 'wallet:read',
  WALLET_WRITE = 'wallet:write',
  AGENT_READ = 'agent:read',
  AGENT_WRITE = 'agent:write',
  ALL = '*',
}

/** 认证响应 */
export interface AuthResponse {
  verified: boolean;
  agent: {
    id: string;
    did: string;
    name: string;
    walletType: string | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/** 钱包信息 */
export interface WalletInfo {
  id: string;
  type: WalletType;
  address: string;
  isActive: boolean;
  config: Record<string, unknown> | null;
  createdAt: Date;
}

/** Agent 批量执行请求 */
export interface AgentBatchRequest {
  steps: Array<{
    action: 'create_offer' | 'accept_offer' | 'cancel_offer' | 'query';
    params: Record<string, unknown>;
    id: string;
  }>;
}

/** Agent 批量执行响应 */
export interface AgentBatchResponse {
  results: Array<{
    id: string;
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
  stepResults: Record<string, unknown>;
}

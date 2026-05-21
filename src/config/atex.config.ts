/**
 * ATEX 配置常量
 * 集中管理所有系统级配置参数
 */

// ============================================================
// Φ 值与相位
// ============================================================

/** Φ 值匹配阈值 (45° = π/4 弧度) */
export const PHI_THRESHOLD = Math.PI / 4;

/** Φ 值匹配严格阈值 (30° = π/6 弧度) */
export const PHI_STRICT_THRESHOLD = Math.PI / 6;

/** Φ 值模长归一化基准 */
export const PHI_MAGNITUDE_BASE = 1.0;

// ============================================================
// Jitter 滑点
// ============================================================

/** Jitter 基线 (ms) */
export const JITTER_BASELINE = 50;

/** Jitter 标准差 (ms) */
export const JITTER_STDDEV = 15;

/** 最大允许滑点比例 */
export const MAX_SLIPPAGE_RATIO = 0.05;

// ============================================================
// 139 相变
// ============================================================

/** 139 相变阈值 */
export const PHASE_TRANSITION_139 = 139;

/** LOB 深度熵安全阈值 */
export const LOB_ENTROPY_SAFETY = 3.5;

/** LOB 深度熵预警阈值 */
export const LOB_ENTROPY_WARNING = 2.0;

// ============================================================
// 369 振动模态
// ============================================================

/** 369 振动模态序列 */
export const RESONANCE_369 = [3, 6, 9] as const;

/** 共振强度阈值 */
export const RESONANCE_INTENSITY_THRESHOLD = 0.7;

/** 369 周期窗口大小 */
export const RESONANCE_WINDOW_SIZE = 9;

// ============================================================
// 三旋风控
// ============================================================

/** 面旋（空间分散度）阈值 */
export const SURFACE_SPIN_THRESHOLD = 0.6;

/** 体旋（杠杆自适应）阈值 */
export const BODY_SPIN_THRESHOLD = 0.7;

/** 线旋（递归预测）阈值 */
export const LINE_SPIN_THRESHOLD = 0.8;

/** 综合风险拒绝阈值 */
export const COMPOSITE_REJECT_THRESHOLD = 0.75;

/** 综合风险谨慎阈值 */
export const COMPOSITE_CAUTION_THRESHOLD = 0.5;

// ============================================================
// O-U 均值回归
// ============================================================

/** O-U 均值回归速度 θ */
export const OU_REVERSION_SPEED = 0.1;

/** O-U 长期均衡值 μ */
export const OU_MEAN_LEVEL = 10000;

/** O-U 波动率 σ */
export const OU_VOLATILITY = 0.15;

/** O-U 偏离干预阈值 */
export const OU_DEVIATION_THRESHOLD = 0.2;

// ============================================================
// TAI (交易即发行)
// ============================================================

/** TAI 发行敏感度 */
export const TAI_SENSITIVITY = 0.01;

/** TAI 最大单次发行量 */
export const TAI_MAX_ISSUANCE = 1000;

// ============================================================
// Offer 配置
// ============================================================

/** Offer 有效期 (秒) */
export const OFFER_TTL = 3600;

/** Offer 过期清理间隔 (毫秒) */
export const OFFER_CLEANUP_INTERVAL = 60000;

// ============================================================
// Φ-Gateway
// ============================================================

/** 共识场梯度 - 正常阈值 */
export const GRADIENT_NORMAL = 0.5;

/** 共识场梯度 - 限流阈值 */
export const GRADIENT_THROTTLE = 1.0;

/** 意图预测阈值 */
export const INTENT_THRESHOLD = 0.3;

/** 反相位突发检测窗口 (秒) */
export const ANTIPHASE_WINDOW = 60;

/** 反相位突发检测阈值 */
export const ANTIPHASE_BURST_THRESHOLD = 5;

// ============================================================
// 网络配置
// ============================================================

/** API 端口 */
export const API_PORT = 3001;

/** API 前缀 */
export const API_PREFIX = '/api/v1/atex';

/** CORS 允许源 */
export const CORS_ORIGIN = 'http://localhost:5173';

// ============================================================
// 数据库
// ============================================================

/** SQLite 数据库文件路径 */
export const DATABASE_URL = 'file:./prisma/atex.db';

// ============================================================
// 错误码
// ============================================================

export const ERROR_CODES = {
  ATEX_001: 'Φ-Gateway 拒绝交易',
  ATEX_002: 'Φ 值不匹配(拓扑相变失败)',
  ATEX_003: 'Token 状态非法',
  ATEX_004: 'Offer 已过期',
  ATEX_005: '余额不足',
  ATEX_006: '反相位欺诈检测触发',
  ATEX_007: '139 相变预警触发',
  ATEX_008: 'Jitter 滑点超限',
  ATEX_009: 'O-U 均值回归偏离',
  ATEX_010: '联邦网络不可达',
} as const;

/** 错误码类型 */
export type AtexErrorCode = keyof typeof ERROR_CODES;

// ============================================================
// Token 类型映射
// ============================================================

/** Token 类型中文名 */
export const TOKEN_TYPE_LABELS: Record<string, string> = {
  CALC: '算元',
  WIT: '智元',
  WORD: '词元',
  PASS: '通证',
};

/** Token 状态中文名 */
export const TOKEN_STATUS_LABELS: Record<string, string> = {
  NULL: '未创建',
  ISSUED: '已发行',
  ACTIVE: '活跃',
  LOCKED: '锁定',
  CONSUMED: '已消费',
  SETTLED: '已结算',
  RECYCLED: '已回收',
};

/** Gateway 级别中文名 */
export const GATEWAY_LEVEL_LABELS: Record<string, string> = {
  PRIORITY: '优先',
  NORMAL: '正常',
  THROTTLE: '限流',
  REJECT: '拒绝',
};

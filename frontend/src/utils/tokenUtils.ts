/**
 * Token 工具函数
 */

/** Token 类型 */
export type TokenType = 'CALC' | 'WIT' | 'WORD' | 'PASS';

/** Token 状态 */
export type TokenStatus = 'NULL' | 'ISSUED' | 'ACTIVE' | 'LOCKED' | 'CONSUMED' | 'SETTLED' | 'RECYCLED';

/** Offer 状态 */
export type OfferStatus = 'OPEN' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED' | 'SETTLED';

/** Gateway 级别 */
export type GatewayLevel = 'PRIORITY' | 'NORMAL' | 'THROTTLE' | 'REJECT';

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

/** Offer 状态中文名 */
export const OFFER_STATUS_LABELS: Record<string, string> = {
  OPEN: '开放中',
  ACCEPTED: '已接受',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
  SETTLED: '已结算',
};

/** Gateway 级别中文名 */
export const GATEWAY_LEVEL_LABELS: Record<string, string> = {
  PRIORITY: '优先',
  NORMAL: '正常',
  THROTTLE: '限流',
  REJECT: '拒绝',
};

/** Gateway 级别颜色 */
export const GATEWAY_LEVEL_COLORS: Record<string, string> = {
  PRIORITY: '#10b981',
  NORMAL: '#6366f1',
  THROTTLE: '#f59e0b',
  REJECT: '#ef4444',
};

/** Token 类型颜色 */
export const TOKEN_TYPE_COLORS: Record<string, string> = {
  CALC: '#6366f1',
  WIT: '#8b5cf6',
  WORD: '#06b6d4',
  PASS: '#10b981',
};

/**
 * 格式化数量
 */
export function formatAmount(amount: number, decimals: number = 2): string {
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toFixed(decimals);
}

/**
 * 格式化时间
 */
export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 格式化相位角 (弧度 → 角度)
 */
export function formatPhase(radians: number): string {
  const degrees = (radians * 180) / Math.PI;
  return `${degrees.toFixed(1)}°`;
}

/**
 * 截断 DID 显示
 */
export function truncateDid(did: string): string {
  if (did.length <= 16) return did;
  return `${did.substring(0, 12)}...${did.substring(did.length - 4)}`;
}

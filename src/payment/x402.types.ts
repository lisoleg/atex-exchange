/**
 * ATEX x402 支付协议类型定义
 * 借鉴 Coinbase x402 协议 + AEON 结算层，适配四元 Token 经济模型
 *
 * 核心创新：
 * - HTTP 402 状态码嵌入 Φ值 支付要求
 * - X-PAYMENT / X-PAYMENT-RESPONSE 头部标准
 * - 支持四元 Token（Calc/Wit/Word/Pass）作为支付资产
 * - 原子终局性保证（借助 Φ-Gateway 验证）
 */

import { TokenType } from '../types/atex.types';

// ============================================================
// x402 协议核心类型
// ============================================================

/** x402 协议版本 */
export const X402_VERSION = 1;

/** 支付方案类型 */
export type PaymentScheme = 'exact' | 'upto' | 'subscription';

/** 支付请求状态码（扩展 HTTP 402） */
export const X402_STATUS = 402;

/** 支付请求响应体（402 Payment Required） */
export interface X402PaymentRequired {
  /** x402 协议版本 */
  x402Version: number;
  /** 可接受的支付方式列表 */
  accepts: X402PaymentOption[];
  /** 错误信息（可选） */
  error?: string;
}

/** 支付方式选项 */
export interface X402PaymentOption {
  /** 支付方案: exact=精确金额, upto=按量计费, subscription=周期订阅 */
  scheme: PaymentScheme;
  /** 支付网络标识 */
  network: string;
  /** 所需最高金额 */
  maxAmountRequired: string;
  /** 资源描述 */
  resource: string;
  /** 资源描述（人类可读） */
  description: string;
  /** 响应 MIME 类型 */
  mimeType?: string;
  /** 响应 Schema */
  outputSchema?: Record<string, unknown>;
  /** 收款方 DID */
  payTo: string;
  /** 最大超时（秒） */
  maxTimeoutSeconds: number;
  /** 支付资产类型（ATEX 四元 Token） */
  asset: string;
  /** 扩展字段 */
  extra?: Record<string, unknown>;
}

/** X-PAYMENT 请求头负载 */
export interface X402PaymentPayload {
  /** x402 协议版本 */
  x402Version: number;
  /** 支付方案 */
  scheme: PaymentScheme;
  /** 支付网络 */
  network: string;
  /** 支付数据（Base64 编码的签名数据） */
  payload: string;
}

/** X-PAYMENT-RESPONSE 响应头负载 */
export interface X402PaymentResponse {
  /** 是否成功 */
  success: boolean;
  /** 结算交易哈希 */
  txHash: string;
  /** 实际支付金额 */
  amountPaid: string;
  /** 支付资产 */
  asset: string;
  /** 结算时间戳 */
  settledAt: string;
}

// ============================================================
// ATEX 扩展：可验证收据（ERC-8004 风格）
// ============================================================

/** 可验证收据 */
export interface VerifiableReceipt {
  /** 收据 ID */
  id: string;
  /** 交易 ID */
  transactionId: string;
  /** 付款方 DID */
  payerDid: string;
  /** 收款方 DID */
  payeeDid: string;
  /** 支付资产类型 */
  assetType: TokenType;
  /** 支付金额 */
  amount: number;
  /** Φ值快照（支付时双方 Φ 值） */
  phiSnapshot: {
    payer: { magnitude: number; phase: number };
    payee: { magnitude: number; phase: number };
  };
  /** Φ-Gateway 决策级别 */
  gatewayLevel: string;
  /** 交易证明哈希（SHA-256） */
  proofHash: string;
  /** 创建时间 */
  createdAt: Date;
}

// ============================================================
// 配置类型
// ============================================================

/** x402 路由级配置 */
export interface X402RouteConfig {
  /** 接受的 Token 类型 */
  acceptTokens: TokenType[];
  /** 每次请求价格（Token 数量） */
  price: number;
  /** 资源描述 */
  description: string;
  /** 最大超时 */
  maxTimeoutSeconds?: number;
  /** 支付方案 */
  scheme?: PaymentScheme;
}

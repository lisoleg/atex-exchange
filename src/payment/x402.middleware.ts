/**
 * x402 支付中间件 — HTTP 402 Payment Required
 *
 * 借鉴 AEON Protocol Kernel (x402 Stack)：
 * 对需要支付 Φ值/Token 的 API 端点，返回 HTTP 402 + 支付要求
 * Agent 通过 X-PAYMENT 头部携带支付信息后重试
 *
 * 工作流程：
 * 1. Agent 请求受保护资源 → 收到 402 + accepts 列表
 * 2. Agent 选择支付方式，构建 X-PAYMENT 头
 * 3. Agent 重新请求 → 中间件验证支付 → 放行
 * 4. 响应头携带 X-PAYMENT-RESPONSE（含结算 txHash）
 */

import { Request, Response, NextFunction } from 'express';
import { X402_VERSION, X402_STATUS, X402RouteConfig, X402PaymentRequired, X402PaymentOption } from './x402.types';
import { TokenType } from '../types/atex.types';

/** 路由 → x402 配置映射 */
const routeConfigs = new Map<string, X402RouteConfig>();

/**
 * 注册 x402 付费路由
 *
 * @param routePath - 路由路径 (如 'GET /api/v1/orderbook')
 * @param config - x402 配置
 *
 * @example
 * registerX402Route('GET /api/v1/orderbook', {
 *   acceptTokens: [TokenType.CALC],
 *   price: 0.01,
 *   description: '订单簿查询',
 * });
 */
export function registerX402Route(routePath: string, config: X402RouteConfig): void {
  routeConfigs.set(routePath, {
    maxTimeoutSeconds: 60,
    scheme: 'exact',
    ...config,
  });
}

/**
 * 批量注册 x402 路由
 *
 * @param configs - 路由路径到配置的映射
 *
 * @example
 * configureX402Routes({
 *   'GET /api/v1/orderbook': { acceptTokens: [TokenType.CALC], price: 0.01, description: '订单簿查询' },
 *   'POST /api/v1/offer': { acceptTokens: [TokenType.PASS], price: 0.1, description: '创建挂单' },
 * });
 */
export function configureX402Routes(configs: Record<string, X402RouteConfig>): void {
  for (const [route, config] of Object.entries(configs)) {
    registerX402Route(route, config);
  }
}

/**
 * x402 支付中间件
 *
 * 检查请求是否携带有效支付信息：
 * - 无支付信息 → 返回 402 Payment Required
 * - 有 X-PAYMENT 头 → 验证并放行
 */
export function x402PaymentMiddleware(req: Request, res: Response, next: NextFunction): void {
  const routeKey = `${req.method} ${req.route?.path || req.path}`;

  // 检查此路由是否需要 x402 支付
  const config = routeConfigs.get(routeKey);
  if (!config) {
    // 未注册的路由，直接放行
    next();
    return;
  }

  // 检查是否有 X-PAYMENT 头
  const paymentHeader = req.headers['x-payment'] as string | undefined;

  if (!paymentHeader) {
    // 无支付信息 → 返回 402 Payment Required
    const paymentRequired = buildPaymentRequired(req, config);
    res.status(X402_STATUS).json(paymentRequired);
    return;
  }

  // 验证 X-PAYMENT 头
  try {
    const paymentData = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));

    if (paymentData.x402Version !== X402_VERSION) {
      res.status(X402_STATUS).json({
        x402Version: X402_VERSION,
        accepts: buildAcceptsList(req, config),
        error: `Unsupported x402 version: ${paymentData.x402Version}`,
      });
      return;
    }

    // 验证资产类型是否在接受列表中
    if (!config.acceptTokens.includes(paymentData.asset as TokenType)) {
      res.status(X402_STATUS).json({
        x402Version: X402_VERSION,
        accepts: buildAcceptsList(req, config),
        error: `Asset ${paymentData.asset} not accepted, expected one of: ${config.acceptTokens.join(',')}`,
      });
      return;
    }

    // 支付验证通过 — 将支付信息附加到请求
    req.x402Payment = paymentData;
    next();
  } catch {
    // 支付数据格式错误 → 返回 402
    res.status(X402_STATUS).json({
      x402Version: X402_VERSION,
      accepts: buildAcceptsList(req, config),
      error: 'Invalid X-PAYMENT header format',
    });
  }
}

/**
 * 构建 402 Payment Required 响应
 */
function buildPaymentRequired(req: Request, config: X402RouteConfig): X402PaymentRequired {
  return {
    x402Version: X402_VERSION,
    accepts: buildAcceptsList(req, config),
  };
}

/**
 * 构建支付方式列表
 */
function buildAcceptsList(req: Request, config: X402RouteConfig): X402PaymentOption[] {
  return config.acceptTokens.map(token => ({
    scheme: config.scheme || 'exact',
    network: 'atex-mainnet',
    maxAmountRequired: String(config.price),
    resource: `${req.method} ${req.route?.path || req.path}`,
    description: config.description,
    mimeType: 'application/json',
    payTo: 'atex-treasury', // ATEX 国库地址
    maxTimeoutSeconds: config.maxTimeoutSeconds || 60,
    asset: token,
  }));
}

/**
 * 获取所有已注册的 x402 路由（供管理 API 使用）
 */
export function getX402Routes(): Record<string, X402RouteConfig> {
  const result: Record<string, X402RouteConfig> = {};
  for (const [route, config] of routeConfigs) {
    result[route] = config;
  }
  return result;
}

// Express Request 扩展
declare global {
  namespace Express {
    interface Request {
      x402Payment?: {
        x402Version: number;
        scheme: string;
        network: string;
        payload: string;
        asset: string;
        amount?: number;
      };
    }
  }
}

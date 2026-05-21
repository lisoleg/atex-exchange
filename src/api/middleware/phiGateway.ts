/**
 * Φ-Gateway 中间件
 * 拦截所有交易请求，通过 Φ-Gateway 四级决策引擎评估
 */

import { Request, Response, NextFunction } from 'express';
import { phiGatewayEngine } from '../../gateway/phiGatewayEngine';
import { PhiGatewayLevel } from '../../types/atex.types';
import { initializePhiFromDID } from '../../math/emlPhi';
import { getOpenOffers } from '../../models/offer.model';
import type { CreateOfferRequest, OrderBookEntry } from '../../types/atex.types';

/**
 * Φ-Gateway 中间件
 * 对所有 /api/v1/atex/offer 和 /api/v1/atex/accept 路由生效
 */
export async function phiGatewayMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const senderDid = req.body.offererDid || req.body.receiverDid || req.headers['x-atex-did'] as string;

    if (!senderDid) {
      res.status(400).json({
        error: 'ATEX_001',
        message: '缺少发送方 DID',
      });
      return;
    }

    // 获取发送方 Φ 值
    const senderPhi = initializePhiFromDID(senderDid);

    // 获取当前订单簿 (用于 139 检测)
    const { entries } = await getOpenOffers();
    const orderBookEntries: OrderBookEntry[] = entries.map(e => ({
      offerId: e.id,
      offererDid: e.offererDid,
      offerTokenType: e.offerTokenType,
      offerAmount: e.offerAmount,
      reqTokenType: e.reqTokenType,
      reqAmount: e.reqAmount,
      phiDiff: e.phiDiff || 0,
      expiresAt: e.expiresAt,
      gatewayLevel: e.gatewayLevel,
    }));

    // 构造请求对象 (简化)
    const request: CreateOfferRequest = {
      offererDid: senderDid,
      offerTokenType: req.body.offerTokenType || 'CALC',
      offerAmount: req.body.offerAmount || 0,
      reqTokenType: req.body.reqTokenType || 'WIT',
      reqAmount: req.body.reqAmount || 0,
    };

    // 执行 Φ-Gateway 决策
    const result = phiGatewayEngine(
      senderDid,
      request,
      [senderPhi],
      orderBookEntries
    );

    // 附加到请求对象
    req.phiGatewayResult = result;

    // 根据决策结果处理
    if (result.level === PhiGatewayLevel.REJECT) {
      res.status(403).json({
        error: 'ATEX_001',
        message: result.reason || 'Φ-Gateway 拒绝交易',
        gatewayResult: result,
      });
      return;
    }

    if (result.level === PhiGatewayLevel.THROTTLE) {
      res.status(429).json({
        error: 'ATEX_007',
        message: result.reason || 'Φ-Gateway 限流，稍后重试',
        gatewayResult: result,
      });
      return;
    }

    // PRIORITY 或 NORMAL：放行
    next();
  } catch (error) {
    next(error);
  }
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      phiGatewayResult?: import('../../types/atex.types').PhiGatewayResult;
    }
  }
}

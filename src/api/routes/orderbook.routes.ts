/**
 * GET /orderbook 路由
 * 查询订单簿
 */

import { Router, Request, Response } from 'express';
import { getOpenOffers } from '../../models/offer.model';
import type { OrderBookEntry, OrderBookResponse } from '../../types/atex.types';
import { TokenType } from '../../types/atex.types';

const router = Router();

/**
 * GET /orderbook
 * 查询订单簿（开放的 Offer 列表）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const offerTokenType = req.query.offerTokenType as TokenType | undefined;
    const reqTokenType = req.query.reqTokenType as TokenType | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { entries, total } = await getOpenOffers({
      offerTokenType,
      reqTokenType,
      limit,
      offset,
    });

    // 转换为 OrderBookEntry
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

    const response: OrderBookResponse = {
      entries: orderBookEntries,
      total,
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

export default router;

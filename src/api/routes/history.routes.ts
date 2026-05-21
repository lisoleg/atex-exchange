/**
 * GET /history 路由
 * 查询交易历史
 */

import { Router, Request, Response } from 'express';
import { getTransactionHistory, getRecentTransactions } from '../../models/transaction.model';
import type { HistoryQueryParams, HistoryResponse } from '../../types/atex.types';
import { TokenType, OfferStatus } from '../../types/atex.types';

const router = Router();

/**
 * GET /history
 * 查询交易历史（分页 + 筛选）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tokenType = req.query.tokenType as TokenType | undefined;
    const fromDid = req.query.fromDid as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const params: HistoryQueryParams = {
      tokenType,
      fromDid,
      page,
      limit,
    };

    const { transactions, total } = await getTransactionHistory(params);

    const response: HistoryResponse = {
      transactions,
      total,
      page,
      limit,
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /history/recent
 * 查询最近交易
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const transactions = await getRecentTransactions(limit);
    res.json({ transactions });
  } catch (error) {
    throw error;
  }
});

export default router;

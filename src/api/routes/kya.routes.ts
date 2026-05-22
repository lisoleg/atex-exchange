/**
 * KYA 信用路由 — /api/v1/kya/*
 * 借鉴 AEON KYA 信用系统
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { computeKYACredit } from '../../kya/kya.service';

const router = Router();

/**
 * GET /api/v1/kya/credit — 查询当前 Agent 的 KYA 信用报告
 */
router.get('/credit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const report = await computeKYACredit(req.did!);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/kya/credit/:did — 查询指定 Agent 的 KYA 信用报告
 */
router.get('/credit/:did', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const report = await computeKYACredit(did);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

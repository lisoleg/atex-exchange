/**
 * GET /matching 路由
 * 相位纠缠撮合引擎 API
 */

import { Router, Request, Response } from 'express';
import { getOpenOffers } from '../../models/offer.model';
import { getPhaseIndex } from '../../matching/phaseIndex';
import { findMatches, batchMatch, adaptiveTolerance } from '../../matching/phaseMatchingEngine';
import { getDAGEngine } from '../../dag/dagConsensus';
import { getPhaseCalibrator } from '../../math/phaseCalibrator';
import { getPrivacyPhiEngine } from '../../math/privacyPhi';
import { getTriSpinOptimizer } from '../../math/triSpinOptimizer';
import { getScalableLiuRouter } from '../../federation/scalableLiuRouter';
import type { TokenType } from '../../types/atex.types';

const router = Router();

/**
 * GET /matching/find/:offerId
 * 查找指定 Offer 的撮合对手
 */
router.get('/find/:offerId', async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const tolerance = parseFloat(req.query.tolerance as string) || undefined;

    // 从订单簿获取 Offer
    const { entries } = await getOpenOffers({ limit: 100 });
    const offer = entries.find(e => e.id === offerId);

    if (!offer) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Offer 不存在' });
      return;
    }

    const matches = findMatches(offer, tolerance);

    res.json({
      offerId,
      matchCount: matches.length,
      matches: matches.map(m => ({
        counterpartyOfferId: m.counterparty.id,
        counterpartyDid: m.counterparty.offererDid,
        phaseDiff: m.phaseDiff,
        phiAffinity: m.phiAffinity,
        matchQuality: m.matchQuality,
      })),
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /matching/batch
 * 批量撮合所有待撮合 Offer
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { entries } = await getOpenOffers({ limit: 100 });
    const matches = batchMatch(entries);

    res.json({
      totalOffers: entries.length,
      matchCount: matches.length,
      matches: matches.slice(0, 50).map(m => ({
        initiatorOfferId: m.initiator.id,
        counterpartyOfferId: m.counterparty.id,
        matchQuality: m.matchQuality,
      })),
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /matching/adaptive-tolerance
 * 获取自适应容差
 */
router.get('/adaptive-tolerance', (req: Request, res: Response) => {
  const volatility = parseFloat(req.query.volatility as string) || 0;
  const tolerance = adaptiveTolerance(volatility);

  res.json({
    volatility,
    tolerance,
    baseThreshold: Math.PI / 4,
  });
});

/**
 * GET /matching/index/stats
 * Phase Index 统计
 */
router.get('/index/stats', (req: Request, res: Response) => {
  const index = getPhaseIndex();
  res.json(index.get_state());
});

/**
 * GET /matching/dag/stats
 * DAG 共识引擎统计
 */
router.get('/dag/stats', (req: Request, res: Response) => {
  const dag = getDAGEngine();
  res.json(dag.get_state());
});

/**
 * GET /matching/calibrator/stats
 * 139 相变自动校准器统计
 */
router.get('/calibrator/stats', (req: Request, res: Response) => {
  const calibrator = getPhaseCalibrator();
  res.json(calibrator.get_state());
});

/**
 * GET /matching/scalability/stats
 * 可扩展路由器统计
 */
router.get('/scalability/stats', (req: Request, res: Response) => {
  const router = getScalableLiuRouter();
  res.json(router.get_state());
});

/**
 * GET /matching/optimizer/stats
 * 三旋权重优化器统计
 */
router.get('/optimizer/stats', (req: Request, res: Response) => {
  const optimizer = getTriSpinOptimizer();
  res.json(optimizer.get_state());
});

/**
 * GET /matching/privacy/stats
 * 隐私 Φ 计算引擎统计
 */
router.get('/privacy/stats', (req: Request, res: Response) => {
  const privacy = getPrivacyPhiEngine();
  res.json(privacy.get_state());
});

export default router;

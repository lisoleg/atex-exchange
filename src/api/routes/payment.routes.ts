/**
 * x402 支付路由 — /api/v1/payment/*
 *
 * 借鉴 AEON 结算层：
 * - POST /verify — 验证支付有效性
 * - POST /settle — 执行链上结算
 * - GET /receipt/:id — 查询可验证收据
 * - GET /routes — 查询已注册的 x402 付费路由
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { verifyPayment, settlePayment } from '../../payment/x402.service';
import { getX402Routes } from '../../payment/x402.middleware';

const router = Router();

// 所有支付路由需要认证
router.use(authMiddleware);

/**
 * POST /api/v1/payment/verify — 验证支付
 *
 * Agent 在发送 402 响应后，可先调用此接口预验证支付有效性
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { paymentData } = req.body;
    if (!paymentData || !paymentData.asset) {
      res.status(400).json({ error: 'paymentData with asset field is required' });
      return;
    }

    const result = await verifyPayment(paymentData, req.did!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/payment/settle — 结算支付
 *
 * Agent 确认支付后调用此接口执行结算
 */
router.post('/settle', async (req: Request, res: Response) => {
  try {
    const { paymentData, payeeDid, resource } = req.body;
    if (!paymentData || !paymentData.asset || !paymentData.amount) {
      res.status(400).json({ error: 'paymentData with asset and amount is required' });
      return;
    }
    if (!payeeDid) {
      res.status(400).json({ error: 'payeeDid is required' });
      return;
    }

    // 先验证
    const verifyResult = await verifyPayment(paymentData, req.did!);
    if (!verifyResult.valid) {
      res.status(402).json({ error: verifyResult.reason });
      return;
    }

    // 执行结算
    const result = await settlePayment(
      paymentData,
      req.did!,
      payeeDid,
      resource || 'atex-service',
    );

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    // 设置 X-PAYMENT-RESPONSE 头（ERC-8004 风格）
    if (result.response) {
      res.setHeader('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify(result.response)).toString('base64'));
    }

    res.json({
      settled: true,
      txHash: result.response?.txHash,
      receipt: result.receipt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/payment/routes — 查询已注册的 x402 路由
 */
router.get('/routes', (_req: Request, res: Response) => {
  res.json({
    x402Version: 1,
    routes: getX402Routes(),
  });
});

export default router;

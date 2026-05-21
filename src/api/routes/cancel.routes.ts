/**
 * POST /cancel/:offerId 路由
 * 取消交易报价
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { getOfferById, updateOfferStatus } from '../../models/offer.model';
import { createTransaction } from '../../models/transaction.model';
import { createCancelActivity } from '../../federation/activityPubAdapter';
import { broadcastToPeers } from '../../federation/liuRouter';
import { storeActivityHash } from '../../consensus/holoboundaryStore';
import { OfferStatus, TransactionType, TokenType } from '../../types/atex.types';
import { AtexError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

/** Cancel 请求 Schema */
const cancelSchema = z.object({
  offererDid: z.string().min(10),
});

/**
 * POST /cancel/:offerId
 * 取消交易报价
 */
router.post('/:offerId', async (req: Request, res: Response) => {
  try {
    // 1. 请求验证
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.error.message,
      });
      return;
    }

    const { offererDid } = parsed.data;
    const { offerId } = req.params;

    // 2. 查询 Offer
    const offer = await getOfferById(offerId);
    if (!offer) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Offer 不存在' });
      return;
    }

    // 3. 验证：只有 offerer 能取消
    if (offer.offererDid !== offererDid) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: '只有 Offer 发起方可以取消',
      });
      return;
    }

    // 4. 验证：只有 OPEN 状态的 Offer 可以取消
    if (offer.status !== OfferStatus.OPEN) {
      res.status(400).json({
        error: 'INVALID_STATUS',
        message: `Offer 状态不是 OPEN: ${offer.status}`,
      });
      return;
    }

    // 5. 销毁临时 Token (Issued → Consumed)
    const tempTokens = await prisma.token.findMany({
      where: { offerId: offer.id, status: 'ISSUED' },
    });
    if (tempTokens.length > 0) {
      await prisma.token.updateMany({
        where: { id: { in: tempTokens.map(t => t.id) } },
        data: { status: 'CONSUMED' },
      });
    }

    // 6. 解锁原始 Token (Locked → Active)
    const lockedTokens = await prisma.token.findMany({
      where: { ownerDid: offererDid, status: 'LOCKED' },
    });
    if (lockedTokens.length > 0) {
      await prisma.token.updateMany({
        where: { id: { in: lockedTokens.map(t => t.id) } },
        data: { status: 'ACTIVE' },
      });
    }

    // 7. 更新 Offer 状态
    await updateOfferStatus(offer.id, OfferStatus.CANCELLED);

    // 8. 创建交易记录 (相位松弛)
    const releasedTokenId = lockedTokens.length > 0 ? lockedTokens[0].id : '';
    await createTransaction({
      offerId: offer.id,
      type: TransactionType.PHASE_RELAXATION,
      fromDid: offererDid,
      toDid: offer.receiverDid || '',
      tokenType: offer.offerTokenType as TokenType,
      amount: offer.offerAmount,
    });

    // 9. 广播取消 Activity
    const cancelActivity = createCancelActivity(
      offer.activityId || '',
      offererDid
    );
    broadcastToPeers(offererDid, cancelActivity);
    storeActivityHash(cancelActivity);

    // 10. 返回响应
    res.json({
      offerId: offer.id,
      status: OfferStatus.CANCELLED,
      releasedTokenId,
    });
  } catch (error) {
    if (error instanceof AtexError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    throw error;
  }
});

export default router;

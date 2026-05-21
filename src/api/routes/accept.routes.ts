/**
 * POST /accept/:offerId 路由
 * 接受交易报价
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  topologicalPhaseTransition,
  validateAcceptOffer,
} from '../../core/topologicalPhaseTransition';
import { processAcceptActivity, validateAcceptRequest } from '../../federation/acceptActivity';
import { executeFullTAI } from '../../consensus/taiEngine';
import { initializePhiFromDID } from '../../math/emlPhi';
import { getOfferById, updateOfferStatus } from '../../models/offer.model';
import { createTransaction, getTransactionsByOfferId } from '../../models/transaction.model';
import { storeActivityHash } from '../../consensus/holoboundaryStore';
import { TokenType, OfferStatus, TransactionType, TokenStatus } from '../../types/atex.types';
import { AtexError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

/** Accept 请求 Schema */
const acceptSchema = z.object({
  receiverDid: z.string().min(10),
});

/**
 * POST /accept/:offerId
 * 接受交易报价
 */
router.post('/:offerId', async (req: Request, res: Response) => {
  try {
    // 1. 请求验证
    const parsed = acceptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.error.message,
      });
      return;
    }

    const { receiverDid } = parsed.data;
    const { offerId } = req.params;

    // 2. 查询 Offer
    const offer = await getOfferById(offerId);
    if (!offer) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Offer 不存在' });
      return;
    }

    // 3. 验证 Accept
    const acceptValidation = validateAcceptRequest(offer, receiverDid);
    if (!acceptValidation.valid) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: acceptValidation.error,
      });
      return;
    }

    // 4. 获取双方 Φ 值
    const offererPhi = initializePhiFromDID(offer.offererDid);
    const receiverPhi = initializePhiFromDID(receiverDid);

    // 5. 查询临时 Token
    const tempTokens = await prisma.token.findMany({
      where: { offerId: offer.id, status: 'ISSUED' },
    });

    // 6. 查询被锁定的 Token
    const lockedTokens = await prisma.token.findMany({
      where: { ownerDid: offer.offererDid, status: 'LOCKED' },
    });

    // 7. 获取当前供应量
    const supplyResult = await prisma.token.aggregate({
      _sum: { amount: true },
      where: {
        status: { notIn: ['RECYCLED', 'CONSUMED'] },
      },
    });
    const currentSupply = supplyResult._sum.amount || 0;

    // 8. 执行拓扑相变
    const transitionResult = topologicalPhaseTransition(
      offer,
      offererPhi,
      receiverPhi,
      tempTokens.map(t => ({
        id: t.id,
        type: t.type as TokenType,
        status: t.status as unknown as import('../../types/atex.types').TokenStatus,
        amount: t.amount,
        phi: { magnitude: t.phiMagnitude, phase: t.phiPhase },
        ownerDid: t.ownerDid,
        offerId: t.offerId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      lockedTokens.map(t => ({
        id: t.id,
        type: t.type as TokenType,
        status: t.status as unknown as import('../../types/atex.types').TokenStatus,
        amount: t.amount,
        phi: { magnitude: t.phiMagnitude, phase: t.phiPhase },
        ownerDid: t.ownerDid,
        offerId: t.offerId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      currentSupply
    );

    // 9. 根据相变结果执行操作
    if (transitionResult.matched) {
      // === 拓扑相变成功 ===

      // 9a. 执行 TAI (交易即发行)
      const taiResult = executeFullTAI(
        offer,
        offererPhi,
        receiverPhi,
        tempTokens.map(t => ({
          id: t.id,
          type: t.type as TokenType,
          status: t.status as unknown as import('../../types/atex.types').TokenStatus,
          amount: t.amount,
          phi: { magnitude: t.phiMagnitude, phase: t.phiPhase },
          ownerDid: t.ownerDid,
          offerId: t.offerId,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        lockedTokens.map(t => ({
          id: t.id,
          type: t.type as TokenType,
          status: t.status as unknown as import('../../types/atex.types').TokenStatus,
          amount: t.amount,
          phi: { magnitude: t.phiMagnitude, phase: t.phiPhase },
          ownerDid: t.ownerDid,
          offerId: t.offerId,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        currentSupply
      );

      // 9b. 创建 Alice 的 Token
      const aliceToken = transitionResult.aliceTokenData!;
      const newAliceToken = await prisma.token.create({
        data: {
          type: aliceToken.type,
          status: 'ACTIVE',
          amount: aliceToken.amount,
          phiMagnitude: aliceToken.phiMagnitude,
          phiPhase: aliceToken.phiPhase,
          ownerDid: offer.offererDid,
        },
      });

      // 9c. 创建 Bob 的 Token
      const bobToken = transitionResult.bobTokenData!;
      const newBobToken = await prisma.token.create({
        data: {
          type: bobToken.type,
          status: 'ACTIVE',
          amount: bobToken.amount,
          phiMagnitude: bobToken.phiMagnitude,
          phiPhase: bobToken.phiPhase,
          ownerDid: receiverDid,
        },
      });

      // 9d. 销毁临时 Token
      await prisma.token.updateMany({
        where: { id: { in: transitionResult.tempTokenIds } },
        data: { status: 'CONSUMED' },
      });

      // 9e. 回收原始 Token
      await prisma.token.updateMany({
        where: { id: { in: transitionResult.recycleTokenIds } },
        data: { status: 'RECYCLED' },
      });

      // 9f. 更新 Offer 状态
      await updateOfferStatus(offer.id, OfferStatus.SETTLED);

      // 9g. 创建交易记录
      await createTransaction({
        offerId: offer.id,
        type: TransactionType.TOPOLOGICAL_TRANSITION,
        fromDid: offer.offererDid,
        toDid: receiverDid,
        tokenType: offer.reqTokenType as TokenType,
        amount: offer.reqAmount,
        phiBefore: offererPhi.phase,
        phiAfter: receiverPhi.phase,
      });

      // 9h. 处理联邦逻辑
      const activityResult = processAcceptActivity(
        offer,
        receiverDid,
        newAliceToken.id,
        newBobToken.id,
        TransactionType.TOPOLOGICAL_TRANSITION,
        transitionResult.phiMatchDetail.phaseDiff
      );

      // 9i. 存储哈希
      storeActivityHash(activityResult.activity);

      // 9j. 返回成功
      res.json(activityResult.response);
    } else {
      // === 相位松弛 (Φ 不匹配) ===

      // 销毁临时 Token
      await prisma.token.updateMany({
        where: { id: { in: transitionResult.tempTokenIds } },
        data: { status: 'CONSUMED' },
      });

      // 解锁原始 Token
      await prisma.token.updateMany({
        where: { id: { in: transitionResult.unlockTokenIds } },
        data: { status: 'ACTIVE' },
      });

      // 更新 Offer 状态 (保持 OPEN，允许其他人尝试)
      // 或标记为失败
      res.status(409).json({
        error: 'ATEX_002',
        message: `Φ 值不匹配，相位差=${transitionResult.phiMatchDetail.phaseDiff.toFixed(4)}，阈值=${transitionResult.phiMatchDetail.threshold.toFixed(4)}`,
        phiMatchDetail: transitionResult.phiMatchDetail,
      });
    }
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

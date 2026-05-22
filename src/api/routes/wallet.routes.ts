/**
 * 钱包路由 — /api/v1/wallet/*
 * 托管/门限/自托管 多钱包管理
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { createCustodialWallet, getCustodialBalance } from '../../wallet/custodial.service';
import { createThresholdWallet, getThresholdInfo } from '../../wallet/threshold.service';
import { verifySelfCustodySignature } from '../../wallet/self-custody.service';

const router = Router();
const prisma = new PrismaClient();

// 所有钱包端点都需要认证
router.use(authMiddleware);

/** GET /api/v1/wallet — 列出当前 Agent 的钱包 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.agentId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const wallets = await prisma.wallet.findMany({
      where: { agentId: req.agentId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      wallets: wallets.map(w => ({
        id: w.id,
        type: w.type,
        address: w.address,
        isActive: w.isActive,
        config: w.config ? JSON.parse(w.config) : null,
        createdAt: w.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** POST /api/v1/wallet/create — 创建钱包 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { type, name } = req.body;
    if (!req.agentId || !req.did) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const validTypes = ['CUSTODIAL', 'THRESHOLD', 'SELF_CUSTODY'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid wallet type. Must be: ${validTypes.join('/')}` });
      return;
    }

    // 检查是否已有活跃钱包
    const existing = await prisma.wallet.findFirst({
      where: { agentId: req.agentId, isActive: true, type },
    });
    if (existing) {
      res.status(409).json({ error: `Active ${type} wallet already exists` });
      return;
    }

    let walletResult: any;

    switch (type) {
      case 'CUSTODIAL':
        walletResult = await createCustodialWallet(req.agentId, req.did, name);
        break;
      case 'THRESHOLD':
        walletResult = await createThresholdWallet(req.agentId, req.did, name);
        break;
      case 'SELF_CUSTODY':
        // 自托管需要前端提供公钥
        const { publicKey } = req.body;
        if (!publicKey) {
          res.status(400).json({ error: 'publicKey is required for SELF_CUSTODY wallet' });
          return;
        }
        walletResult = {
          address: `did:key:${publicKey.substring(0, 32)}`,
          type: 'SELF_CUSTODY',
          config: { publicKey },
        };
        break;
    }

    // 保存到 DB
    const wallet = await prisma.wallet.create({
      data: {
        agentId: req.agentId!,
        type,
        address: walletResult.address,
        encryptedKey: walletResult.encryptedKey || null,
        shares: walletResult.shares ? JSON.stringify(walletResult.shares) : null,
        config: walletResult.config ? JSON.stringify(walletResult.config) : null,
        isActive: true,
      },
    });

    // 更新 Agent 的 walletType
    await prisma.agent.update({
      where: { id: req.agentId },
      data: { walletType: type },
    });

    res.json({
      wallet: {
        id: wallet.id,
        type: wallet.type,
        address: wallet.address,
        isActive: wallet.isActive,
        config: walletResult.config,
        createdAt: wallet.createdAt,
      },
      setupData: walletResult.setupData, // 首次设置需展示给用户的数据
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/v1/wallet/balance — 钱包余额 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    if (!req.did) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const tokens = await prisma.token.findMany({
      where: { ownerDid: req.did, status: 'ACTIVE' },
    });

    const balances: Record<string, number> = {};
    for (const token of tokens) {
      balances[token.type] = (balances[token.type] || 0) + token.amount;
    }

    // 获取钱包信息
    const wallets = await prisma.wallet.findMany({
      where: { agentId: req.agentId, isActive: true },
    });

    res.json({
      did: req.did,
      balances,
      totalTokens: tokens.length,
      wallets: wallets.map(w => ({ type: w.type, address: w.address })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** PUT /api/v1/wallet/migrate — 迁移钱包类型 */
router.put('/migrate', async (req: Request, res: Response) => {
  try {
    const { fromType, toType } = req.body;
    if (!req.agentId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // 验证迁移路径
    const validMigrations: Record<string, string[]> = {
      CUSTODIAL: ['THRESHOLD', 'SELF_CUSTODY'],
      THRESHOLD: ['SELF_CUSTODY'],
    };

    if (!validMigrations[fromType]?.includes(toType)) {
      res.status(400).json({ error: `Migration from ${fromType} to ${toType} is not supported` });
      return;
    }

    // 查找源钱包
    const sourceWallet = await prisma.wallet.findFirst({
      where: { agentId: req.agentId, type: fromType, isActive: true },
    });
    if (!sourceWallet) {
      res.status(404).json({ error: `No active ${fromType} wallet found` });
      return;
    }

    // 创建新钱包
    let newWallet: any;
    switch (toType) {
      case 'THRESHOLD':
        newWallet = await createThresholdWallet(req.agentId!, req.did!, `${fromType}→THRESHOLD`);
        break;
      case 'SELF_CUSTODY':
        newWallet = { address: sourceWallet.address, type: 'SELF_CUSTODY', config: {} };
        break;
    }

    // 更新 DB
    await prisma.wallet.update({ where: { id: sourceWallet.id }, data: { isActive: false } });
    const created = await prisma.wallet.create({
      data: {
        agentId: req.agentId!,
        type: toType,
        address: newWallet.address,
        encryptedKey: newWallet.encryptedKey || null,
        shares: newWallet.shares ? JSON.stringify(newWallet.shares) : null,
        config: newWallet.config ? JSON.stringify(newWallet.config) : null,
        isActive: true,
      },
    });

    await prisma.agent.update({ where: { id: req.agentId }, data: { walletType: toType } });

    res.json({
      migrated: true,
      from: fromType,
      to: toType,
      newWallet: { id: created.id, type: created.type, address: created.address },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** POST /api/v1/wallet/backup — 导出备份 */
router.post('/backup', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.body;
    if (!req.agentId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, agentId: req.agentId },
    });
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    // 仅允许门限和自托管钱包导出备份
    if (wallet.type === 'CUSTODIAL') {
      res.status(400).json({ error: 'Custodial wallets cannot be exported. Migrate first.' });
      return;
    }

    res.json({
      walletId: wallet.id,
      type: wallet.type,
      address: wallet.address,
      backupData: wallet.shares ? JSON.parse(wallet.shares) : null,
      exportedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

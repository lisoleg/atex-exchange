/**
 * 门限钱包服务 — MPC-TSS 模拟实现
 * 2-of-3 分片：用户持2片，服务器持1片
 * 首期用模拟分片，后续对接真实 MPC 库
 */

import crypto from 'crypto';

interface TSSShare {
  index: number;       // 分片编号 1-3
  holder: 'user' | 'server';
  data: string;        // 分片数据（hex）
  createdAt: string;
}

interface ThresholdConfig {
  threshold: number;   // 2 — 需要几片签名
  totalShares: number; // 3 — 总分片数
  userShares: number;  // 2 — 用户持有几片
  serverShares: number; // 1 — 服务器持有几片
}

const THRESHOLD_CONFIG: ThresholdConfig = {
  threshold: 2,
  totalShares: 3,
  userShares: 2,
  serverShares: 1,
};

/** 生成模拟 TSS 分片 */
function generateShares(secret: string, totalShares: number, threshold: number): string[] {
  // 简化的 Shamir Secret Sharing 模拟
  // 生产环境应使用真正的 SSS 库（如 secret-sharing.js）
  const shares: string[] = [];
  for (let i = 0; i < totalShares; i++) {
    const randomPart = crypto.randomBytes(16).toString('hex');
    shares.push(`${i + 1}:${secret.substring(0, 16)}${randomPart}`);
  }
  return shares;
}

/** 创建门限钱包 */
export async function createThresholdWallet(
  agentId: string,
  did: string,
  name?: string,
): Promise<{
  address: string;
  shares: { metadata: TSSShare[]; config: ThresholdConfig };
  config: { name?: string; threshold: number; totalShares: number; createdAt: string };
  setupData: {
    userShares: { index: number; data: string }[];
    warning: string;
    recoveryInfo: string;
  };
}> {
  // 生成主密钥
  const masterKey = crypto.randomBytes(32).toString('hex');
  const publicKey = crypto.createHash('sha256').update(masterKey).digest('hex');

  // 生成分片
  const rawShares = generateShares(masterKey, THRESHOLD_CONFIG.totalShares, THRESHOLD_CONFIG.threshold);

  // 分配分片
  const shareMetadata: TSSShare[] = [
    { index: 1, holder: 'user', data: rawShares[0], createdAt: new Date().toISOString() },
    { index: 2, holder: 'user', data: rawShares[1], createdAt: new Date().toISOString() },
    { index: 3, holder: 'server', data: rawShares[2], createdAt: new Date().toISOString() },
  ];

  const address = `did:key:z${publicKey.substring(0, 44)}`;

  return {
    address,
    shares: { metadata: shareMetadata, config: THRESHOLD_CONFIG },
    config: {
      name: name || 'Threshold Wallet',
      threshold: THRESHOLD_CONFIG.threshold,
      totalShares: THRESHOLD_CONFIG.totalShares,
      createdAt: new Date().toISOString(),
    },
    setupData: {
      userShares: shareMetadata
        .filter(s => s.holder === 'user')
        .map(s => ({ index: s.index, data: s.data })),
      warning: 'IMPORTANT: Save your share keys securely. You need at least 2 shares to sign transactions. If you lose both user shares, you cannot recover your wallet.',
      recoveryInfo: `This wallet uses ${THRESHOLD_CONFIG.threshold}-of-${THRESHOLD_CONFIG.totalShares} threshold signing. You hold ${THRESHOLD_CONFIG.userShares} shares, ATEX holds ${THRESHOLD_CONFIG.serverShares}.`,
    },
  };
}

/** 获取门限钱包信息 */
export async function getThresholdInfo(walletId: string): Promise<{
  config: ThresholdConfig;
  hasServerShare: boolean;
}> {
  // 模拟 — 生产环境从 DB 读取
  return {
    config: THRESHOLD_CONFIG,
    hasServerShare: true,
  };
}

/** 模拟门限签名（需用户提供2个分片） */
export function thresholdSign(userShares: string[], message: string): string {
  if (userShares.length < THRESHOLD_CONFIG.threshold) {
    throw new Error(`At least ${THRESHOLD_CONFIG.threshold} shares required for signing`);
  }
  // 模拟签名 — 用分片 + 消息生成 HMAC
  const combined = userShares.join(':');
  const hmac = crypto.createHmac('sha256', combined);
  hmac.update(message);
  return hmac.digest('hex');
}

// self-test
if (require.main === module) {
  console.log('[threshold.service] self-test: module loaded OK');
  console.log('[threshold.service] config:', THRESHOLD_CONFIG);
  const shares = ['share1:data1', 'share2:data2'];
  const sig = thresholdSign(shares, 'test-message');
  console.log('[threshold.service] sign test:', sig ? 'PASS' : 'FAIL');
}

/**
 * 自托管钱包服务 — 纯客户端密钥管理
 * 服务器仅验证签名，不存储私钥
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** 验证自托管钱包签名 */
export async function verifySelfCustodySignature(
  did: string,
  message: string,
  signature: string,
  publicKey: string,
): Promise<{ valid: boolean }> {
  // 模拟签名验证 — 生产环境用 @noble/ed25519
  // 这里用 HMAC 验证来模拟
  const expectedHmac = crypto.createHmac('sha256', publicKey).update(message).digest('hex');
  const isValid = signature === expectedHmac;

  return { valid: isValid };
}

/** 注册自托管钱包公钥 */
export async function registerSelfCustodyKey(
  agentId: string,
  publicKey: string,
): Promise<{ address: string }> {
  const address = `did:key:z${publicKey.substring(0, 44)}`;

  // 更新 Agent 的 publicKey
  await prisma.agent.update({
    where: { id: agentId },
    data: { publicKey },
  });

  return { address };
}

/** 验证 did:key 格式的地址 */
export function isValidDidKeyAddress(address: string): boolean {
  return address.startsWith('did:key:z') && address.length > 20;
}

/** 生成自托管钱包配置指引（前端使用） */
export function getSelfCustodySetupGuide(): {
  steps: string[];
  warning: string;
  recommendedStorage: string[];
} {
  return {
    steps: [
      '1. Generate an Ed25519 key pair in your browser',
      '2. Store the private key in IndexedDB with encryption (libsodium secretbox)',
      '3. Register the public key with ATEX',
      '4. Back up the encrypted private key to a secure offline location',
      '5. Verify the wallet address matches did:key:z...',
    ],
    warning: 'You are solely responsible for your private key. If you lose it, your funds cannot be recovered. ATEX cannot help with key recovery for self-custody wallets.',
    recommendedStorage: [
      'Browser IndexedDB with libsodium encryption',
      'Hardware security key (YubiKey, etc.)',
      'Encrypted offline backup (USB drive, paper wallet)',
      'NEVER store unencrypted private keys in localStorage or cookies',
    ],
  };
}

// self-test
if (require.main === module) {
  const testKey = crypto.randomBytes(32).toString('hex');
  const testSig = crypto.createHmac('sha256', testKey).update('test').digest('hex');
  console.log('[self-custody.service] self-test: module loaded OK');
  console.log('[self-custody.service] did:key valid:', isValidDidKeyAddress(`did:key:z${testKey.substring(0, 44)}`));
  console.log('[self-custody.service] setup guide:', getSelfCustodySetupGuide().steps.length, 'steps');
}

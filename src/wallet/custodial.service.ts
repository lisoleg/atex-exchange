/**
 * 托管钱包服务 — AES-256-GCM 加密存储
 * 服务端管理私钥，适合新手用户
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'atex-dev-encryption-key-32byte!!'; // 32 bytes for AES-256
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/** 生成 Ed25519 密钥对（模拟 — 生产环境用 @noble/ed25519） */
function generateKeyPair(): { publicKey: string; privateKey: string } {
  const privateKey = crypto.randomBytes(32).toString('hex');
  const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
  return { publicKey, privateKey };
}

/** AES-256-GCM 加密 */
function encrypt(plaintext: string, key: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key.padEnd(32, '0').substring(0, 32)), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/** AES-256-GCM 解密 */
function decrypt(ciphertext: string, key: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key.padEnd(32, '0').substring(0, 32)), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/** 创建托管钱包 */
export async function createCustodialWallet(
  agentId: string,
  did: string,
  name?: string,
): Promise<{
  address: string;
  encryptedKey: string;
  config: { name?: string; createdAt: string };
  setupData: { did: string; warning: string };
}> {
  // 生成密钥对
  const { publicKey, privateKey } = generateKeyPair();

  // 加密私钥
  const encryptedKey = encrypt(privateKey, ENCRYPTION_KEY);

  // 生成钱包地址 (did:key 格式)
  const address = `did:key:z${publicKey.substring(0, 44)}`;

  return {
    address,
    encryptedKey,
    config: { name: name || 'Custodial Wallet', createdAt: new Date().toISOString() },
    setupData: {
      did: address,
      warning: 'Your private key is managed by ATEX. For enhanced security, consider migrating to a threshold or self-custody wallet.',
    },
  };
}

/** 解密托管钱包私钥（签名时使用） */
export function decryptCustodialKey(encryptedKey: string): string {
  return decrypt(encryptedKey, ENCRYPTION_KEY);
}

/** 获取托管钱包余额 */
export async function getCustodialBalance(did: string): Promise<Record<string, number>> {
  const tokens = await prisma.token.findMany({ where: { ownerDid: did, status: 'ACTIVE' } });
  const balances: Record<string, number> = {};
  for (const token of tokens) {
    balances[token.type] = (balances[token.type] || 0) + token.amount;
  }
  return balances;
}

/** 用托管钱包签名消息 */
export function signWithCustodial(encryptedKey: string, message: string): string {
  const privateKey = decryptCustodialKey(encryptedKey);
  // 模拟签名 — 生产环境用 @noble/ed25519
  const hmac = crypto.createHmac('sha256', privateKey);
  hmac.update(message);
  return hmac.digest('hex');
}

// self-test
if (require.main === module) {
  const keyPair = generateKeyPair();
  const encrypted = encrypt('test-private-key', ENCRYPTION_KEY);
  const decrypted = decrypt(encrypted, ENCRYPTION_KEY);
  console.log('[custodial.service] self-test:', decrypted === 'test-private-key' ? 'PASS' : 'FAIL');
  console.log('[custodial.service] key pair:', { pub: keyPair.publicKey.substring(0, 16) + '...' });
}

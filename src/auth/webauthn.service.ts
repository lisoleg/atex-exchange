/**
 * WebAuthn / Passkey 认证服务
 * 基于 @simplewebauthn/server 实现 Relying Party
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { PrismaClient } from '@prisma/client';
import { signTokenPair, createSession } from './jwt.service';

const prisma = new PrismaClient();

// RP 配置 — 开发环境用 localhost
const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = 'ATEX Exchange';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:5173';

// 内存存储 challenge（生产环境应用 Redis）
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();

// 内存存储 WebAuthn 凭证（生产环境应持久化到 DB）
const credentialStore = new Map<string, {
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: string[];
}>();

/** 生成注册选项 */
export async function getRegistrationOptions(did: string) {
  // 检查是否已有 WebAuthn 凭证
  const existingAgent = await prisma.agent.findUnique({ where: { did } });
  const existingCredentials = existingAgent?.webauthnId
    ? [existingAgent.webauthnId]
    : [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: did,
    userDisplayName: existingAgent?.name || did,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map(id => ({
      id,
      type: 'public-key' as const,
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',   // 优先平台认证器（面容/指纹）
      residentKey: 'preferred',              // 可发现凭证
      userVerification: 'preferred',         // 优先用户验证
    },
  });

  // 存储 challenge
  challengeStore.set(did, { challenge: options.challenge, expiresAt: Date.now() + 5 * 60 * 1000 });

  return options;
}

/** 验证注册响应 */
export async function verifyRegistration(
  did: string,
  response: RegistrationResponseJSON,
) {
  const stored = challengeStore.get(did);
  if (!stored || stored.expiresAt < Date.now()) {
    throw new Error('Challenge expired or not found');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // 存储凭证
  credentialStore.set(credential.id, {
    credentialId: credential.id,
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports as string[] | undefined,
  });

  // 更新 Agent 的 webauthnId 和 publicKey
  await prisma.agent.update({
    where: { did },
    data: {
      webauthnId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
    },
  });

  // 清理 challenge
  challengeStore.delete(did);

  return { verified: true, credentialId: credential.id, deviceType: credentialDeviceType, backedUp: credentialBackedUp };
}

/** 生成认证选项 */
export async function getAuthenticationOptions(did?: string) {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials: did ? (credentialStore.get(did) ? [{
      id: credentialStore.get(did)!.credentialId,
      transports: credentialStore.get(did)!.transports as any,
    }] : []) : [],
  });

  // 存储 challenge（用 session key）
  const challengeKey = `auth-${Date.now()}`;
  challengeStore.set(challengeKey, { challenge: options.challenge, expiresAt: Date.now() + 5 * 60 * 1000 });

  return { options, challengeKey };
}

/** 验证认证响应 — 登录核心 */
export async function verifyAuthentication(
  challengeKey: string,
  response: AuthenticationResponseJSON,
  deviceInfo?: string,
) {
  const stored = challengeStore.get(challengeKey);
  if (!stored || stored.expiresAt < Date.now()) {
    throw new Error('Challenge expired or not found');
  }

  // 查找凭证
  const cred = credentialStore.get(response.id);
  if (!cred) {
    throw new Error('Credential not found');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: cred.credentialId,
      publicKey: cred.publicKey as Uint8Array<ArrayBuffer>,
      counter: cred.counter,
      transports: cred.transports as any,
    },
  });

  if (!verification.verified) {
    throw new Error('Authentication verification failed');
  }

  // 更新 counter
  cred.counter = verification.authenticationInfo.newCounter;

  // 查找 Agent
  const agent = await prisma.agent.findFirst({ where: { webauthnId: response.id } });
  if (!agent) {
    throw new Error('Agent not found for credential');
  }

  // 更新最后登录时间
  await prisma.agent.update({ where: { id: agent.id }, data: { lastLoginAt: new Date() } });

  // 签发 JWT
  const payload = { agentId: agent.id, did: agent.did, walletType: agent.walletType || undefined };
  const tokenPair = signTokenPair(payload);

  // 创建 session
  await createSession(agent.id, tokenPair.accessToken, tokenPair.refreshToken, agent.walletType || undefined, deviceInfo);

  // 清理 challenge
  challengeStore.delete(challengeKey);

  return {
    verified: true,
    agent: { id: agent.id, did: agent.did, name: agent.name, walletType: agent.walletType },
    tokens: tokenPair,
  };
}

/** 注册新 Agent + WebAuthn 一条龙 */
export async function registerAndLogin(
  did: string,
  name: string,
  webauthnResponse: RegistrationResponseJSON,
  deviceInfo?: string,
) {
  // 1. 创建 Agent
  const agent = await prisma.agent.upsert({
    where: { did },
    update: { name },
    create: { did, name },
  });

  // 2. 验证 WebAuthn 注册
  await verifyRegistration(did, webauthnResponse);

  // 3. 签发 JWT
  const payload = { agentId: agent.id, did: agent.did };
  const tokenPair = signTokenPair(payload);

  // 4. 创建 session
  await createSession(agent.id, tokenPair.accessToken, tokenPair.refreshToken, undefined, deviceInfo);

  // 5. 更新最后登录
  await prisma.agent.update({ where: { id: agent.id }, data: { lastLoginAt: new Date() } });

  return {
    agent: { id: agent.id, did: agent.did, name: agent.name, walletType: agent.walletType },
    tokens: tokenPair,
  };
}

/** 获取 RP 配置（前端需要） */
export function getRpConfig() {
  return { rpId: RP_ID, rpName: RP_NAME, rpOrigin: RP_ORIGIN };
}

// self-test
if (require.main === module) {
  console.log('[webauthn.service] self-test: module loaded OK');
  console.log('[webauthn.service] RP config:', getRpConfig());
}

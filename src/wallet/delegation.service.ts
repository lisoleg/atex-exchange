/**
 * 碳硅纠缠（Carbon-Silicon Bond）委托服务
 * 借鉴 AEON Agent 经济模型 + ATEX 碳硅纠缠理论
 *
 * 人机委托框架：
 * - 委托关系管理（创建/查询/撤销）
 * - 代理权限分级（只读/交易/管理）
 * - 代理活动审计日志
 * - 委托金额限制和追踪
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================================
// 类型定义
// ============================================================

/** 委托信息 */
export interface DelegationInfo {
  id: string;
  principalDid: string;
  agentDid: string;
  permissions: string[];
  maxAmount: number;
  usedAmount: number;
  description: string | null;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

/** 审计日志条目 */
export interface AuditLogEntry {
  id: string;
  delegationId: string;
  action: string;
  did: string;
  result: 'SUCCESS' | 'FAILED';
  detail: unknown;
  amount: number | null;
  createdAt: Date;
}

// ============================================================
// 委托管理
// ============================================================

/**
 * 创建委托关系
 *
 * @param principalDid - 委托人 DID（人类）
 * @param agentDid - 被委托 Agent DID（AI）
 * @param permissions - 权限列表
 * @param maxAmount - 最大可动用金额
 * @param description - 委托说明
 * @param expiresInHours - 有效期（小时）
 */
export async function createDelegation(
  principalDid: string,
  agentDid: string,
  permissions: string[],
  maxAmount: number = 0,
  description?: string,
  expiresInHours: number = 24,
): Promise<DelegationInfo> {
  // 验证双方 Agent 存在
  const [principal, agent] = await Promise.all([
    prisma.agent.findUnique({ where: { did: principalDid } }),
    prisma.agent.findUnique({ where: { did: agentDid } }),
  ]);

  if (!principal) throw new Error(`Principal agent ${principalDid} not found`);
  if (!agent) throw new Error(`Delegate agent ${agentDid} not found`);
  if (principalDid === agentDid) throw new Error('Cannot delegate to self');

  // 检查是否已有活跃委托
  const existing = await prisma.delegation.findFirst({
    where: { principalDid, agentDid, isActive: true, expiresAt: { gt: new Date() } },
  });
  if (existing) {
    return mapToDelegationInfo(existing);
  }

  const delegation = await prisma.delegation.create({
    data: {
      principalDid,
      agentDid,
      permissions: JSON.stringify(permissions),
      maxAmount,
      description: description || null,
      isActive: true,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    },
  });

  return mapToDelegationInfo(delegation);
}

/**
 * 查询委托关系
 */
export async function getDelegation(delegationId: string): Promise<DelegationInfo | null> {
  const delegation = await prisma.delegation.findUnique({ where: { id: delegationId } });
  return delegation ? mapToDelegationInfo(delegation) : null;
}

/**
 * 查询某人的所有委托关系（作为委托人）
 */
export async function getPrincipalDelegations(did: string): Promise<DelegationInfo[]> {
  const delegations = await prisma.delegation.findMany({
    where: { principalDid: did },
    orderBy: { createdAt: 'desc' },
  });
  return delegations.map(mapToDelegationInfo);
}

/**
 * 查询某 Agent 的所有被委托关系
 */
export async function getAgentDelegations(did: string): Promise<DelegationInfo[]> {
  const delegations = await prisma.delegation.findMany({
    where: { agentDid: did },
    orderBy: { createdAt: 'desc' },
  });
  return delegations.map(mapToDelegationInfo);
}

/**
 * 撤销委托关系
 */
export async function revokeDelegation(delegationId: string, principalDid: string): Promise<boolean> {
  const delegation = await prisma.delegation.findFirst({
    where: { id: delegationId, principalDid, isActive: true },
  });
  if (!delegation) return false;

  await prisma.delegation.update({
    where: { id: delegationId },
    data: { isActive: false },
  });

  // 记录审计日志
  await writeAuditLog(delegationId, 'REVOKE', principalDid, 'SUCCESS', { reason: 'revoked_by_principal' });
  return true;
}

/**
 * 验证委托权限
 *
 * 检查 agentDid 是否有权限代表 principalDid 执行指定操作
 */
export async function verifyDelegationPermission(
  agentDid: string,
  principalDid: string,
  requiredPermission: string,
): Promise<{ allowed: boolean; reason?: string; delegation?: DelegationInfo }> {
  const delegation = await prisma.delegation.findFirst({
    where: {
      agentDid,
      principalDid,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });

  if (!delegation) {
    return { allowed: false, reason: 'No active delegation found' };
  }

  const permissions: string[] = JSON.parse(delegation.permissions);
  if (!permissions.includes(requiredPermission) && !permissions.includes('*')) {
    return { allowed: false, reason: `Permission ${requiredPermission} not granted` };
  }

  return { allowed: true, delegation: mapToDelegationInfo(delegation) };
}

// ============================================================
// 审计日志
// ============================================================

/**
 * 记录委托操作审计日志
 */
export async function writeAuditLog(
  delegationId: string,
  action: string,
  did: string,
  result: 'SUCCESS' | 'FAILED',
  detail?: unknown,
  amount?: number,
): Promise<void> {
  await prisma.delegationAuditLog.create({
    data: {
      delegationId,
      action,
      did,
      result,
      detail: detail ? JSON.stringify(detail) : null,
      amount: amount || null,
    },
  });
}

/**
 * 查询委托审计日志
 */
export async function getDelegationAuditLogs(
  delegationId: string,
  limit: number = 50,
): Promise<AuditLogEntry[]> {
  const logs = await prisma.delegationAuditLog.findMany({
    where: { delegationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return logs.map(log => ({
    id: log.id,
    delegationId: log.delegationId,
    action: log.action,
    did: log.did,
    result: log.result as 'SUCCESS' | 'FAILED',
    detail: log.detail ? JSON.parse(log.detail) : null,
    amount: log.amount,
    createdAt: log.createdAt,
  }));
}

// ============================================================
// 内部工具
// ============================================================

function mapToDelegationInfo(d: any): DelegationInfo {
  return {
    id: d.id,
    principalDid: d.principalDid,
    agentDid: d.agentDid,
    permissions: JSON.parse(d.permissions),
    maxAmount: d.maxAmount,
    usedAmount: d.usedAmount,
    description: d.description,
    isActive: d.isActive,
    expiresAt: d.expiresAt,
    createdAt: d.createdAt,
  };
}

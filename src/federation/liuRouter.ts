/**
 * Liu 路由算法
 * 基于 Φ 值亲和度的联邦路由
 * 选择与目标 Agent Φ 值最接近的下一跳节点
 */

import type {
  ActivityPubActivity,
  LiuRouteEntry,
  PhiValue,
} from '../types/atex.types';
import { phiInnerProduct } from '../math/emlPhi';

/** 联邦节点信息 */
interface FederationPeer {
  did: string;
  endpoint: string;
  phi: PhiValue;
  isActive: boolean;
  lastSeen: Date;
}

/** 路由表 */
const routingTable = new Map<string, LiuRouteEntry[]>();

/** 已知联邦节点 */
const knownPeers = new Map<string, FederationPeer>();

/**
 * 注册联邦节点
 * @param did 节点 DID
 * @param endpoint 端点 URL
 * @param phi 节点 Φ 值
 */
export function registerPeer(
  did: string,
  endpoint: string,
  phi: PhiValue
): void {
  knownPeers.set(did, {
    did,
    endpoint,
    phi,
    isActive: true,
    lastSeen: new Date(),
  });
}

/**
 * 注销联邦节点
 * @param did 节点 DID
 */
export function unregisterPeer(did: string): void {
  const peer = knownPeers.get(did);
  if (peer) {
    peer.isActive = false;
  }
}

/**
 * 获取活跃节点列表
 * @returns 活跃节点数组
 */
export function getActivePeers(): FederationPeer[] {
  return Array.from(knownPeers.values()).filter(p => p.isActive);
}

/**
 * Liu 路由选择
 * 基于目标 DID 和 Φ 值亲和度选择最佳下一跳
 * 亲和度 = Φ 内积 (越大越接近)
 * @param sourceDid 源 DID
 * @param targetDid 目标 DID (可选，广播时为空)
 * @returns 路由路径 (下一跳 DID 列表)
 */
export function liuRoute(sourceDid: string, targetDid?: string): string[] {
  const activePeers = getActivePeers().filter(p => p.did !== sourceDid);

  if (activePeers.length === 0) return [];

  // 如果指定了目标，查找直接路由
  if (targetDid) {
    const directPeer = activePeers.find(p => p.did === targetDid);
    if (directPeer) return [directPeer.did];

    // 否则按 Φ 亲和度路由
    const sourcePhi = getSourcePhi(sourceDid);
    const sorted = activePeers
      .map(p => ({
        did: p.did,
        affinity: phiInnerProduct(sourcePhi, p.phi),
      }))
      .sort((a, b) => b.affinity - a.affinity);

    return sorted.slice(0, 3).map(s => s.did);
  }

  // 广播模式：按 Φ 亲和度排序，选择前 N 个
  const sourcePhi = getSourcePhi(sourceDid);
  const sorted = activePeers
    .map(p => ({
      did: p.did,
      affinity: phiInnerProduct(sourcePhi, p.phi),
    }))
    .sort((a, b) => b.affinity - a.affinity);

  // 返回亲和度最高的前5个节点
  return sorted.slice(0, 5).map(s => s.did);
}

/**
 * 广播 Activity 到联邦网络
 * @param sourceDid 源 DID
 * @param activity ActivityPub Activity
 * @returns 成功广播的节点数
 */
export function broadcastToPeers(sourceDid: string, activity: ActivityPubActivity): number {
  const targets = liuRoute(sourceDid);
  let successCount = 0;

  for (const targetDid of targets) {
    const peer = knownPeers.get(targetDid);
    if (peer && peer.isActive) {
      // 模拟发送 (实际实现使用 HTTP POST)
      const sent = simulateSendToPeer(peer.endpoint, activity);
      if (sent) successCount++;
    }
  }

  return successCount;
}

/**
 * 模拟发送 Activity 到节点
 * @param endpoint 节点端点
 * @param activity Activity
 * @returns 是否成功
 */
function simulateSendToPeer(endpoint: string, activity: ActivityPubActivity): boolean {
  // 首期模拟：总是返回成功
  // 后续实现真实 HTTP POST
  return true;
}

/**
 * 获取源节点的 Φ 值
 * @param did 源 DID
 * @returns Φ 值
 */
function getSourcePhi(did: string): PhiValue {
  const peer = knownPeers.get(did);
  if (peer) return peer.phi;
  // 默认 Φ 值
  return { magnitude: 1, phase: 0 };
}

/**
 * 更新路由表
 * @param sourceDid 源 DID
 * @param entries 路由条目
 */
export function updateRoutingTable(sourceDid: string, entries: LiuRouteEntry[]): void {
  routingTable.set(sourceDid, entries);
}

/**
 * 获取路由表
 * @param sourceDid 源 DID
 * @returns 路由条目列表
 */
export function getRoutingTable(sourceDid: string): LiuRouteEntry[] {
  return routingTable.get(sourceDid) || [];
}

/**
 * 获取联邦网络状态
 * @returns 网络状态信息
 */
export function getFederationStatus(): {
  totalPeers: number;
  activePeers: number;
  routes: number;
} {
  const activePeers = getActivePeers();
  let totalRoutes = 0;
  for (const entries of routingTable.values()) {
    totalRoutes += entries.length;
  }

  return {
    totalPeers: knownPeers.size,
    activePeers: activePeers.length,
    routes: totalRoutes,
  };
}

// 初始化默认节点
registerPeer('did:atex:bob', 'http://localhost:3002/inbox', { magnitude: 1.2, phase: Math.PI / 6 });
registerPeer('did:atex:alice', 'http://localhost:3003/inbox', { magnitude: 0.8, phase: Math.PI / 3 });
registerPeer('did:atex:system', 'http://localhost:3001/inbox', { magnitude: 1.0, phase: 0 });

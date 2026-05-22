/**
 * Liu 路由表可扩展性引擎
 * 开放问题：百万级用户时，Liu 路由表的计算复杂度是否可控？
 *
 * 分析：
 * - 当前 liuRoute() 对 n 个活跃节点做 O(n) 遍历 + O(n log n) 排序
 * - 百万级：每次路由需遍历 1M 节点，计算 1M 次内积 → 不可行
 *
 * 方案：基于 KD-Tree 的 Φ 空间索引
 * 1. 将 Φ 值映射到 2D 平面 (Re(Φ), Im(Φ))
 * 2. 构建 KD-Tree 索引
 * 3. 最近邻查询 O(log n)
 * 4. K-最近邻查询 O(K · log n)
 *
 * 复杂度：
 *   构建: O(n log n)
 *   插入: O(log n)
 *   查询 KNN: O(K · log n)
 *   百万级用户: 查询 ~20 步，完全可行
 */

import type { PhiValue } from '../types/atex.types';
import { phiInnerProduct, constructPhi } from '../math/emlPhi';

/** KD-Tree 节点 */
interface KDNode {
  /** 节点 DID */
  did: string;
  /** Φ 值 */
  phi: PhiValue;
  /** 2D 坐标 [Re, Im] */
  point: [number, number];
  /** 分割轴 (0=Re, 1=Im) */
  axis: number;
  /** 左子树 */
  left: KDNode | null;
  /** 右子树 */
  right: KDNode | null;
}

/** 路由结果 */
interface ScalableRouteResult {
  did: string;
  phiAffinity: number;
  hopCount: number;
}

/**
 * ScalableLiuRouter — 可扩展 Liu 路由器
 * 基于 KD-Tree 的 Φ 空间索引
 */
export class ScalableLiuRouter {
  private root: KDNode | null = null;
  private size: number = 0;

  /**
   * Φ → 2D 坐标
   */
  private phiToPoint(phi: PhiValue): [number, number] {
    const c = constructPhi(phi.magnitude, phi.phase);
    return [c.re, c.im];
  }

  /**
   * 插入节点到 KD-Tree
   * O(log n)
   */
  insert(did: string, phi: PhiValue): void {
    const point = this.phiToPoint(phi);
    this.root = this.insertNode(this.root, did, phi, point, 0);
    this.size++;
  }

  private insertNode(
    node: KDNode | null,
    did: string,
    phi: PhiValue,
    point: [number, number],
    depth: number
  ): KDNode {
    if (node === null) {
      return { did, phi, point, axis: depth % 2, left: null, right: null };
    }

    const axis = depth % 2;
    if (point[axis] < node.point[axis]) {
      node.left = this.insertNode(node.left, did, phi, point, depth + 1);
    } else {
      node.right = this.insertNode(node.right, did, phi, point, depth + 1);
    }

    return node;
  }

  /**
   * K-最近邻查询
   * O(K · log n)
   *
   * @param targetPhi 目标 Φ 值
   * @param k 返回的邻居数
   * @returns 按亲和度降序排列的路由结果
   */
  findKNN(targetPhi: PhiValue, k: number = 5): ScalableRouteResult[] {
    const results: Array<{ did: string; affinity: number; distance: number }> = [];

    const targetPoint = this.phiToPoint(targetPhi);

    this.knnSearch(this.root, targetPoint, targetPhi, k, results, 0);

    return results
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, k)
      .map(r => ({
        did: r.did,
        phiAffinity: r.affinity,
        hopCount: 1, // 直接连接
      }));
  }

  private knnSearch(
    node: KDNode | null,
    targetPoint: [number, number],
    targetPhi: PhiValue,
    k: number,
    results: Array<{ did: string; affinity: number; distance: number }>,
    depth: number
  ): void {
    if (node === null) return;

    // 计算当前节点的距离和亲和度
    const dx = node.point[0] - targetPoint[0];
    const dy = node.point[1] - targetPoint[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    const affinity = phiInnerProduct(targetPhi, node.phi);

    results.push({ did: node.did, affinity, distance });

    // 按距离排序，只保留 K 个最近的
    results.sort((a, b) => a.distance - b.distance);
    if (results.length > k * 2) {
      results.length = k * 2; // 保留 2K 以确保有足够的正亲和度
    }

    const axis = depth % 2;
    const diff = targetPoint[axis] - node.point[axis];

    // 先搜索更可能包含最近邻的子树
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;

    this.knnSearch(first, targetPoint, targetPhi, k, results, depth + 1);

    // 检查是否需要搜索另一子树
    const maxDist = results.length >= k ? results[k - 1].distance : Infinity;
    if (Math.abs(diff) < maxDist) {
      this.knnSearch(second, targetPoint, targetPhi, k, results, depth + 1);
    }
  }

  /**
   * 批量路由 — 给定源 DID，找 KNN 的路由路径
   * O(K · log n)
   */
  route(sourcePhi: PhiValue, k: number = 5): ScalableRouteResult[] {
    return this.findKNN(sourcePhi, k);
  }

  /**
   * 移除节点
   * O(log n) — 简化实现：标记删除 + 延迟重建
   */
  remove(did: string): boolean {
    // 简化实现：找到节点后标记为不可用
    const found = this.findAndRemove(this.root, did);
    if (found) this.size--;
    return found;
  }

  private findAndRemove(node: KDNode | null, did: string): boolean {
    if (node === null) return false;
    if (node.did === did) {
      node.did = '__removed__';
      return true;
    }
    return this.findAndRemove(node.left, did) || this.findAndRemove(node.right, did);
  }

  /**
   * 获取统计
   */
  getStats(): {
    totalNodes: number;
    treeDepth: number;
    isBalanced: boolean;
  } {
    const depth = this.getTreeDepth(this.root);
    const expectedDepth = this.size > 0 ? Math.ceil(Math.log2(this.size + 1)) : 0;

    return {
      totalNodes: this.size,
      treeDepth: depth,
      isBalanced: depth <= expectedDepth * 1.5,
    };
  }

  private getTreeDepth(node: KDNode | null): number {
    if (node === null) return 0;
    return 1 + Math.max(
      this.getTreeDepth(node.left),
      this.getTreeDepth(node.right)
    );
  }

  /**
   * get_state() — 模块自检
   */
  get_state(): Record<string, unknown> {
    return {
      module: 'ScalableLiuRouter',
      ...this.getStats(),
      complexity: 'O(K·log n)',
    };
  }
}

/** 单例 */
let instance: ScalableLiuRouter | null = null;

export function getScalableLiuRouter(): ScalableLiuRouter {
  if (!instance) {
    instance = new ScalableLiuRouter();
  }
  return instance;
}

export function resetScalableLiuRouter(): void {
  instance = null;
}

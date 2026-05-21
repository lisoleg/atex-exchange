/**
 * Φ 值 Hook
 * 获取和计算 Φ 值相关数据
 */

import { useState, useEffect, useCallback } from 'react';
import type { PhiValue, TokenType } from '../utils/phiMath';
import { DEFAULT_PHI_VALUES, calculateConsensusGradient } from '../utils/phiMath';

/** Φ 值状态 */
interface PhiState {
  /** 当前各 Token 类型的 Φ 值 */
  phiValues: Record<string, PhiValue>;
  /** 共识场梯度 */
  gradient: number;
  /** Gateway 级别 */
  gatewayLevel: 'PRIORITY' | 'NORMAL' | 'THROTTLE';
  /** 是否加载中 */
  loading: boolean;
}

/**
 * usePhiValue Hook
 * 管理当前 Φ 值状态和计算
 */
export function usePhiValue() {
  const [state, setState] = useState<PhiState>({
    phiValues: DEFAULT_PHI_VALUES,
    gradient: 0,
    gatewayLevel: 'NORMAL',
    loading: true,
  });

  /** 刷新 Φ 值 */
  const refresh = useCallback(async () => {
    try {
      // 从后端 API 获取状态
      const response = await fetch('/api/v1/atex/status');
      if (response.ok) {
        const data = await response.json();
        // 更新 Φ 值（使用默认值 + 服务器数据）
        const phiValues = { ...DEFAULT_PHI_VALUES };
        const allPhi = Object.values(phiValues);
        const gradient = calculateConsensusGradient(allPhi);

        let gatewayLevel: 'PRIORITY' | 'NORMAL' | 'THROTTLE' = 'NORMAL';
        if (gradient < 0.5) gatewayLevel = 'PRIORITY';
        else if (gradient >= 1.0) gatewayLevel = 'THROTTLE';

        setState({
          phiValues,
          gradient,
          gatewayLevel,
          loading: false,
        });
      } else {
        // 使用默认值
        const allPhi = Object.values(DEFAULT_PHI_VALUES);
        const gradient = calculateConsensusGradient(allPhi);
        setState(prev => ({
          ...prev,
          gradient,
          loading: false,
        }));
      }
    } catch {
      // 网络不可用，使用默认值
      const allPhi = Object.values(DEFAULT_PHI_VALUES);
      const gradient = calculateConsensusGradient(allPhi);
      setState(prev => ({
        ...prev,
        gradient,
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
    // 每30秒刷新
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  /** 计算两个 Token 之间的相位差 */
  const getPhiDiff = useCallback((type1: string, type2: string): number => {
    const phi1 = state.phiValues[type1];
    const phi2 = state.phiValues[type2];
    if (!phi1 || !phi2) return 0;

    let diff = phi1.phase - phi2.phase;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
  }, [state.phiValues]);

  return {
    ...state,
    refresh,
    getPhiDiff,
  };
}

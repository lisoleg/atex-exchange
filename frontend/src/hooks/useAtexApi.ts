/**
 * ATEX API Hook
 * 封装后端 API 调用
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

/** API 基础 URL */
const API_BASE = '/api/v1/atex';

/** API 请求状态 */
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * useAtexApi Hook
 * 通用 API 调用 Hook
 */
export function useAtexApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  /** GET 请求 */
  const get = useCallback(async (path: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axios.get<T>(`${API_BASE}${path}`);
      setState({ data: response.data, loading: false, error: null });
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || '请求失败';
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  }, []);

  /** POST 请求 */
  const post = useCallback(async (path: string, body?: unknown) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axios.post<T>(`${API_BASE}${path}`, body);
      setState({ data: response.data, loading: false, error: null });
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || '请求失败';
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  }, []);

  return {
    ...state,
    get,
    post,
  };
}

/**
 * 余额查询 Hook
 */
export function useBalance(did: string) {
  return useAtexApi<Record<string, number>>();
}

/**
 * 订单簿 Hook
 */
export function useOrderBook() {
  return useAtexApi<{
    entries: Array<{
      offerId: string;
      offererDid: string;
      offerTokenType: string;
      offerAmount: number;
      reqTokenType: string;
      reqAmount: number;
      phiDiff: number;
      expiresAt: string;
      gatewayLevel: string;
    }>;
    total: number;
  }>();
}

/**
 * 交易历史 Hook
 */
export function useHistory() {
  return useAtexApi<{
    transactions: Array<{
      id: string;
      offerId: string;
      type: string;
      fromDid: string;
      toDid: string;
      tokenType: string;
      amount: number;
      phiBefore: number | null;
      phiAfter: number | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }>();
}

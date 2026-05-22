/**
 * 全局认证状态管理
 * 管理 JWT token、Agent 信息、登录/注销逻辑
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  agent: {
    id: string;
    did: string;
    name: string;
    walletType: string | null;
    phi: { magnitude: number; phase: number };
    reputation: number;
    balances: Record<string, number>;
  } | null;
  accessToken: string | null;
  refreshToken: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { agent: any; tokens: { accessToken: string; refreshToken: string } } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_AGENT'; payload: any }
  | { type: 'REFRESH_TOKEN'; payload: { accessToken: string; refreshToken: string } };

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  agent: null,
  accessToken: null,
  refreshToken: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('atex_access_token', action.payload.tokens.accessToken);
      localStorage.setItem('atex_refresh_token', action.payload.tokens.refreshToken);
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        agent: action.payload.agent,
        accessToken: action.payload.tokens.accessToken,
        refreshToken: action.payload.tokens.refreshToken,
      };
    case 'LOGOUT':
      localStorage.removeItem('atex_access_token');
      localStorage.removeItem('atex_refresh_token');
      return { ...initialState, isLoading: false };
    case 'UPDATE_AGENT':
      return { ...state, agent: { ...state.agent, ...action.payload } };
    case 'REFRESH_TOKEN':
      localStorage.setItem('atex_access_token', action.payload.accessToken);
      localStorage.setItem('atex_refresh_token', action.payload.refreshToken);
      return { ...state, accessToken: action.payload.accessToken, refreshToken: action.payload.refreshToken };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (did: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  devLogin: (did: string, name?: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 配置 axios 拦截器
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('atex_access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('atex_refresh_token');
            if (refreshToken) {
              const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
              localStorage.setItem('atex_access_token', data.tokens.accessToken);
              localStorage.setItem('atex_refresh_token', data.tokens.refreshToken);
              originalRequest.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
              return axios(originalRequest);
            }
          } catch {
            dispatch({ type: 'LOGOUT' });
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // 启动时检查已有 token
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('atex_access_token');
      if (token) {
        try {
          const { data } = await axios.get(`${API_BASE}/auth/me`);
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              agent: data,
              tokens: {
                accessToken: token,
                refreshToken: localStorage.getItem('atex_refresh_token') || '',
              },
            },
          });
        } catch {
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    checkAuth();
  }, []);

  /** WebAuthn 登录 */
  const login = async (did: string, name?: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 1. 获取注册选项
      const { data: regData } = await axios.post(`${API_BASE}/auth/register-options`, { did, name });

      // 2. 浏览器 WebAuthn 注册
      const { startRegistration } = await import('@simplewebauthn/browser');
      const webauthnResponse = await startRegistration(regData.options);

      // 3. 验证注册 + 获取 token
      const { data } = await axios.post(`${API_BASE}/auth/register`, {
        did,
        name: name || did,
        webauthnResponse,
      });

      dispatch({ type: 'LOGIN_SUCCESS', payload: data });
    } catch (error: any) {
      console.error('[Auth] Login failed:', error.message);
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  /** 开发模式登录（跳过 WebAuthn） */
  const devLogin = async (did: string, name?: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data } = await axios.post(`${API_BASE}/auth/dev-login`, { did, name });
      dispatch({ type: 'LOGIN_SUCCESS', payload: data });
    } catch (error: any) {
      console.error('[Auth] Dev login failed:', error.message);
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  /** 注销 */
  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`);
    } catch { /* ignore */ }
    dispatch({ type: 'LOGOUT' });
  };

  /** 刷新认证信息 */
  const refreshAuth = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/auth/me`);
      dispatch({ type: 'UPDATE_AGENT', payload: data });
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ state, login, logout, devLogin, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;

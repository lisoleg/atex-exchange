/**
 * 钱包状态管理
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface WalletInfo {
  id: string;
  type: string;
  address: string;
  isActive: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
}

interface WalletState {
  wallets: WalletInfo[];
  balances: Record<string, number>;
  isLoading: boolean;
  selectedWallet: WalletInfo | null;
}

type WalletAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_WALLETS'; payload: WalletInfo[] }
  | { type: 'SET_BALANCES'; payload: Record<string, number> }
  | { type: 'SELECT_WALLET'; payload: WalletInfo | null }
  | { type: 'ADD_WALLET'; payload: WalletInfo };

const initialState: WalletState = {
  wallets: [],
  balances: {},
  isLoading: false,
  selectedWallet: null,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_WALLETS':
      return { ...state, wallets: action.payload, selectedWallet: action.payload.find(w => w.isActive) || null };
    case 'SET_BALANCES':
      return { ...state, balances: action.payload };
    case 'SELECT_WALLET':
      return { ...state, selectedWallet: action.payload };
    case 'ADD_WALLET':
      return { ...state, wallets: [...state.wallets, action.payload], selectedWallet: action.payload };
    default:
      return state;
  }
}

interface WalletContextType {
  state: WalletState;
  createWallet: (type: string, name?: string, publicKey?: string) => Promise<any>;
  migrateWallet: (fromType: string, toType: string) => Promise<any>;
  fetchWallets: () => Promise<void>;
  fetchBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const [state, dispatch] = useReducer(walletReducer, initialState);

  const createWallet = async (type: string, name?: string, publicKey?: string) => {
    const { data } = await axios.post(`${API_BASE}/wallet/create`, { type, name, publicKey });
    if (data.wallet) {
      dispatch({ type: 'ADD_WALLET', payload: data.wallet });
    }
    return data;
  };

  const migrateWallet = async (fromType: string, toType: string) => {
    const { data } = await axios.put(`${API_BASE}/wallet/migrate`, { fromType, toType });
    await fetchWallets();
    return data;
  };

  const fetchWallets = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { data } = await axios.get(`${API_BASE}/wallet`);
      dispatch({ type: 'SET_WALLETS', payload: data.wallets });
    } catch { /* ignore */ }
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const fetchBalances = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/wallet/balance`);
      dispatch({ type: 'SET_BALANCES', payload: data.balances });
    } catch { /* ignore */ }
  };

  return (
    <WalletContext.Provider value={{ state, createWallet, migrateWallet, fetchWallets, fetchBalances }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}

export default WalletContext;

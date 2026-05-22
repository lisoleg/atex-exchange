/**
 * WalletPage — 钱包管理页面
 */

import React, { useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Alert, Divider, IconButton,
} from '@mui/material';
import { Shield, Balance, Key, ArrowUpward, Download } from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

const typeIcons: Record<string, React.ReactNode> = {
  CUSTODIAL: <Shield />,
  THRESHOLD: <Balance />,
  SELF_CUSTODY: <Key />,
};

const typeLabels: Record<string, string> = {
  CUSTODIAL: '托管钱包',
  THRESHOLD: '门限钱包',
  SELF_CUSTODY: '自托管钱包',
};

export default function WalletPage() {
  const { state: walletState, fetchWallets, fetchBalances, migrateWallet } = useWallet();
  const { state: authState } = useAuth();

  useEffect(() => {
    fetchWallets();
    fetchBalances();
  }, []);

  const handleMigrate = async (toType: string) => {
    if (!authState.agent?.walletType) return;
    if (!confirm(`确定要从 ${typeLabels[authState.agent.walletType]} 迁移到 ${typeLabels[toType]} 吗？`)) return;
    try {
      await migrateWallet(authState.agent.walletType, toType);
    } catch (err: any) {
      alert(err.response?.data?.error || '迁移失败');
    }
  };

  const balances = walletState.balances;

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>钱包管理</Typography>

      {/* 余额概览 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>Token 余额</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {Object.entries(balances).length > 0 ? Object.entries(balances).map(([type, amount]) => (
              <Box key={type} p={2} borderRadius={2} sx={{ bgcolor: '#1f2937', minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">{type}</Typography>
                <Typography variant="h5" fontWeight={700}>{Number(amount).toFixed(2)}</Typography>
              </Box>
            )) : (
              <Typography variant="body2" color="text.secondary">暂无余额</Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* 钱包列表 */}
      <Typography variant="subtitle1" fontWeight={600} mb={2}>我的钱包</Typography>
      {walletState.wallets.map(wallet => (
        <Card key={wallet.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Box color="#6366f1">{typeIcons[wallet.type]}</Box>
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight={600}>{typeLabels[wallet.type]}</Typography>
                  {wallet.isActive && <Chip label="活跃" size="small" color="success" />}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {wallet.address}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* 迁移选项 */}
      {authState.agent?.walletType && (
        <Box mt={3}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="subtitle1" fontWeight={600} mb={2}>升级钱包</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            当前钱包类型：<strong>{typeLabels[authState.agent.walletType]}</strong>。你可以随时升级到更安全的钱包类型。
          </Alert>
          <Box display="flex" gap={2} flexWrap="wrap">
            {authState.agent.walletType === 'CUSTODIAL' && (
              <>
                <Button variant="outlined" startIcon={<ArrowUpward />} onClick={() => handleMigrate('THRESHOLD')}>
                  升级到门限钱包
                </Button>
                <Button variant="outlined" startIcon={<ArrowUpward />} onClick={() => handleMigrate('SELF_CUSTODY')}>
                  升级到自托管
                </Button>
              </>
            )}
            {authState.agent.walletType === 'THRESHOLD' && (
              <Button variant="outlined" startIcon={<ArrowUpward />} onClick={() => handleMigrate('SELF_CUSTODY')}>
                升级到自托管
              </Button>
            )}
            {authState.agent.walletType === 'SELF_CUSTODY' && (
              <Alert severity="success">你已使用最高安全级别的钱包</Alert>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

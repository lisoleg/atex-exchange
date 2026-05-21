/**
 * Dashboard — 总览页
 * 4个TokenBalanceCard + PhasePolarChart + 最近交易列表
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, List, ListItem, ListItemText, Chip, Divider } from '@mui/material';
import TokenBalanceCard from '../components/TokenBalanceCard';
import PhasePolarChart from '../components/PhasePolarChart';
import { usePhiValue } from '../hooks/usePhiValue';
import type { TokenType } from '../utils/phiMath';
import { DEFAULT_PHI_VALUES } from '../utils/phiMath';
import { TOKEN_TYPE_LABELS, TOKEN_TYPE_COLORS, formatAmount, formatTime, truncateDid } from '../utils/tokenUtils';

/** 模拟余额数据 */
const MOCK_BALANCES: Record<TokenType, { balance: number; phiMagnitude: number; phiPhase: number }> = {
  CALC: { balance: 12500, phiMagnitude: 1.0, phiPhase: 0 },
  WIT: { balance: 8300, phiMagnitude: 1.5, phiPhase: Math.PI / 6 },
  WORD: { balance: 45000, phiMagnitude: 0.8, phiPhase: Math.PI / 3 },
  PASS: { balance: 3200, phiMagnitude: 2.0, phiPhase: Math.PI / 4 },
};

/** 模拟最近交易 */
const MOCK_RECENT_TX = [
  { id: '1', from: 'did:agent:alice', to: 'did:agent:bob', type: 'CALC→WIT', amount: 500, status: 'SETTLED', time: new Date() },
  { id: '2', from: 'did:agent:carol', to: 'did:agent:alice', type: 'WORD→PASS', amount: 2000, status: 'SETTLED', time: new Date() },
  { id: '3', from: 'did:agent:bob', to: 'did:agent:dave', type: 'WIT→CALC', amount: 100, status: 'OPEN', time: new Date() },
  { id: '4', from: 'did:agent:eve', to: 'did:agent:carol', type: 'PASS→WORD', amount: 50, status: 'ACCEPTED', time: new Date() },
  { id: '5', from: 'did:agent:alice', to: 'did:agent:eve', type: 'CALC→PASS', amount: 300, status: 'SETTLED', time: new Date() },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#6366f1',
  ACCEPTED: '#f59e0b',
  SETTLED: '#10b981',
  CANCELLED: '#ef4444',
};

export default function Dashboard() {
  const { phiValues, gradient, gatewayLevel } = usePhiValue();
  const [balances, setBalances] = useState(MOCK_BALANCES);

  // 尝试从API获取余额
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/v1/atex/balance/did:agent:current');
        if (res.ok) {
          const data = await res.json();
          if (data.balances) {
            setBalances(prev => ({
              CALC: { ...prev.CALC, balance: data.balances.CALC || prev.CALC.balance },
              WIT: { ...prev.WIT, balance: data.balances.WIT || prev.WIT.balance },
              WORD: { ...prev.WORD, balance: data.balances.WORD || prev.WORD.balance },
              PASS: { ...prev.PASS, balance: data.balances.PASS || prev.PASS.balance },
            }));
          }
        }
      } catch {
        // 使用模拟数据
      }
    };
    fetchBalance();
  }, []);

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          总览
        </Typography>
        <Typography variant="body2" color="text.secondary">
          四元Token余额与相位分布
        </Typography>
      </Box>

      {/* 四元Token余额卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(['CALC', 'WIT', 'WORD', 'PASS'] as TokenType[]).map((type) => {
          const b = balances[type];
          return (
            <Grid item xs={12} sm={6} md={3} key={type}>
              <TokenBalanceCard
                type={type}
                balance={b.balance}
                phiMagnitude={b.phiMagnitude}
                phiPhase={b.phiPhase}
              />
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={2}>
        {/* 相位极坐标图 */}
        <Grid item xs={12} md={6}>
          <PhasePolarChart phiValues={phiValues} />
        </Grid>

        {/* 最近交易流 */}
        <Grid item xs={12} md={6}>
          <Card className="atex-card" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                最近交易
              </Typography>
              <List dense>
                {MOCK_RECENT_TX.map((tx, idx) => (
                  <React.Fragment key={tx.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {truncateDid(tx.from)} → {truncateDid(tx.to)}
                            </Typography>
                            <Chip
                              label={tx.status}
                              size="small"
                              sx={{
                                bgcolor: `${STATUS_COLORS[tx.status] || '#6366f1'}20`,
                                color: STATUS_COLORS[tx.status] || '#6366f1',
                                fontSize: 10,
                                height: 18,
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {tx.type} · {formatAmount(tx.amount)}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {idx < MOCK_RECENT_TX.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 共识场状态 */}
      <Card className="atex-card" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            共识场状态
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">∇Ψ 共识梯度</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                {gradient.toFixed(4)}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">Gateway</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ color: gatewayLevel === 'PRIORITY' ? '#10b981' : gatewayLevel === 'THROTTLE' ? '#f59e0b' : '#6366f1' }}>
                {gatewayLevel}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">网络节点</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                3
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

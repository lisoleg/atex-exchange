/**
 * Liquidity — 流动性页
 * PhaseHeatmap + OrderBookTable(全量)
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import PhaseHeatmap from '../components/PhaseHeatmap';
import OrderBookTable from '../components/OrderBookTable';

/** 模拟全量订单簿 */
const MOCK_FULL_ORDERBOOK = [
  { offerId: 'f1', offererDid: 'did:agent:alice', offerTokenType: 'CALC', offerAmount: 500, reqTokenType: 'WIT', reqAmount: 100, phiDiff: 0.52, expiresAt: new Date(Date.now() + 3600000).toISOString(), gatewayLevel: 'NORMAL' },
  { offerId: 'f2', offererDid: 'did:agent:bob', offerTokenType: 'WIT', offerAmount: 200, reqTokenType: 'PASS', reqAmount: 30, phiDiff: 0.24, expiresAt: new Date(Date.now() + 7200000).toISOString(), gatewayLevel: 'PRIORITY' },
  { offerId: 'f3', offererDid: 'did:agent:carol', offerTokenType: 'WORD', offerAmount: 5000, reqTokenType: 'CALC', reqAmount: 1000, phiDiff: 1.05, expiresAt: new Date(Date.now() + 1800000).toISOString(), gatewayLevel: 'THROTTLE' },
  { offerId: 'f4', offererDid: 'did:agent:dave', offerTokenType: 'PASS', offerAmount: 50, reqTokenType: 'WIT', reqAmount: 25, phiDiff: 0.78, expiresAt: new Date(Date.now() + 5400000).toISOString(), gatewayLevel: 'NORMAL' },
  { offerId: 'f5', offererDid: 'did:agent:eve', offerTokenType: 'CALC', offerAmount: 2000, reqTokenType: 'WORD', reqAmount: 8000, phiDiff: 0.15, expiresAt: new Date(Date.now() + 900000).toISOString(), gatewayLevel: 'PRIORITY' },
  { offerId: 'f6', offererDid: 'did:agent:frank', offerTokenType: 'WIT', offerAmount: 350, reqTokenType: 'CALC', reqAmount: 700, phiDiff: 0.33, expiresAt: new Date(Date.now() + 4500000).toISOString(), gatewayLevel: 'NORMAL' },
  { offerId: 'f7', offererDid: 'did:agent:grace', offerTokenType: 'PASS', offerAmount: 80, reqTokenType: 'WORD', reqAmount: 3000, phiDiff: 0.67, expiresAt: new Date(Date.now() + 6000000).toISOString(), gatewayLevel: 'NORMAL' },
  { offerId: 'f8', offererDid: 'did:agent:henry', offerTokenType: 'WORD', offerAmount: 10000, reqTokenType: 'PASS', reqAmount: 40, phiDiff: 0.89, expiresAt: new Date(Date.now() + 2700000).toISOString(), gatewayLevel: 'THROTTLE' },
];

export default function Liquidity() {
  const [entries, setEntries] = useState(MOCK_FULL_ORDERBOOK);

  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        const res = await fetch('/api/v1/atex/orderbook');
        if (res.ok) {
          const data = await res.json();
          if (data.entries && data.entries.length > 0) {
            setEntries(data.entries);
          }
        }
      } catch {
        // 使用模拟数据
      }
    };
    fetchOrderBook();
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          流动性
        </Typography>
        <Typography variant="body2" color="text.secondary">
          相位分布与市场深度
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 相位热力图 */}
        <Grid item xs={12} md={6}>
          <PhaseHeatmap />
        </Grid>

        {/* 流动性统计 */}
        <Grid item xs={12} md={6}>
          <Card className="atex-card" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                流动性统计
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">活跃报价</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'monospace', color: '#6366f1' }}>
                    {entries.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">总流动性</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'monospace', color: '#10b981' }}>
                    ${entries.reduce((s, e) => s + e.offerAmount, 0).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">平均Δθ</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                    {(entries.reduce((s, e) => s + Math.abs(e.phiDiff), 0) / entries.length * 180 / Math.PI).toFixed(1)}°
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">PRIORITY占比</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'monospace', color: '#10b981' }}>
                    {(entries.filter(e => e.gatewayLevel === 'PRIORITY').length / entries.length * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Box>

              {/* Token类型分布 */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Token类型分布
                </Typography>
                {['CALC', 'WIT', 'WORD', 'PASS'].map((type) => {
                  const count = entries.filter(e => e.offerTokenType === type).length;
                  const pct = (count / entries.length) * 100;
                  const colors: Record<string, string> = { CALC: '#6366f1', WIT: '#8b5cf6', WORD: '#06b6d4', PASS: '#10b981' };
                  return (
                    <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ width: 40, color: colors[type] }}>
                        {type}
                      </Typography>
                      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 3, bgcolor: colors[type] }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {count}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 全量订单簿 */}
        <Grid item xs={12}>
          <OrderBookTable entries={entries} />
        </Grid>
      </Grid>
    </Box>
  );
}

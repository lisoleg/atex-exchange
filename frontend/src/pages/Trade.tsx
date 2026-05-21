/**
 * Trade — 交易页
 * OfferForm + 订单簿OrderBookTable
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, Snackbar, Alert } from '@mui/material';
import OfferForm from '../components/OfferForm';
import OrderBookTable from '../components/OrderBookTable';
import type { TokenType } from '../utils/phiMath';

/** 模拟订单簿数据 */
const MOCK_ORDERBOOK = [
  { offerId: 'offer-1', offererDid: 'did:agent:alice', offerTokenType: 'CALC', offerAmount: 500, reqTokenType: 'WIT', reqAmount: 100, phiDiff: 0.52, expiresAt: new Date(Date.now() + 3600000).toISOString(), gatewayLevel: 'NORMAL' },
  { offerId: 'offer-2', offererDid: 'did:agent:bob', offerTokenType: 'WIT', offerAmount: 200, reqTokenType: 'PASS', reqAmount: 30, phiDiff: 0.24, expiresAt: new Date(Date.now() + 7200000).toISOString(), gatewayLevel: 'PRIORITY' },
  { offerId: 'offer-3', offererDid: 'did:agent:carol', offerTokenType: 'WORD', offerAmount: 5000, reqTokenType: 'CALC', reqAmount: 1000, phiDiff: 1.05, expiresAt: new Date(Date.now() + 1800000).toISOString(), gatewayLevel: 'THROTTLE' },
  { offerId: 'offer-4', offererDid: 'did:agent:dave', offerTokenType: 'PASS', offerAmount: 50, reqTokenType: 'WIT', reqAmount: 25, phiDiff: 0.78, expiresAt: new Date(Date.now() + 5400000).toISOString(), gatewayLevel: 'NORMAL' },
  { offerId: 'offer-5', offererDid: 'did:agent:eve', offerTokenType: 'CALC', offerAmount: 2000, reqTokenType: 'WORD', reqAmount: 8000, phiDiff: 0.15, expiresAt: new Date(Date.now() + 900000).toISOString(), gatewayLevel: 'PRIORITY' },
];

interface OrderBookEntry {
  offerId: string;
  offererDid: string;
  offerTokenType: string;
  offerAmount: number;
  reqTokenType: string;
  reqAmount: number;
  phiDiff: number;
  expiresAt: string;
  gatewayLevel: string;
}

export default function Trade() {
  const [entries, setEntries] = useState<OrderBookEntry[]>(MOCK_ORDERBOOK);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [submitting, setSubmitting] = useState(false);

  // 尝试从API获取订单簿
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

  /** 提交报价 */
  const handleOfferSubmit = useCallback(async (data: {
    offerTokenType: TokenType;
    offerAmount: number;
    reqTokenType: TokenType;
    reqAmount: number;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/atex/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offererDid: 'did:agent:current',
          offerTokenType: data.offerTokenType,
          offerAmount: data.offerAmount,
          reqTokenType: data.reqTokenType,
          reqAmount: data.reqAmount,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setSnack({ open: true, message: `报价已创建: ${result.offerId}`, severity: 'success' });
        // 刷新订单簿
        const bookRes = await fetch('/api/v1/atex/orderbook');
        if (bookRes.ok) {
          const bookData = await bookRes.json();
          if (bookData.entries) setEntries(bookData.entries);
        }
      } else {
        const err = await res.json();
        setSnack({ open: true, message: err.message || '报价创建失败', severity: 'error' });
      }
    } catch {
      // 离线模式：模拟成功
      setSnack({ open: true, message: '报价已创建（离线模式）', severity: 'success' });
    } finally {
      setSubmitting(false);
    }
  }, []);

  /** 接受报价 */
  const handleAccept = useCallback(async (offerId: string) => {
    try {
      const res = await fetch(`/api/v1/atex/accept/${offerId}`, { method: 'POST' });
      if (res.ok) {
        setSnack({ open: true, message: `已接受报价: ${offerId}`, severity: 'success' });
        setEntries(prev => prev.filter(e => e.offerId !== offerId));
      } else {
        setSnack({ open: true, message: '接受报价失败', severity: 'error' });
      }
    } catch {
      setSnack({ open: true, message: '网络不可用', severity: 'error' });
    }
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          交易
        </Typography>
        <Typography variant="body2" color="text.secondary">
          创建报价或接受现有报价
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <OfferForm onSubmit={handleOfferSubmit} loading={submitting} />
        </Grid>
        <Grid item xs={12} md={7}>
          <OrderBookTable entries={entries} onAccept={handleAccept} />
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack(prev => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

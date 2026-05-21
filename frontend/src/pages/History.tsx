/**
 * History — 交易历史页
 * 筛选栏 + TransactionTable + 详情抽屉
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Drawer,
  Divider,
  Chip,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TransactionTable from '../components/TransactionTable';
import { TOKEN_TYPE_LABELS, OFFER_STATUS_LABELS, formatTime, truncateDid } from '../utils/tokenUtils';

/** 模拟交易历史 */
const MOCK_TRANSACTIONS = [
  { id: 'tx-1', offerId: 'offer-1', type: 'PHASE_ENTANGLE', fromDid: 'did:agent:alice', toDid: 'did:agent:bob', tokenType: 'CALC', amount: 500, phiBefore: 0.0, phiAfter: 0.52, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'tx-2', offerId: 'offer-1', type: 'TOPOLOGICAL_TRANSITION', fromDid: 'did:agent:bob', toDid: 'did:agent:alice', tokenType: 'WIT', amount: 100, phiBefore: 0.52, phiAfter: 0.04, createdAt: new Date(Date.now() - 86300000).toISOString() },
  { id: 'tx-3', offerId: 'offer-2', type: 'PHASE_ENTANGLE', fromDid: 'did:agent:carol', toDid: 'did:agent:dave', tokenType: 'WORD', amount: 5000, phiBefore: 1.05, phiAfter: 0.78, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 'tx-4', offerId: 'offer-3', type: 'PHASE_RELAXATION', fromDid: 'did:agent:eve', toDid: 'did:agent:frank', tokenType: 'PASS', amount: 50, phiBefore: 2.1, phiAfter: 2.1, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 'tx-5', offerId: 'offer-4', type: 'TOPOLOGICAL_TRANSITION', fromDid: 'did:agent:grace', toDid: 'did:agent:henry', tokenType: 'CALC', amount: 2000, phiBefore: 0.3, phiAfter: 0.15, createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: 'tx-6', offerId: 'offer-5', type: 'PHASE_ENTANGLE', fromDid: 'did:agent:alice', toDid: 'did:agent:carol', tokenType: 'WIT', amount: 350, phiBefore: 0.8, phiAfter: 1.2, createdAt: new Date(Date.now() - 432000000).toISOString() },
  { id: 'tx-7', offerId: 'offer-6', type: 'TOPOLOGICAL_TRANSITION', fromDid: 'did:agent:bob', toDid: 'did:agent:eve', tokenType: 'WORD', amount: 10000, phiBefore: 1.5, phiAfter: 0.9, createdAt: new Date(Date.now() - 518400000).toISOString() },
  { id: 'tx-8', offerId: 'offer-7', type: 'PHASE_ENTANGLE', fromDid: 'did:agent:dave', toDid: 'did:agent:grace', tokenType: 'PASS', amount: 80, phiBefore: 0.4, phiAfter: 0.67, createdAt: new Date(Date.now() - 604800000).toISOString() },
];

const TX_TYPE_LABELS: Record<string, string> = {
  PHASE_ENTANGLE: '相位缠绕',
  TOPOLOGICAL_TRANSITION: '拓扑相变',
  PHASE_RELAXATION: '相位松弛',
};

export default function History() {
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [detailTx, setDetailTx] = useState<typeof MOCK_TRANSACTIONS[0] | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/v1/atex/history?limit=50');
        if (res.ok) {
          const data = await res.json();
          if (data.transactions && data.transactions.length > 0) {
            setTransactions(data.transactions);
          }
        }
      } catch {
        // 使用模拟数据
      }
    };
    fetchHistory();
  }, []);

  /** 筛选后的交易 */
  const filtered = transactions.filter((tx) => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    // status过滤使用模拟逻辑
    return true;
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          历史
        </Typography>
        <Typography variant="body2" color="text.secondary">
          交易记录与生命周期详情
        </Typography>
      </Box>

      {/* 筛选栏 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>交易类型</InputLabel>
          <Select
            value={filterType}
            label="交易类型"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="ALL">全部</MenuItem>
            <MenuItem value="PHASE_ENTANGLE">相位缠绕</MenuItem>
            <MenuItem value="TOPOLOGICAL_TRANSITION">拓扑相变</MenuItem>
            <MenuItem value="PHASE_RELAXATION">相位松弛</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Token类型</InputLabel>
          <Select
            value={filterStatus}
            label="Token类型"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="ALL">全部</MenuItem>
            <MenuItem value="CALC">算元</MenuItem>
            <MenuItem value="WIT">智元</MenuItem>
            <MenuItem value="WORD">词元</MenuItem>
            <MenuItem value="PASS">通证</MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" size="small" onClick={() => { setFilterType('ALL'); setFilterStatus('ALL'); }}>
          重置
        </Button>
      </Box>

      {/* 交易表格 */}
      <TransactionTable
        transactions={filtered.map(tx => ({
          ...tx,
          phiBefore: tx.phiBefore ?? null,
          phiAfter: tx.phiAfter ?? null,
        }))}
        onRowClick={(tx) => {
          const match = MOCK_TRANSACTIONS.find(m => m.id === tx.id);
          if (match) setDetailTx(match);
        }}
      />

      {/* 交易详情抽屉 */}
      <Drawer
        anchor="right"
        open={!!detailTx}
        onClose={() => setDetailTx(null)}
        PaperProps={{
          sx: { width: 400, bgcolor: 'background.paper', p: 3 },
        }}
      >
        {detailTx && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                交易详情
              </Typography>
              <CloseIcon sx={{ cursor: 'pointer' }} onClick={() => setDetailTx(null)} />
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">交易ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{detailTx.id}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">关联Offer</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{detailTx.offerId}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">类型</Typography>
                <Chip
                  label={TX_TYPE_LABELS[detailTx.type] || detailTx.type}
                  size="small"
                  sx={{ mt: 0.5, display: 'block' }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Token</Typography>
                <Typography variant="body2">{TOKEN_TYPE_LABELS[detailTx.tokenType] || detailTx.tokenType}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">发起方</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{truncateDid(detailTx.fromDid)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">接收方</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{truncateDid(detailTx.toDid)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">数量</Typography>
                <Typography variant="body2" fontWeight={600}>{detailTx.amount}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">时间</Typography>
                <Typography variant="body2">{formatTime(detailTx.createdAt)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Φ (交易前)</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {detailTx.phiBefore != null ? `${(detailTx.phiBefore * 180 / Math.PI).toFixed(1)}°` : '-'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Φ (交易后)</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {detailTx.phiAfter != null ? `${(detailTx.phiAfter * 180 / Math.PI).toFixed(1)}°` : '-'}
                </Typography>
              </Grid>
            </Grid>

            {/* 生命周期事件链 */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                生命周期
              </Typography>
              <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'primary.main' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(detailTx.createdAt)} — {TX_TYPE_LABELS[detailTx.type]}创建
                </Typography>
                {detailTx.type === 'TOPOLOGICAL_TRANSITION' && (
                  <>
                    <br />
                    <Typography variant="caption" sx={{ color: '#10b981' }}>
                      拓扑相变完成 — 新Token已发行给双方
                    </Typography>
                  </>
                )}
                {detailTx.type === 'PHASE_RELAXATION' && (
                  <>
                    <br />
                    <Typography variant="caption" sx={{ color: '#f59e0b' }}>
                      相位松弛 — 临时Token已销毁，原始Token已解锁
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            {/* ZK-Proof 状态 */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                ZK-Proof
              </Typography>
              <Chip
                label="未启用"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'text.secondary' }}
              />
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}

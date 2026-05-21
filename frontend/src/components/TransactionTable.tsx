/**
 * 交易历史表格组件
 * ID、提供方、请求方、Token 对、Φ 差值、状态、时间戳
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Drawer,
  Button,
} from '@mui/material';
import {
  TOKEN_TYPE_LABELS,
  truncateDid,
  formatTime,
  formatPhase,
  formatAmount,
} from '../utils/tokenUtils';

/** 交易类型标签 */
const TX_TYPE_LABELS: Record<string, string> = {
  PHASE_ENTANGLE: '相位缠绕',
  TOPOLOGICAL_TRANSITION: '拓扑相变',
  PHASE_RELAXATION: '相位松弛',
};

/** 交易类型颜色 */
const TX_TYPE_COLORS: Record<string, string> = {
  PHASE_ENTANGLE: '#6366f1',
  TOPOLOGICAL_TRANSITION: '#10b981',
  PHASE_RELAXATION: '#f59e0b',
};

/** 交易条目 */
interface TransactionEntry {
  id: string;
  offerId: string;
  type: string;
  fromDid: string;
  toDid: string;
  tokenType: string;
  amount: number;
  phiBefore: number | null;
  phiAfter: number | null;
  zkProofHash?: string | null;
  createdAt: string;
}

interface TransactionTableProps {
  transactions?: TransactionEntry[];
  page?: number;
  limit?: number;
  onRowClick?: (tx: TransactionEntry) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions: propTransactions,
  page = 1,
  limit = 20,
  onRowClick,
}) => {
  const [transactions, setTransactions] = useState<TransactionEntry[]>(propTransactions || []);
  const [selectedTx, setSelectedTx] = useState<TransactionEntry | null>(null);

  /** 从 API 加载 */
  useEffect(() => {
    if (!propTransactions) {
      fetch(`/api/v1/atex/history?page=${page}&limit=${limit}`)
        .then((res) => res.json())
        .then((data) => setTransactions(data.transactions || []))
        .catch(() => {});
    } else {
      setTransactions(propTransactions);
    }
  }, [propTransactions, page, limit]);

  return (
    <>
      <Card className="atex-card">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
            交易历史 ({transactions.length})
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>ID</TableCell>
                  <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>类型</TableCell>
                  <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>发起方</TableCell>
                  <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>接收方</TableCell>
                  <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>Token</TableCell>
                  <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>数量</TableCell>
                  <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>Φ 变化</TableCell>
                  <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', color: '#4b5563', py: 4 }}>
                      暂无交易记录
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    const typeColor = TX_TYPE_COLORS[tx.type] || '#6b7280';
                    return (
                      <TableRow
                        key={tx.id}
                        hover
                        onClick={() => {
                          setSelectedTx(tx);
                          onRowClick?.(tx);
                        }}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                      >
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#1f2937', fontSize: 11, fontFamily: 'monospace' }}>
                          {tx.id.substring(0, 8)}
                        </TableCell>
                        <TableCell sx={{ borderColor: '#1f2937' }}>
                          <Chip
                            label={TX_TYPE_LABELS[tx.type] || tx.type}
                            size="small"
                            sx={{
                              bgcolor: `${typeColor}20`,
                              color: typeColor,
                              fontWeight: 600,
                              fontSize: 10,
                              height: 20,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#1f2937', fontSize: 12, fontFamily: 'monospace' }}>
                          {truncateDid(tx.fromDid)}
                        </TableCell>
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#1f2937', fontSize: 12, fontFamily: 'monospace' }}>
                          {tx.toDid ? truncateDid(tx.toDid) : '-'}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb', borderColor: '#1f2937', fontSize: 12 }}>
                          {TOKEN_TYPE_LABELS[tx.tokenType] || tx.tokenType}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb', borderColor: '#1f2937', fontSize: 12, fontFamily: 'monospace' }}>
                          {formatAmount(tx.amount)}
                        </TableCell>
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#1f2937', fontSize: 11 }}>
                          {tx.phiBefore != null && tx.phiAfter != null
                            ? `${formatPhase(tx.phiBefore)} → ${formatPhase(tx.phiAfter)}`
                            : '-'}
                        </TableCell>
                        <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 11 }}>
                          {formatTime(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        anchor="right"
        open={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        PaperProps={{
          sx: { width: 360, bgcolor: '#111827', p: 3 },
        }}
      >
        {selectedTx && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
              交易详情
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <DetailRow label="交易 ID" value={selectedTx.id} />
              <DetailRow label="类型" value={TX_TYPE_LABELS[selectedTx.type] || selectedTx.type} />
              <DetailRow label="发起方" value={selectedTx.fromDid} />
              <DetailRow label="接收方" value={selectedTx.toDid || '-'} />
              <DetailRow label="Token 类型" value={TOKEN_TYPE_LABELS[selectedTx.tokenType] || selectedTx.tokenType} />
              <DetailRow label="数量" value={formatAmount(selectedTx.amount)} />
              <DetailRow label="Φ 交易前" value={selectedTx.phiBefore != null ? formatPhase(selectedTx.phiBefore) : '-'} />
              <DetailRow label="Φ 交易后" value={selectedTx.phiAfter != null ? formatPhase(selectedTx.phiAfter) : '-'} />
              <DetailRow label="ZK-Proof" value={selectedTx.zkProofHash ? `${selectedTx.zkProofHash.substring(0, 16)}...` : '无'} />
              <DetailRow label="时间" value={formatTime(selectedTx.createdAt)} />
            </Box>
            <Button
              onClick={() => setSelectedTx(null)}
              sx={{ mt: 3, color: '#6b7280' }}
            >
              关闭
            </Button>
          </Box>
        )}
      </Drawer>
    </>
  );
};

/** 详情行 */
const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box>
    <Typography variant="caption" sx={{ color: '#6b7280' }}>{label}</Typography>
    <Typography variant="body2" sx={{ color: '#e5e7eb', fontFamily: 'monospace', wordBreak: 'break-all' }}>
      {value}
    </Typography>
  </Box>
);

export default TransactionTable;

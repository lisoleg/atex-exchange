/**
 * OrderBookTable — 订单簿表格
 * 显示活跃Offer列表
 */

import React from 'react';
import {
  Box,
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
  useTheme,
} from '@mui/material';
import { TOKEN_TYPE_LABELS, TOKEN_TYPE_COLORS, GATEWAY_LEVEL_LABELS, GATEWAY_LEVEL_COLORS, formatAmount, formatTime, truncateDid } from '../utils/tokenUtils';

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

interface OrderBookTableProps {
  entries: OrderBookEntry[];
  onAccept?: (offerId: string) => void;
}

export default function OrderBookTable({ entries, onAccept }: OrderBookTableProps) {
  const theme = useTheme();

  return (
    <Card className="atex-card">
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          订单簿 ({entries.length})
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, py: 1 }}>提供方</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, py: 1 }}>提供</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, py: 1 }}>请求</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, py: 1 }}>Δθ</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, py: 1 }}>Gateway</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12, py: 1 }}>过期</TableCell>
                {onAccept && (
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12, py: 1 }}>操作</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={onAccept ? 7 : 6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    暂无活跃报价
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const gwColor = GATEWAY_LEVEL_COLORS[entry.gatewayLevel] || '#6366f1';
                  const phiDiffDeg = (entry.phiDiff * 180) / Math.PI;

                  return (
                    <TableRow key={entry.offerId} hover>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                        {truncateDid(entry.offererDid)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: TOKEN_TYPE_COLORS[entry.offerTokenType] }}
                          />
                          {formatAmount(entry.offerAmount)} {TOKEN_TYPE_LABELS[entry.offerTokenType]}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: TOKEN_TYPE_COLORS[entry.reqTokenType] }}
                          />
                          {formatAmount(entry.reqAmount)} {TOKEN_TYPE_LABELS[entry.reqTokenType]}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                        {phiDiffDeg.toFixed(1)}°
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={GATEWAY_LEVEL_LABELS[entry.gatewayLevel] || entry.gatewayLevel}
                          size="small"
                          sx={{
                            bgcolor: `${gwColor}20`,
                            color: gwColor,
                            fontSize: 10,
                            height: 20,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {formatTime(entry.expiresAt)}
                      </TableCell>
                      {onAccept && (
                        <TableCell>
                          <Chip
                            label="Accept"
                            size="small"
                            clickable
                            onClick={() => onAccept(entry.offerId)}
                            sx={{
                              bgcolor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              fontSize: 10,
                              height: 22,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

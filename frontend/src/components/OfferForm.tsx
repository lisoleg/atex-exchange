/**
 * OfferForm — 交易表单
 * 提供/请求Token选择 + 数量 + Φ差值预览 + Gateway级别预判
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Divider,
  Alert,
  useTheme,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import type { TokenType } from '../utils/phiMath';
import { TOKEN_LABELS, TOKEN_COLORS, DEFAULT_PHI_VALUES, calculatePhiDiff, calculateDynamicPrice } from '../utils/phiMath';
import { GATEWAY_LEVEL_LABELS, GATEWAY_LEVEL_COLORS, formatAmount } from '../utils/tokenUtils';

const TOKEN_TYPES: TokenType[] = ['CALC', 'WIT', 'WORD', 'PASS'];

interface OfferFormProps {
  onSubmit?: (data: {
    offerTokenType: TokenType;
    offerAmount: number;
    reqTokenType: TokenType;
    reqAmount: number;
  }) => void;
  loading?: boolean;
}

export default function OfferForm({ onSubmit, loading }: OfferFormProps) {
  const theme = useTheme();

  const [offerTokenType, setOfferTokenType] = useState<TokenType>('CALC');
  const [offerAmount, setOfferAmount] = useState<string>('100');
  const [reqTokenType, setReqTokenType] = useState<TokenType>('WIT');
  const [reqAmount, setReqAmount] = useState<string>('50');

  // 实时计算Φ差值和Gateway预判
  const analysis = useMemo(() => {
    const offerPhi = DEFAULT_PHI_VALUES[offerTokenType];
    const reqPhi = DEFAULT_PHI_VALUES[reqTokenType];
    const phiDiff = calculatePhiDiff(offerPhi, reqPhi);
    const price = calculateDynamicPrice(offerPhi, reqPhi);
    const phiDiffDeg = (phiDiff * 180) / Math.PI;

    let gatewayLevel: 'PRIORITY' | 'NORMAL' | 'THROTTLE' | 'REJECT' = 'NORMAL';
    if (Math.abs(phiDiff) < Math.PI / 8) gatewayLevel = 'PRIORITY';
    else if (Math.abs(phiDiff) > Math.PI / 2) gatewayLevel = 'THROTTLE';
    else if (Math.abs(phiDiff) > (3 * Math.PI) / 4) gatewayLevel = 'REJECT';

    const slippage = Math.abs(phiDiff) * 0.02;
    const oAmount = parseFloat(offerAmount) || 0;
    const rAmount = parseFloat(reqAmount) || 0;
    const impact = slippage * Math.max(oAmount, rAmount);

    return { phiDiff, phiDiffDeg, price, gatewayLevel, slippage, impact };
  }, [offerTokenType, reqTokenType, offerAmount, reqAmount]);

  const handleSubmit = () => {
    onSubmit?.({
      offerTokenType,
      offerAmount: parseFloat(offerAmount) || 0,
      reqTokenType,
      reqAmount: parseFloat(reqAmount) || 0,
    });
  };

  const gwColor = GATEWAY_LEVEL_COLORS[analysis.gatewayLevel];
  const gwLabel = GATEWAY_LEVEL_LABELS[analysis.gatewayLevel];

  return (
    <Card className="atex-card">
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          创建交易报价
        </Typography>

        {/* 提供 Token */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            提供 Token
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={offerTokenType}
                onChange={(e) => setOfferTokenType(e.target.value as TokenType)}
              >
                {TOKEN_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TOKEN_COLORS[t] }} />
                      {TOKEN_LABELS[t]}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="数量"
              sx={{ flex: 1 }}
              inputProps={{ min: 0 }}
            />
          </Box>
        </Box>

        {/* 交换图标 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
          <SwapHorizIcon sx={{ color: 'text.secondary', fontSize: 28 }} />
        </Box>

        {/* 请求 Token */}
        <Box>
          <Typography variant="caption" color="text.secondary">
            请求 Token
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={reqTokenType}
                onChange={(e) => setReqTokenType(e.target.value as TokenType)}
              >
                {TOKEN_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TOKEN_COLORS[t] }} />
                      {TOKEN_LABELS[t]}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="number"
              value={reqAmount}
              onChange={(e) => setReqAmount(e.target.value)}
              placeholder="数量"
              sx={{ flex: 1 }}
              inputProps={{ min: 0 }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Φ 值分析 */}
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Φ 值分析
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">相位差 Δθ</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                {analysis.phiDiffDeg.toFixed(1)}°
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">价格系数</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                {analysis.price.toFixed(4)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">预估滑点</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                {(analysis.slippage * 100).toFixed(2)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">滑点影响</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                {formatAmount(analysis.impact)}
              </Typography>
            </Box>
          </Box>

          {/* Gateway 预判 */}
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">Gateway:</Typography>
            <Chip
              label={gwLabel}
              size="small"
              sx={{
                bgcolor: `${gwColor}20`,
                color: gwColor,
                fontWeight: 600,
                fontSize: 11,
                border: `1px solid ${gwColor}40`,
              }}
            />
          </Box>
        </Box>

        {/* 提交按钮 */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={loading || analysis.gatewayLevel === 'REJECT'}
          sx={{ mt: 2, py: 1.2, fontWeight: 600 }}
        >
          {analysis.gatewayLevel === 'REJECT' ? 'Φ-Gateway 拒绝' : '提交报价'}
        </Button>

        {analysis.gatewayLevel === 'REJECT' && (
          <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
            相位差过大（{analysis.phiDiffDeg.toFixed(1)}°），交易被Φ-Gateway拒绝
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

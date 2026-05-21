/**
 * TokenBalanceCard — 四元Token余额卡片
 * 显示Token类型、余额、Φ模长、相位角
 */

import React from 'react';
import { Box, Card, CardContent, Typography, LinearProgress } from '@mui/material';
import type { TokenType } from '../utils/phiMath';
import { TOKEN_LABELS, TOKEN_COLORS } from '../utils/phiMath';
import { formatAmount, formatPhase } from '../utils/tokenUtils';

interface TokenBalanceCardProps {
  type: TokenType;
  balance: number;
  phiMagnitude: number;
  phiPhase: number;
}

export default function TokenBalanceCard({ type, balance, phiMagnitude, phiPhase }: TokenBalanceCardProps) {
  const label = TOKEN_LABELS[type];
  const color = TOKEN_COLORS[type];

  return (
    <Card className="atex-card" sx={{ position: 'relative', overflow: 'visible' }}>
      {/* 顶部颜色条 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          borderRadius: '12px 12px 0 0',
          background: `linear-gradient(90deg, ${color}, ${color}80)`,
        }}
      />

      <CardContent sx={{ pt: 2.5, pb: 2, '&:last-child': { pb: 2 } }}>
        {/* Token类型 + 图标 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {label}
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: `${color}15`,
              border: `1px solid ${color}30`,
            }}
          >
            <Typography variant="caption" sx={{ color, fontWeight: 700, fontFamily: 'monospace' }}>
              {type}
            </Typography>
          </Box>
        </Box>

        {/* 余额 */}
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1.5, fontFamily: 'monospace' }}>
          {formatAmount(balance)}
        </Typography>

        {/* Φ 值指标 */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              |Φ|
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
              {phiMagnitude.toFixed(3)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              θ
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
              {formatPhase(phiPhase)}
            </Typography>
          </Box>
        </Box>

        {/* Φ模长进度条 */}
        <LinearProgress
          variant="determinate"
          value={Math.min((phiMagnitude / 3) * 100, 100)}
          sx={{
            mt: 1.5,
            height: 4,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.05)',
            '& .MuiLinearProgress-bar': {
              bgcolor: color,
              borderRadius: 2,
            },
          }}
        />
      </CardContent>
    </Card>
  );
}

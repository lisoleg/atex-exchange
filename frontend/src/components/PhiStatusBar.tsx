/**
 * PhiStatusBar — Φ-Gateway 实时状态栏
 * 显示当前Gateway级别 + 网络连接状态
 */

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { usePhiValue } from '../hooks/usePhiValue';
import { GATEWAY_LEVEL_LABELS, GATEWAY_LEVEL_COLORS } from '../utils/tokenUtils';

export default function PhiStatusBar() {
  const { gatewayLevel, gradient, loading } = usePhiValue();

  const levelColor = GATEWAY_LEVEL_COLORS[gatewayLevel] || '#6366f1';
  const levelLabel = GATEWAY_LEVEL_LABELS[gatewayLevel] || gatewayLevel;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        Φ-Gateway:
      </Typography>

      <Chip
        label={loading ? '...' : levelLabel}
        size="small"
        sx={{
          bgcolor: `${levelColor}20`,
          color: levelColor,
          fontWeight: 600,
          fontSize: 12,
          border: `1px solid ${levelColor}40`,
          '& .MuiChip-label': { px: 1.5 },
        }}
      />

      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
        ∇Ψ = {gradient.toFixed(3)}
      </Typography>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <WifiIcon sx={{ fontSize: 16, color: '#10b981' }} />
        <Typography variant="caption" color="text.secondary">
          3 peers
        </Typography>
      </Box>

      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: '#10b981',
          boxShadow: '0 0 8px #10b98180',
          animation: 'phi-pulse 2s ease-in-out infinite',
        }}
      />
    </Box>
  );
}

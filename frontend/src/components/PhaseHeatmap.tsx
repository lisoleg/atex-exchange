/**
 * 相位分布热力图组件
 * 横轴 Token 类型对，纵轴相位差区间，颜色深浅 = 流动性密度
 */

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';

/** Token 类型 */
type TokenType = 'CALC' | 'WIT' | 'WORD' | 'PASS';
const TOKEN_TYPES: TokenType[] = ['CALC', 'WIT', 'WORD', 'PASS'];
const TOKEN_LABELS: Record<string, string> = { CALC: '算元', WIT: '智元', WORD: '词元', PASS: '通证' };

/** 相位差区间 */
const PHASE_RANGES = [
  { label: '0°~30°', min: 0, max: Math.PI / 6 },
  { label: '30°~60°', min: Math.PI / 6, max: Math.PI / 3 },
  { label: '60°~90°', min: Math.PI / 3, max: Math.PI / 2 },
  { label: '90°~120°', min: Math.PI / 2, max: 2 * Math.PI / 3 },
  { label: '120°~150°', min: 2 * Math.PI / 3, max: 5 * Math.PI / 6 },
  { label: '150°~180°', min: 5 * Math.PI / 6, max: Math.PI },
];

interface PhaseHeatmapProps {
  /** 订单簿条目（用于计算密度） */
  entries?: Array<{
    offerTokenType: string;
    reqTokenType: string;
    phiDiff: number;
  }>;
}

/** 生成 Token 类型对标签 */
function getTypePairs(): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < TOKEN_TYPES.length; i++) {
    for (let j = i + 1; j < TOKEN_TYPES.length; j++) {
      pairs.push(`${TOKEN_LABELS[TOKEN_TYPES[i]]}/${TOKEN_LABELS[TOKEN_TYPES[j]]}`);
    }
  }
  return pairs;
}

/** 计算热力图数据 */
function computeHeatmapData(
  entries: Array<{ offerTokenType: string; reqTokenType: string; phiDiff: number }>
): number[][] {
  const pairs: [TokenType, TokenType][] = [];
  for (let i = 0; i < TOKEN_TYPES.length; i++) {
    for (let j = i + 1; j < TOKEN_TYPES.length; j++) {
      pairs.push([TOKEN_TYPES[i], TOKEN_TYPES[j]]);
    }
  }

  // 初始化矩阵 [phaseRange][typePair]
  const matrix = PHASE_RANGES.map(() => pairs.map(() => 0));

  // 统计
  for (const entry of entries) {
    const pairIdx = pairs.findIndex(
      ([a, b]) =>
        (entry.offerTokenType === a && entry.reqTokenType === b) ||
        (entry.offerTokenType === b && entry.reqTokenType === a)
    );
    if (pairIdx === -1) continue;

    const absDiff = Math.abs(entry.phiDiff);
    const rangeIdx = PHASE_RANGES.findIndex(
      (r) => absDiff >= r.min && absDiff < r.max
    );
    if (rangeIdx === -1) continue;

    matrix[rangeIdx][pairIdx]++;
  }

  return matrix;
}

/** 密度 → 颜色 */
function densityToColor(value: number, max: number): string {
  if (max === 0) return '#111827';
  const ratio = value / max;
  if (ratio === 0) return '#111827';
  if (ratio < 0.25) return '#1e3a5f';
  if (ratio < 0.5) return '#2563eb';
  if (ratio < 0.75) return '#7c3aed';
  return '#c026d3';
}

const PhaseHeatmap: React.FC<PhaseHeatmapProps> = ({ entries = [] }) => {
  const typePairs = useMemo(() => getTypePairs(), []);
  const heatmapData = useMemo(() => computeHeatmapData(entries), [entries]);
  const maxDensity = useMemo(
    () => Math.max(...heatmapData.flat(), 1),
    [heatmapData]
  );

  // 无数据时生成模拟热力图
  const hasData = entries.length > 0;

  return (
    <Card className="atex-card">
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
          相位分布热力图
        </Typography>

        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 500 }}>
            {/* 表头：Token 类型对 */}
            <Box sx={{ display: 'flex', gap: 0.5, pl: '80px' }}>
              {typePairs.map((pair) => (
                <Box
                  key={pair}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 11,
                    color: '#6b7280',
                    py: 0.5,
                  }}
                >
                  {pair}
                </Box>
              ))}
            </Box>

            {/* 行：相位差区间 */}
            {PHASE_RANGES.map((range, rowIdx) => (
              <Box key={range.label} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Box sx={{ width: 80, textAlign: 'right', pr: 1, fontSize: 11, color: '#6b7280' }}>
                  {range.label}
                </Box>
                {typePairs.map((_, colIdx) => {
                  const value = hasData ? heatmapData[rowIdx][colIdx] : Math.random() * 5;
                  const color = hasData
                    ? densityToColor(heatmapData[rowIdx][colIdx], maxDensity)
                    : densityToColor(value, 5);
                  return (
                    <Box
                      key={colIdx}
                      sx={{
                        flex: 1,
                        height: 32,
                        bgcolor: color,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: value > 0 ? '#e5e7eb' : '#4b5563',
                        fontWeight: value > 0 ? 600 : 400,
                      }}
                    >
                      {hasData ? (heatmapData[rowIdx][colIdx] || '') : (value > 0.5 ? value.toFixed(0) : '')}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>

          {/* 图例 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>低</Typography>
            {['#111827', '#1e3a5f', '#2563eb', '#7c3aed', '#c026d3'].map((c) => (
              <Box key={c} sx={{ width: 20, height: 12, bgcolor: c, borderRadius: 0.5 }} />
            ))}
            <Typography variant="caption" sx={{ color: '#6b7280' }}>高</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PhaseHeatmap;

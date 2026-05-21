/**
 * 相位极坐标图
 * 用 Recharts RadarChart 展示四种 Token 的相位分布
 */

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { TOKEN_TYPE_LABELS, TOKEN_TYPE_COLORS } from '../utils/tokenUtils';

type TokenType = 'CALC' | 'WIT' | 'WORD' | 'PASS';

interface PhasePolarChartProps {
  phiValues: Record<string, { magnitude: number; phase: number }>;
}

/** 将 Φ 值转换为极坐标数据 */
function transformToRadarData(phiValues: Record<string, { magnitude: number; phase: number }>) {
  const types: TokenType[] = ['CALC', 'WIT', 'WORD', 'PASS'];
  return types.map((type) => {
    const phi = phiValues[type] || { magnitude: 0, phase: 0 };
    return {
      type: TOKEN_TYPE_LABELS[type],
      // 模长 (径向值)
      magnitude: parseFloat(phi.magnitude.toFixed(3)),
      // 相位归一化到 [0, 1] 用于面积展示
      phaseNorm: parseFloat((Math.abs(phi.phase) / Math.PI).toFixed(3)),
      // 原始相位角
      phaseDeg: parseFloat(((phi.phase * 180) / Math.PI).toFixed(1)),
    };
  });
}

const PhasePolarChart: React.FC<PhasePolarChartProps> = ({ phiValues }) => {
  const data = transformToRadarData(phiValues);

  return (
    <Card className="atex-card">
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
          相位分布极坐标图
        </Typography>
        <Box sx={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid
                stroke="#1f2937"
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="type"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 'auto']}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="|Φ| 模长"
                dataKey="magnitude"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="θ/π 相位"
                dataKey="phaseNorm"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  color: '#e5e7eb',
                }}
                formatter={(value: number, name: string) => {
                  if (name === '|Φ| 模长') return [value.toFixed(3), name];
                  if (name === 'θ/π 相位') return [`${(value * 180).toFixed(1)}°`, name];
                  return [value, name];
                }}
              />
              <Legend
                wrapperStyle={{ color: '#9ca3af', fontSize: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PhasePolarChart;

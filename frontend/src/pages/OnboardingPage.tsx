/**
 * OnboardingPage — 首次登录钱包选择引导
 * 三种钱包模式：托管/门限/自托管
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Radio, RadioGroup,
  FormControlLabel, Alert, Fade, Chip,
} from '@mui/material';
import { Shield, Balance, Key, ArrowForward } from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

const walletOptions = [
  {
    value: 'CUSTODIAL',
    label: '托管钱包',
    icon: <Shield sx={{ fontSize: 40 }} />,
    color: '#6366f1',
    desc: '由 ATEX 安全管理，最快 5 秒开始交易',
    badge: '推荐新手',
    pros: ['零配置快速开始', '无需管理密钥', 'ATEX 安全加密存储'],
    cons: ['私钥由服务端管理'],
  },
  {
    value: 'THRESHOLD',
    label: '门限钱包',
    icon: <Balance sx={{ fontSize: 40 }} />,
    color: '#8b5cf6',
    desc: 'MPC 分片存储，兼顾安全与便捷',
    badge: '推荐',
    pros: ['2-of-3 门限签名', '服务端无法单独动用资金', '密钥分片冗余保护'],
    cons: ['首次配置稍复杂'],
  },
  {
    value: 'SELF_CUSTODY',
    label: '自托管钱包',
    icon: <Key sx={{ fontSize: 40 }} />,
    color: '#f59e0b',
    desc: '完全自主掌控，适合高级用户',
    badge: '高级',
    pros: ['完全掌控私钥', '服务端零接触密钥', '最大自主权'],
    cons: ['丢失密钥无法恢复', '需要自行安全管理'],
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { createWallet } = useWallet();
  const { refreshAuth } = useAuth();
  const [selected, setSelected] = useState('THRESHOLD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await createWallet(selected);
      if (result.setupData?.warning) {
        // 展示重要信息后跳转
        alert(result.setupData.warning);
      }
      await refreshAuth();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '创建钱包失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex" flexDirection="column" alignItems="center" justifyContent="center"
      minHeight="100vh" px={2} py={4}
      sx={{ background: 'linear-gradient(180deg, #0a0e17 0%, #111827 100%)' }}
    >
      <Typography variant="h4" fontWeight={700} gutterBottom>
        选择你的钱包类型
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        不同安全级别，满足不同需求。随时可以升级迁移。
      </Typography>

      <RadioGroup value={selected} onChange={e => setSelected(e.target.value)}>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3} mb={4}>
          {walletOptions.map(opt => (
            <Fade in key={opt.value} timeout={600}>
              <Card
                sx={{
                  width: { xs: '100%', md: 300 },
                  cursor: 'pointer',
                  border: selected === opt.value ? `2px solid ${opt.color}` : '2px solid #1f2937',
                  bgcolor: selected === opt.value ? `${opt.color}10` : '#111827',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: opt.color, transform: 'translateY(-2px)' },
                }}
                onClick={() => setSelected(opt.value)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box color={opt.color}>{opt.icon}</Box>
                    <FormControlLabel
                      value={opt.value}
                      control={<Radio size="small" sx={{ color: opt.color, '&.Mui-checked': { color: opt.color } }} />}
                      label=""
                      sx={{ m: 0 }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="h6" fontWeight={600}>{opt.label}</Typography>
                    <Chip label={opt.badge} size="small" sx={{ bgcolor: `${opt.color}20`, color: opt.color, fontSize: '0.7rem' }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={2}>{opt.desc}</Typography>
                  {opt.pros.map((pro, i) => (
                    <Typography key={i} variant="caption" display="block" color="success.main">✓ {pro}</Typography>
                  ))}
                  {opt.cons.map((con, i) => (
                    <Typography key={i} variant="caption" display="block" color="warning.main">⚠ {con}</Typography>
                  ))}
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Box>
      </RadioGroup>

      {error && <Alert severity="error" sx={{ mb: 2, maxWidth: 400 }}>{error}</Alert>}

      <Button
        variant="contained" size="large"
        onClick={handleCreate}
        disabled={loading}
        endIcon={<ArrowForward />}
        sx={{
          px: 6, py: 1.5, borderRadius: 2,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
        }}
      >
        {loading ? '创建中...' : `创建${walletOptions.find(o => o.value === selected)?.label}`}
      </Button>

      <Typography variant="caption" color="text.secondary" mt={2}>
        创建后可随时在 设置 → 钱包 中迁移到更高级别的钱包
      </Typography>
    </Box>
  );
}

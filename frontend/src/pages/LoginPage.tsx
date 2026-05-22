/**
 * LoginPage — 生物友好 DID 登录页
 * 支持 WebAuthn/Passkey 和开发模式登录
 */

import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  IconButton, InputAdornment, Alert, Chip, Divider, Fade,
} from '@mui/material';
import { Fingerprint, VpnKey, Visibility, VisibilityOff, Login as LoginIcon, Science } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, devLogin, state } = useAuth();
  const [did, setDid] = useState('');
  const [name, setName] = useState('');
  const [showDev, setShowDev] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWebAuthnLogin = async () => {
    if (!did.trim()) { setError('请输入 DID'); return; }
    setLoading(true);
    setError('');
    try {
      await login(did.trim(), name.trim() || undefined);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    if (!did.trim()) { setError('请输入 DID'); return; }
    setLoading(true);
    setError('');
    try {
      await devLogin(did.trim(), name.trim() || undefined);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '开发登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex" justifyContent="center" alignItems="center" minHeight="100vh"
      sx={{ background: 'linear-gradient(135deg, #0a0e17 0%, #1a1040 50%, #0a0e17 100%)' }}
    >
      <Fade in timeout={800}>
        <Card sx={{ maxWidth: 440, width: '100%', mx: 2, p: 1 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            {/* Logo */}
            <Box mb={3}>
              <Typography variant="h4" fontWeight={700} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ATEX
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                AgentWeb Token Exchange
              </Typography>
            </Box>

            {/* DID 输入 */}
            <TextField
              fullWidth label="DID 标识符" placeholder="did:agent:alice"
              value={did} onChange={e => setDid(e.target.value)}
              margin="normal" size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><VpnKey fontSize="small" /></InputAdornment>,
              }}
              onKeyDown={e => e.key === 'Enter' && handleWebAuthnLogin()}
            />

            <TextField
              fullWidth label="显示名称（可选）" placeholder="Alice"
              value={name} onChange={e => setName(e.target.value)}
              margin="normal" size="small"
            />

            {error && <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }} onClose={() => setError('')}>{error}</Alert>}

            {/* WebAuthn 登录按钮 */}
            <Button
              fullWidth variant="contained" size="large"
              onClick={handleWebAuthnLogin}
              disabled={loading || !did.trim()}
              startIcon={<Fingerprint />}
              sx={{
                mt: 3, py: 1.5,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
                borderRadius: 2,
              }}
            >
              {loading ? '验证中...' : 'Passkey 生物识别登录'}
            </Button>

            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              使用面容 ID / 指纹 / 设备 PIN 安全登录
            </Typography>

            <Divider sx={{ my: 3 }}>
              <Chip label="或" size="small" sx={{ bgcolor: '#1f2937', color: '#9ca3af' }} />
            </Divider>

            {/* 开发模式登录 */}
            {!showDev ? (
              <Button
                fullWidth variant="outlined" size="small"
                onClick={() => setShowDev(true)}
                startIcon={<Science />}
                sx={{ borderColor: '#374151', color: '#9ca3af', '&:hover': { borderColor: '#6366f1', color: '#6366f1' } }}
              >
                开发模式登录
              </Button>
            ) : (
              <Fade in>
                <Box>
                  <Alert severity="info" sx={{ mb: 2, textAlign: 'left', '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                    开发模式跳过 WebAuthn，仅限本地调试
                  </Alert>
                  <Button
                    fullWidth variant="outlined" size="large"
                    onClick={handleDevLogin}
                    disabled={loading || !did.trim()}
                    startIcon={<LoginIcon />}
                    sx={{ borderColor: '#f59e0b', color: '#f59e0b', '&:hover': { borderColor: '#fbbf24', bgcolor: 'rgba(245,158,11,0.1)' } }}
                  >
                    一键开发登录
                  </Button>
                </Box>
              </Fade>
            )}

            {/* 安全提示 */}
            <Box mt={4} p={2} borderRadius={2} sx={{ bgcolor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <Typography variant="caption" color="text.secondary">
                🔒 ATEX 使用 WebAuthn/Passkey 实现无密码认证。你的生物特征数据仅存储在设备本地，永远不会上传到服务器。
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
}

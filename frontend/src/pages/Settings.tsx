/**
 * 设置页 (Settings)
 * Φ-Gateway 配置 + DID 管理
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

/** DID 记录 */
interface DIDRecord {
  did: string;
  publicKey: string;
  isActive: boolean;
  registeredAt: string;
}

/** Gateway 配置 */
interface GatewayConfig {
  enableDIDVerification: boolean;
  enableGradientCheck: boolean;
  enableIntentPrediction: boolean;
  enableAntiPhaseDetection: boolean;
  enable139Warning: boolean;
  gradientNormalThreshold: number;
  gradientThrottleThreshold: number;
  intentThreshold: number;
  antiphaseBurstThreshold: number;
}

const Settings: React.FC = () => {
  // Gateway 配置
  const [config, setConfig] = useState<GatewayConfig>({
    enableDIDVerification: true,
    enableGradientCheck: true,
    enableIntentPrediction: true,
    enableAntiPhaseDetection: true,
    enable139Warning: true,
    gradientNormalThreshold: 0.5,
    gradientThrottleThreshold: 1.0,
    intentThreshold: 0.3,
    antiphaseBurstThreshold: 5,
  });

  // DID 管理
  const [dids, setDids] = useState<DIDRecord[]>([
    { did: 'did:atex:alice', publicKey: 'pk_alice_001', isActive: true, registeredAt: '2024-01-01' },
    { did: 'did:atex:bob', publicKey: 'pk_bob_002', isActive: true, registeredAt: '2024-01-02' },
    { did: 'did:atex:system', publicKey: 'pk_system_000', isActive: true, registeredAt: '2024-01-01' },
  ]);
  const [newDid, setNewDid] = useState('');
  const [newPublicKey, setNewPublicKey] = useState('');
  const [saved, setSaved] = useState(false);

  /** 保存配置 */
  const handleSaveConfig = () => {
    // 首期仅前端保存（localStorage）
    localStorage.setItem('atex-gateway-config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  /** 添加 DID */
  const handleAddDID = () => {
    if (!newDid || newDid.length < 10) return;
    setDids((prev) => [
      ...prev,
      {
        did: newDid,
        publicKey: newPublicKey || `pk_${newDid.substring(0, 16)}`,
        isActive: true,
        registeredAt: new Date().toISOString().split('T')[0],
      },
    ]);
    setNewDid('');
    setNewPublicKey('');
  };

  /** 删除 DID */
  const handleDeleteDID = (did: string) => {
    setDids((prev) => prev.filter((d) => d.did !== did));
  };

  /** 切换 DID 活跃状态 */
  const handleToggleDID = (did: string) => {
    setDids((prev) =>
      prev.map((d) => (d.did === did ? { ...d, isActive: !d.isActive } : d))
    );
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#e5e7eb', mb: 3 }}>
        系统设置
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          配置已保存
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Φ-Gateway 配置 */}
        <Grid item xs={12} md={6}>
          <Card className="atex-card">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
                Φ-Gateway 配置
              </Typography>

              {/* 功能开关 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableDIDVerification}
                      onChange={(e) => setConfig((c) => ({ ...c, enableDIDVerification: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label="DID 身份验证 (表皮层)"
                  sx={{ color: '#9ca3af' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableGradientCheck}
                      onChange={(e) => setConfig((c) => ({ ...c, enableGradientCheck: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label="共识场梯度检查 (先天免疫层)"
                  sx={{ color: '#9ca3af' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableIntentPrediction}
                      onChange={(e) => setConfig((c) => ({ ...c, enableIntentPrediction: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label="意图校验 (适应性免疫层)"
                  sx={{ color: '#9ca3af' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableAntiPhaseDetection}
                      onChange={(e) => setConfig((c) => ({ ...c, enableAntiPhaseDetection: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label="反相位欺诈检测"
                  sx={{ color: '#9ca3af' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enable139Warning}
                      onChange={(e) => setConfig((c) => ({ ...c, enable139Warning: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label="139 相变预警"
                  sx={{ color: '#9ca3af' }}
                />
              </Box>

              <Divider sx={{ borderColor: '#1f2937', my: 2 }} />

              {/* 阈值参数 */}
              <Typography variant="caption" sx={{ color: '#6b7280', mb: 1, display: 'block' }}>
                阈值参数
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="梯度正常阈值"
                  type="number"
                  size="small"
                  value={config.gradientNormalThreshold}
                  onChange={(e) => setConfig((c) => ({ ...c, gradientNormalThreshold: Number(e.target.value) }))}
                  inputProps={{ step: 0.1 }}
                  fullWidth
                />
                <TextField
                  label="梯度限流阈值"
                  type="number"
                  size="small"
                  value={config.gradientThrottleThreshold}
                  onChange={(e) => setConfig((c) => ({ ...c, gradientThrottleThreshold: Number(e.target.value) }))}
                  inputProps={{ step: 0.1 }}
                  fullWidth
                />
                <TextField
                  label="意图评分阈值"
                  type="number"
                  size="small"
                  value={config.intentThreshold}
                  onChange={(e) => setConfig((c) => ({ ...c, intentThreshold: Number(e.target.value) }))}
                  inputProps={{ step: 0.05 }}
                  fullWidth
                />
                <TextField
                  label="反相位突发阈值"
                  type="number"
                  size="small"
                  value={config.antiphaseBurstThreshold}
                  onChange={(e) => setConfig((c) => ({ ...c, antiphaseBurstThreshold: Number(e.target.value) }))}
                  inputProps={{ step: 1 }}
                  fullWidth
                />
              </Box>

              <Button
                variant="contained"
                fullWidth
                onClick={handleSaveConfig}
                sx={{ mt: 2, bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
              >
                保存配置
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* DID 管理 */}
        <Grid item xs={12} md={6}>
          <Card className="atex-card">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
                DID 管理
              </Typography>

              {/* 添加 DID */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="DID 标识符"
                  size="small"
                  value={newDid}
                  onChange={(e) => setNewDid(e.target.value)}
                  placeholder="did:atex:newagent"
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="公钥"
                  size="small"
                  value={newPublicKey}
                  onChange={(e) => setNewPublicKey(e.target.value)}
                  placeholder="(可选)"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddDID}
                  startIcon={<AddIcon />}
                  sx={{ borderColor: '#374151', color: '#9ca3af' }}
                >
                  添加
                </Button>
              </Box>

              {/* DID 列表 */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>DID</TableCell>
                      <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>公钥</TableCell>
                      <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>状态</TableCell>
                      <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 12 }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dids.map((record) => (
                      <TableRow key={record.did}>
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#1f2937', fontSize: 12, fontFamily: 'monospace' }}>
                          {record.did}
                        </TableCell>
                        <TableCell sx={{ color: '#6b7280', borderColor: '#1f2937', fontSize: 11, fontFamily: 'monospace' }}>
                          {record.publicKey.substring(0, 16)}
                        </TableCell>
                        <TableCell sx={{ borderColor: '#1f2937' }}>
                          <Chip
                            label={record.isActive ? '活跃' : '停用'}
                            size="small"
                            sx={{
                              bgcolor: record.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: record.isActive ? '#10b981' : '#ef4444',
                              fontSize: 10,
                              height: 20,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ borderColor: '#1f2937' }}>
                          <Button
                            size="small"
                            onClick={() => handleToggleDID(record.did)}
                            sx={{ color: '#9ca3af', fontSize: 10 }}
                          >
                            {record.isActive ? '停用' : '启用'}
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDeleteDID(record.did)}
                            sx={{ color: '#ef4444', fontSize: 10 }}
                          >
                            删除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;

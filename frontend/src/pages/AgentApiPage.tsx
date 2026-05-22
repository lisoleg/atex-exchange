/**
 * AgentApiPage — Agent API 管理页面
 * API Key 创建/列表/吊销 + 能力查询
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box, Card, CardContent, Typography, Button, TextField, Checkbox,
  FormControlLabel, FormGroup, Alert, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar,
} from '@mui/material';
import { Add, Delete, ContentCopy, SmartToy, Stream } from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const ALL_PERMISSIONS = [
  'offer:read', 'offer:write', 'balance:read',
  'wallet:read', 'wallet:write', 'agent:read', 'agent:write', '*',
];

export default function AgentApiPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['offer:read', 'balance:read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/apikey`);
      setKeys(data.keys);
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const { data } = await axios.post(`${API_BASE}/apikey`, {
        name: newKeyName.trim(),
        permissions: selectedPerms,
      });
      setCreatedKey(data.key);
      setNewKeyName('');
      fetchKeys();
    } catch (err: any) {
      alert(err.response?.data?.error || '创建失败');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('确定要吊销此 API Key？此操作不可恢复。')) return;
    try {
      await axios.delete(`${API_BASE}/apikey/${id}`);
      fetchKeys();
    } catch { /* ignore */ }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setSnackOpen(true);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Agent API</Typography>
          <Typography variant="body2" color="text.secondary">管理 API 密钥，让 AI Agent 通过 API 自动交易</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setShowCreate(true)}>
          创建 API Key
        </Button>
      </Box>

      {/* 能力概览 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <SmartToy color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>Agent 能力</Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            {['批量执行', 'SSE 事件流', '余额查询', 'Offer 创建/取消', '钱包管理'].map(cap => (
              <Chip key={cap} label={cap} size="small" sx={{ bgcolor: '#1f2937', color: '#9ca3af' }} />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            POST /api/v1/agent/execute &nbsp;|&nbsp; GET /api/v1/agent/stream &nbsp;|&nbsp; GET /api/v1/agent/capabilities
          </Typography>
        </CardContent>
      </Card>

      {/* SSE 连接提示 */}
      <Card sx={{ mb: 3, bgcolor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Stream color="primary" />
          <Box>
            <Typography variant="subtitle2">实时事件流 (SSE)</Typography>
            <Typography variant="caption" color="text.secondary">
              连接: EventSource('{API_BASE}/stream') &nbsp;|&nbsp; 事件: phi-update, orderbook-update, heartbeat
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* API Key 列表 */}
      <TableContainer component={Paper} sx={{ bgcolor: '#111827' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>前缀</TableCell>
              <TableCell>权限</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                  还没有 API Key，点击上方按钮创建
                </TableCell>
              </TableRow>
            ) : keys.map(key => (
              <TableRow key={key.id}>
                <TableCell>{key.name}</TableCell>
                <TableCell><code style={{ color: '#6366f1' }}>{key.keyPrefix}...</code></TableCell>
                <TableCell>
                  {key.permissions.map(p => <Chip key={p} label={p} size="small" sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} />)}
                </TableCell>
                <TableCell>
                  <Chip label={key.isActive ? '活跃' : '已吊销'} size="small" color={key.isActive ? 'success' : 'error'} />
                </TableCell>
                <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => handleRevoke(key.id)} disabled={!key.isActive}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 创建 API Key 对话框 */}
      <Dialog open={showCreate} onClose={() => { setShowCreate(false); setCreatedKey(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{createdKey ? 'API Key 已创建' : '创建 API Key'}</DialogTitle>
        <DialogContent>
          {createdKey ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                ⚠️ 此 API Key 只显示一次！请立即复制并安全保存。
              </Alert>
              <Box p={2} borderRadius={1} sx={{ bgcolor: '#1f2937', wordBreak: 'break-all' }}>
                <Typography variant="body2" fontFamily="monospace">{createdKey}</Typography>
              </Box>
              <Button startIcon={<ContentCopy />} onClick={() => copyKey(createdKey)} sx={{ mt: 1 }}>
                复制到剪贴板
              </Button>
            </Box>
          ) : (
            <Box>
              <TextField fullWidth label="Key 名称" placeholder="my-trading-bot" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} sx={{ mb: 2 }} />
              <Typography variant="subtitle2" mb={1}>权限选择</Typography>
              <FormGroup row>
                {ALL_PERMISSIONS.map(perm => (
                  <FormControlLabel
                    key={perm}
                    control={<Checkbox checked={selectedPerms.includes(perm)} onChange={e => {
                      setSelectedPerms(e.target.checked
                        ? [...selectedPerms, perm]
                        : selectedPerms.filter(p => p !== perm));
                    }} size="small" />}
                    label={<Typography variant="caption">{perm}</Typography>}
                  />
                ))}
              </FormGroup>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {createdKey ? (
            <Button onClick={() => { setShowCreate(false); setCreatedKey(null); }}>完成</Button>
          ) : (
            <>
              <Button onClick={() => setShowCreate(false)}>取消</Button>
              <Button variant="contained" onClick={handleCreate} disabled={!newKeyName.trim()}>创建</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snackOpen} autoHideDuration={2000} onClose={() => setSnackOpen(false)} message="已复制到剪贴板" />
    </Box>
  );
}

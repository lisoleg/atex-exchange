/**
 * NotFoundPage — 404 页面
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
      <Typography variant="h1" fontWeight={700} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        404
      </Typography>
      <Typography variant="h6" color="text.secondary" mb={3}>页面不存在或已被移除</Typography>
      <Button variant="contained" startIcon={<Home />} onClick={() => navigate('/')}>返回首页</Button>
    </Box>
  );
}

/**
 * Layout 深色主题布局
 * 左侧导航 + 顶部状态栏 + 主内容区
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WaterfallChartIcon from '@mui/icons-material/WaterfallChart';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PhiStatusBar from './PhiStatusBar';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 220;

/** 导航项配置 */
const NAV_ITEMS = [
  { path: '/', label: '总览', icon: <DashboardIcon /> },
  { path: '/trade', label: '交易', icon: <SwapHorizIcon /> },
  { path: '/liquidity', label: '流动性', icon: <WaterfallChartIcon /> },
  { path: '/history', label: '历史', icon: <HistoryIcon /> },
  { path: '/wallet', label: '钱包', icon: <AccountBalanceWalletIcon /> },
  { path: '/agent-api', label: 'Agent API', icon: <SmartToyIcon /> },
  { path: '/settings', label: '设置', icon: <SettingsIcon /> },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { logout, state: authState } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo 区域 */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Φ
        </Box>
        <Typography variant="h6" fontWeight="bold" sx={{ color: 'primary.main' }}>
          ATEX
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* 导航列表 */}
      <List sx={{ flex: 1, pt: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ px: 1, mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* 底部信息 + 注销 */}
      <Box sx={{ p: 2 }}>
        {authState.agent && (
          <Box mb={1}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-all' }}>
              {authState.agent.did}
            </Typography>
            <Typography variant="caption" color="primary.main">
              {authState.agent.walletType || '未设钱包'}
            </Typography>
          </Box>
        )}
        <ListItemButton
          onClick={async () => { await logout(); navigate('/login'); }}
          sx={{ borderRadius: 2, py: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="注销" primaryTypographyProps={{ fontSize: 12 }} />
        </ListItemButton>
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          ATEX v2.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* 侧边栏 - 桌面端 */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: 0 }}
      >
        {/* 移动端抽屉 */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* 桌面端固定侧边栏 */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
              position: 'relative',
              height: '100vh',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* 主内容区 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 顶部状态栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            gap: 2,
          }}
        >
          <IconButton
            sx={{ display: { md: 'none' } }}
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <PhiStatusBar />
        </Box>

        {/* 页面内容 */}
        <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

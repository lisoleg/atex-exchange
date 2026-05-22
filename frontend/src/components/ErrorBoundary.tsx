/**
 * ErrorBoundary — React 错误边界
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh" p={3}>
          <Card sx={{ maxWidth: 480, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="error" gutterBottom>出错了</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {this.state.error?.message || '页面渲染时发生错误'}
              </Typography>
              <Button variant="outlined" startIcon={<Refresh />} onClick={() => this.setState({ hasError: false, error: null })}>
                重试
              </Button>
            </CardContent>
          </Card>
        </Box>
      );
    }
    return this.props.children;
  }
}

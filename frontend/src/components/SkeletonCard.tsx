/**
 * SkeletonCard — 骨架屏卡片
 */

import React from 'react';
import { Box, Skeleton } from '@mui/material';

export default function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <Box>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} mb={2} p={2} borderRadius={2} sx={{ bgcolor: '#111827', border: '1px solid #1f2937' }}>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="80%" height={18} />
          <Skeleton variant="text" width="60%" height={18} />
          <Box display="flex" gap={2} mt={2}>
            <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

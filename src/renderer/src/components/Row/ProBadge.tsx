// src/renderer/src/components/Row/ProBadge.tsx
import type { FC } from 'react'
import { Chip } from '@mui/material'
import { Star } from '@mui/icons-material' // Or other "Pro" icon

export const ProBadge: FC = () => {
  return (
    <Chip
      icon={<Star sx={{ fontSize: '1rem !important' }} />} // Important to override default icon size in chip
      label="Pro"
      size="small"
      color="primary" // Or "warning", "info"
      variant="outlined" // Or "filled"
      sx={{ ml: 1, opacity: 1, '& .MuiChip-label': { fontSize: '0.65rem' } }}
    />
  )
}

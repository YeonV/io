// src/renderer/src/modules/PlaySound/PlaySoundOutputDisplay.tsx
import type { FC, JSX } from 'react'
import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { Loop as LoopIcon } from '@mui/icons-material'
import type { OutputData } from '@shared/types'
import DisplayButtons from '@/components/Row/DisplayButtons' // For the module type button
import type { PlaySoundOutputData } from '../PlaySound.types'
import MiniPlayer from './MiniPlayer' // Import the MiniPlayer component

export interface PlaySoundOutputDisplayProps {
  output: OutputData // This is row.output
  rowId: string // Pass rowId to MiniPlayer
}

export const PlaySoundOutputDisplay: FC<PlaySoundOutputDisplayProps> = ({ output, rowId }) => {
  const data = output.data as PlaySoundOutputData
  // const displayFileName = data.originalFileName || 'No file selected'

  // Determine what extra info to show (Loop, Parallel)
  const displayInfoBadges: JSX.Element[] = []
  if (data.loop) {
    // Check if loop is true
    displayInfoBadges.push(
      <Tooltip title="Looping" key="loop-badge">
        <LoopIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
      </Tooltip>
    )
  }
  if (data.cancelPrevious === false) {
    // Show only if set to parallel (non-default)
    displayInfoBadges.push(
      <Tooltip title="Plays in Parallel" key="parallel-badge">
        {/* Using a distinct symbol for parallel, or you can use an MUI icon if you find a suitable one */}
        <Typography
          variant="caption"
          sx={{ fontWeight: 'bold', color: 'text.secondary', lineHeight: '0.9rem' }}
        >
          ||
        </Typography>
      </Tooltip>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
        <DisplayButtons
          data={{ ...output, name: 'Play Sound', label: output.label }}
          sxMobile={{ width: 50 }}
        />

        <Stack sx={{ textAlign: 'left', flexGrow: 1, overflow: 'hidden', minWidth: 0 }}>
          {/* <Tooltip title={displayFileName}>
            <Typography variant="body2" noWrap>
              {displayFileName.length > 20
                ? `${displayFileName.substring(0, 17)}...`
                : displayFileName}
            </Typography>
          </Tooltip> */}
          {/* Render the MiniPlayer for interactive controls */}
          {/* Only render MiniPlayer if an audioId is actually configured */}
          {data.audioId && data.originalFileName && <MiniPlayer rowId={rowId} outputData={data} />}
          {/* {displayInfoBadges.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minHeight: '1.2em', // Ensure space for icons even if one is not present
                mt: 0.25 // Small margin top for badge line
              }}
            >
              {displayInfoBadges}
            </Box>
          )} */}
        </Stack>
      </Box>
    </Box>
  )
}

// This component will be imported and re-exported as 'OutputDisplay'
// by the main PlaySoundModule.tsx file.
// So, no default export here is needed if following that pattern.
// export default PlaySoundOutputDisplay;

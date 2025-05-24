// src/renderer/src/components/CopyButton.tsx
import type { FC } from 'react'
import { IconButton, Tooltip, type IconButtonProps } from '@mui/material'
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material'
import { useSnackbar } from 'notistack'

// Extend IconButtonProps to include our custom props
export interface CopyButtonProps extends Omit<IconButtonProps, 'onClick'> {
  // Omit onClick as we handle it
  valueToCopy: string
  tooltipTitle?: string
  onCopySuccess?: (copiedValue: string) => void
  onCopyError?: (error: Error) => void
  // We can add children prop if we want to customize the icon, but default is good
  // children?: ReactNode; // To override default icon
}

export const CopyButton: FC<CopyButtonProps> = ({
  valueToCopy,
  tooltipTitle = 'Copy to clipboard',
  onCopySuccess,
  onCopyError,
  children, // To allow custom icon if needed, though we default to ContentCopyIcon
  ...iconButtonProps // Spread remaining IconButtonProps
}) => {
  const { enqueueSnackbar } = useSnackbar()

  const handleCopyToClipboard = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any parent onClick if this button is nested
    event.stopPropagation()

    if (!valueToCopy && typeof valueToCopy !== 'string') {
      // Check if valueToCopy is undefined/null or not a string
      enqueueSnackbar('Nothing to copy.', { variant: 'info', autoHideDuration: 2000 })
      return
    }

    try {
      await navigator.clipboard.writeText(valueToCopy)
      enqueueSnackbar('Copied to clipboard!', { variant: 'success', autoHideDuration: 1500 })
      if (onCopySuccess) {
        onCopySuccess(valueToCopy)
      }
    } catch (err) {
      console.error('Failed to copy to clipboard: ', err)
      enqueueSnackbar('Failed to copy. See console for error.', { variant: 'error' })
      if (onCopyError) {
        onCopyError(err as Error)
      }
    }
  }

  return (
    <Tooltip title={tooltipTitle}>
      <IconButton
        aria-label={tooltipTitle} // Good for accessibility
        onClick={handleCopyToClipboard}
        size="small"
        sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
        {...iconButtonProps} // Spread size, color, sx, edge, etc.
      >
        {children || (
          <ContentCopyIcon fontSize={iconButtonProps.size === 'small' ? 'inherit' : 'small'} />
        )}
      </IconButton>
    </Tooltip>
  )
}

export default CopyButton

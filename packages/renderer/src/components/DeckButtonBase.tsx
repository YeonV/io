import { Button, Typography, Grid } from '@mui/material'
import IoIcon from '@/components/IoIcon/IoIcon'

interface DeckButton {
  textColor?: string
  iconColor?: string
  buttonColor?: string
  background?: string
  icon?: string
  label?: string
  variant?: 'text' | 'outlined' | 'contained'
  onClick: () => void
}
const DeckButtonBase = ({
  textColor,
  iconColor,
  buttonColor,
  icon,
  label,
  variant,
  onClick,
}: DeckButton) => {
  return (
    <div style={{ color: buttonColor }}>
      <Button
        variant={variant || 'outlined'}
        onClick={onClick}
        color='inherit'
        sx={
          variant === 'contained'
            ? {
              'background': buttonColor,
              '&:hover .MuiTypography-root': { color: buttonColor },
              '&:hover .MuiIcon-root': { color: buttonColor },
            }
            : {}
        }
      >
        <div
          style={{
            color: iconColor || '#999',
            display: 'flex',
            flexDirection: 'column',
            width: 90,
            height: 90,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon ? <IoIcon name={icon} style={{ fontSize: 50 }} /> : <></>}
          {label ? (
            <Typography variant='caption' color={textColor || '#999'}>
              {label}
            </Typography>
          ) : (
            <></>
          )}
        </div>
      </Button>
    </div>
  )
}

export default DeckButtonBase

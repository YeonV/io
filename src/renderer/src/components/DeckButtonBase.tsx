import { Button, Typography } from '@mui/material'
import IoIcon from '@/components/IoIcon/IoIcon'

interface DeckButton {
  textColor?: string
  iconColor?: string
  buttonColor?: string
  background?: string
  icon?: string
  label?: string
  variant?: 'text' | 'outlined' | 'contained'
  children?: React.ReactNode
  className?: string
  fontFamily?: string
  onClick?: () => void
}
const DeckButtonBase = ({
  textColor,
  iconColor,
  buttonColor,
  icon,
  label,
  variant,
  children,
  className,
  fontFamily,
  onClick,
  ...rest
}: DeckButton) => {
  return (
    <div style={{ color: buttonColor, position: 'relative', height: '100%', width: '100%' }}>
      <Button
        {...rest}
        className={className}
        variant={variant || 'outlined'}
        onClick={onClick}
        color="inherit"
        sx={
          variant === 'contained'
            ? {
                padding: 0,
                width: '100%',
                height: '100%',
                background: buttonColor,
                '&:hover .MuiTypography-root': { color: buttonColor },
                '&:hover .MuiIcon-root': { color: buttonColor }
              }
            : {
                padding: 0,
                width: '100%',
                height: '100%'
              }
        }
      >
        <div
          style={{
            color: iconColor || '#999',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon ? <IoIcon name={icon} style={{ fontSize: 50 }} /> : <></>}
          {label ? (
            <Typography variant="caption" color={textColor || '#999'} fontFamily={fontFamily}>
              {label}
            </Typography>
          ) : (
            <></>
          )}
        </div>
      </Button>
      {children}
    </div>
  )
}

export default DeckButtonBase

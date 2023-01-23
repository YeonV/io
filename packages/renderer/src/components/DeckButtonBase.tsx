import { Button, Typography, Grid } from '@mui/material'
import IoIcon from '@/components/IoIcon/IoIcon'
import { ReactJSXElement } from '@emotion/react/types/jsx-namespace'

interface DeckButton {
  textColor?: string
  iconColor?: string
  buttonColor?: string
  background?: string
  icon?: string
  label?: string
  variant?: 'text' | 'outlined' | 'contained'
  children?: ReactJSXElement
  onClick: () => void
}
const DeckButtonBase = ({
  textColor,
  iconColor,
  buttonColor,
  icon,
  label,
  variant,
  children,
  onClick,
  ...rest
}: DeckButton) => {
  return (
    <div style={{ color: buttonColor, position: 'relative' }}>
      <Button
        {...rest}
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
      {children}
    </div>
  )
}

export default DeckButtonBase

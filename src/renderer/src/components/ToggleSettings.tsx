import { useStore } from '@/store/OLD/useStore'
import { Videocam, VideocamOff } from '@mui/icons-material'
import { ToggleButton, Typography } from '@mui/material'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Switch from '@mui/material/Switch'
import type { FC } from 'react'

export type SettingsProps = {
  name: string
  textTurnOn?: string
  textTurnOff?: string
  iconOn?: JSX.Element
  iconOff?: JSX.Element
  variant?: 'button' | 'switch'
}

const ToggleSettings: FC<SettingsProps> = ({
  name = 'cam',
  textTurnOn = 'Turn On',
  textTurnOff = 'Turn Off',
  iconOn = <Videocam />,
  iconOff = <VideocamOff color="disabled" />,
  variant = 'button'
}: SettingsProps) => {
  const inputs = useStore((state) => state.inputs)
  const toggleInput = useStore((state) => state.toggleInput)
  return variant === 'button' ? (
    <ToggleButton
      key={name}
      size="large"
      value="camera"
      sx={{
        '& .MuiSvgIcon-root': { fontSize: 50 }
        // '&.MuiToggleButton-root': { margin: 2 },
      }}
      selected={inputs[name as keyof typeof inputs]}
      onChange={() => toggleInput(name)}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 90,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="caption" color={'#999'}>
          {name} is {inputs[name as keyof typeof inputs] ? 'on' : 'off'}
        </Typography>
        {inputs[name as keyof typeof inputs] ? iconOn : iconOff}
        <Typography variant="caption" color={'#999'}>
          {inputs[name as keyof typeof inputs] ? textTurnOff : textTurnOn}
        </Typography>
      </div>
    </ToggleButton>
  ) : (
    <FormGroup>
      <FormControlLabel
        labelPlacement="end"
        control={
          <Switch
            checked={inputs[name as keyof typeof inputs]}
            onChange={() => toggleInput(name)}
          />
        }
        label={name}
      />
    </FormGroup>
  )
}

export default ToggleSettings

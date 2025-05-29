import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { type MouseEvent, useState } from 'react'
import GamepadSvgPs3 from './GamepadSvgPs3'
import GamepadSvgPs5 from './GamepadSvgPs5'

const GamepadVisualizer = ({ pad }: { pad: Gamepad }) => {
  const [alignment, setAlignment] = useState('ps3')

  const handleChange = (_event: MouseEvent<HTMLElement>, newAlignment: string) => {
    setAlignment(newAlignment)
  }

  return (
    <>
      <ToggleButtonGroup
        color="primary"
        value={alignment}
        exclusive
        onChange={handleChange}
        aria-label="Platform"
        sx={{ zIndex: 2 }}
      >
        <ToggleButton value="ps3">ps3</ToggleButton>
        <ToggleButton value="ps5">ps5</ToggleButton>
      </ToggleButtonGroup>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', zIndex: 1 }}>
        {alignment === 'ps3' && <GamepadSvgPs3 pad={pad} />}
        {alignment === 'ps5' && <GamepadSvgPs5 pad={pad} />}
      </div>
    </>
  )
}

export default GamepadVisualizer

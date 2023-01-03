import { useStore } from '@/store/OLD/useStore'
import { Box, FormControlLabel, FormGroup, Switch } from '@mui/material'
import MqttSettings from './MQTT/MqttSettings'

const Settings = () => {
  const inputs = useStore((state) => state.inputs)
  const outputs = useStore((state) => state.outputs)
  const toggleInput = useStore((state) => state.toggleInput)
  const toggleOutput = useStore((state) => state.toggleOutput)

  return (
    <Box sx={{ mb: 5, mt: 2.5, maxWidth: 500, width: '100%' }}>
      <Box
        sx={{
          mb: 5,
          mt: 2.5,
          mr: 'auto',
          ml: 'auto',
          maxWidth: 100,
          textAlign: 'center',
        }}
      >
        <FormGroup>
          <FormControlLabel
            labelPlacement='start'
            control={
              <Switch
                value={inputs.midi}
                onChange={() => toggleInput('midi')}
              />
            }
            label='MIDI'
          />
        </FormGroup>
        <FormGroup>
          <FormControlLabel
            labelPlacement='start'
            control={
              <Switch value={inputs.cam} onChange={() => toggleInput('cam')} />
            }
            label='CAM'
          />
        </FormGroup>
        <FormGroup>
          <FormControlLabel
            labelPlacement='start'
            control={
              <>
                <MqttSettings />
                <Switch
                  value={inputs.mqtt && outputs.mqtt}
                  onChange={() => {
                    toggleInput('mqtt')
                    toggleOutput('mqtt')
                  }}
                />
              </>
            }
            label='MQTT'
          />
        </FormGroup>
      </Box>
    </Box>
  )
}
export default Settings

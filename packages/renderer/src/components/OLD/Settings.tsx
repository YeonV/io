import { useStore } from '@/store/OLD/useStore'
import { Box, FormControlLabel, FormGroup, Switch } from '@mui/material'
// import MqttSettings from './MQTT/MqttSettings'
const ipcRenderer = window.ipcRenderer || false

const Settings = ({ add }: { add: boolean }) => {
  const inputs = useStore((state) => state.inputs)
  const outputs = useStore((state) => state.outputs)
  const toggleInput = useStore((state) => state.toggleInput)
  const toggleOutput = useStore((state) => state.toggleOutput)

  return (
    <Box
      sx={{
        mb: 0,
        mt: 0,
        maxWidth: 100,
        textAlign: 'center',
      }}
    >
      {!ipcRenderer && (
        <FormGroup>
          <FormControlLabel
            labelPlacement='end'
            control={
              <Switch
                checked={inputs.midi}
                onChange={() => toggleInput('midi')}
              />
            }
            label='MIDI'
          />
        </FormGroup>
      )}
      {add && (
        <FormGroup>
          <FormControlLabel
            labelPlacement='end'
            control={
              <Switch value={inputs.cam} onChange={() => toggleInput('cam')} />
            }
            label='CAM'
          />
        </FormGroup>
      )}
      {/* <FormGroup>
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
        </FormGroup> */}
    </Box>
  )
}
export default Settings

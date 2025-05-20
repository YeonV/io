import { InputData, OutputData } from '@shared/types'
import { IconButton, TextField } from '@mui/material'
import { RecordVoiceOver } from '@mui/icons-material'

const EditButtons = ({
  data,
  title,
  speak,
  onChange
}: {
  data: InputData | OutputData
  title?: string
  speak?: boolean
  onChange: (data: Record<string, any>) => void
}) => {
  return (
    <>
      <TextField
        fullWidth
        label={title || 'Command'}
        value={data.data.command ?? ''}
        onChange={(e) => {
          onChange({ command: e.target.value })
        }}
        sx={{ mt: '4px' }}
        variant="outlined"
        slotProps={{
          htmlInput: {
            style: {
              paddingLeft: '20px'
            }
          },
          input: {
            endAdornment: speak ? (
              <IconButton
                onClick={() =>
                  window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.data.command))
                }
              >
                <RecordVoiceOver />
              </IconButton>
            ) : null
          }
        }}
      />
      <TextField
        fullWidth
        label={'Unique Name for this action'}
        value={data.data.text ?? ''}
        onChange={(e) => {
          onChange({ text: e.target.value })
        }}
        sx={{ mt: 2 }}
        variant="outlined"
        slotProps={{
          htmlInput: {
            style: {
              paddingLeft: '20px'
            }
          }
        }}
      />
    </>
  )
}

export default EditButtons

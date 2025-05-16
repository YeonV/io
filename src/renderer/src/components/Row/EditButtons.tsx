import { InputData, OutputData } from '@shared/types'
import { TextField } from '@mui/material'

const EditButtons = ({
  data,
  title,
  onChange
}: {
  data: InputData | OutputData
  title?: string
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
        sx={{ mt: 2 }}
        inputProps={{
          style: {
            paddingLeft: '20px'
          }
        }}
        variant="outlined"
      />
      <TextField
        fullWidth
        label={'Unique Name for this action'}
        value={data.data.text ?? ''}
        onChange={(e) => {
          onChange({ text: e.target.value })
        }}
        sx={{ mt: 2 }}
        inputProps={{
          style: {
            paddingLeft: '20px'
          }
        }}
        variant="outlined"
      />
    </>
  )
}

export default EditButtons

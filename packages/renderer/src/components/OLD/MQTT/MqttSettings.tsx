import { useState, forwardRef } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Slide from '@mui/material/Slide'
import { TransitionProps } from '@mui/material/transitions'
import { IconButton, Stack, TextField } from '@mui/material'
import { Settings } from '@mui/icons-material'
import { useStore } from '@/store/useStore'

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction='left' ref={ref} {...props} />
})

export default function MqttSettings() {
  const mqttData = useStore((state) => state.mqttData)
  const setMqttData = useStore((state) => state.setMqttData)
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    window.location.reload()
  }

  return (
    <div>
      <IconButton sx={{ mt: '-0.6rem' }} size='small' onClick={handleClickOpen}>
        <Settings />
      </IconButton>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby='alert-dialog-slide-description'
      >
        <DialogTitle>{'MQTT Connection Settings'}</DialogTitle>
        <DialogContent>
          <Stack direction={'column'} spacing={2} sx={{ mt: '0.6rem' }}>
            <TextField
              style={{ width: '100%' }}
              value={mqttData.host}
              onChange={(e: any) => setMqttData('host', e.target.value)}
              variant={'outlined'}
              label='Host'
            />
            <TextField
              style={{ width: '100%' }}
              value={mqttData.username}
              onChange={(e: any) => setMqttData('username', e.target.value)}
              variant={'outlined'}
              label='Username'
            />
            <TextField
              style={{ width: '100%' }}
              value={mqttData.password}
              onChange={(e: any) => setMqttData('password', e.target.value)}
              variant={'outlined'}
              label='Password'
              type='password'
            />
            <TextField
              style={{ width: '100%' }}
              value={mqttData.topic}
              onChange={(e: any) => setMqttData('topic', e.target.value)}
              variant={'outlined'}
              label='Topic'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

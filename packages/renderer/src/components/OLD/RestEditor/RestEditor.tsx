import { useState } from 'react'
import Button from '@mui/material/Button'
import DialogTitle from '@mui/material/DialogTitle'
import Dialog from '@mui/material/Dialog'
import {
  DialogActions,
  DialogContent,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import JSONInput from 'react-json-editor-ajrm'
import locale from './en.js'

import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import { ToggleOff } from '@mui/icons-material'

export default function RestEditor({
  onChange,
}: {
  onChange: (e: any) => void
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('http://192.168.1.170')
  const [method, setMethod] = useState('GET')
  const placeholderHeader = {
    Authorization: 'Bearer token',
  }
  const placeholderBody = {
    id: 'red',
    action: 'activate',
  }
  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <div>
      <Button variant='outlined' onClick={handleClickOpen}>
        RestEditor
      </Button>
      <Dialog onClose={handleClose} open={open}>
        <DialogTitle>REST Editor</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ width: '100%', bgcolor: '#1e1e1e' }}
            defaultValue={'UniqueName'}
          />
          <Stack direction={'row'} sx={{ width: '550px', mt: 2 }}>
            <Select
              variant='outlined'
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              defaultValue={'GET'}
              sx={{ bgcolor: '#1e1e1e' }}
            >
              <MenuItem value={'GET'}>GET</MenuItem>
              <MenuItem value={'PUT'}>PUT</MenuItem>
              <MenuItem value={'POST'}>POST</MenuItem>
              <MenuItem value={'DELETE'}>DELETE</MenuItem>
            </Select>
            <TextField
              sx={{ width: '100%', ml: 2, bgcolor: '#1e1e1e' }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Stack>
          <Accordion sx={{ border: '1px solid #555' }}>
            <AccordionSummary
              expandIcon={<ToggleOff />}
              aria-controls='panel1a-content'
              id='panel1a-header'
            >
              <Typography variant='caption'>Header</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <JSONInput
                id='a_unique_id'
                placeholder={placeholderHeader}
                locale={locale}
                height='100px'
                width='100%'
                onChange={(e: any) => onChange(e)}
              />
            </AccordionDetails>
          </Accordion>

          {(method === 'POST' || method === 'PUT') && (
            <Accordion sx={{ border: '1px solid #555' }}>
              <AccordionSummary
                expandIcon={<ToggleOff />}
                aria-controls='panel1a-content'
                id='panel1a-header'
              >
                <Typography variant='caption'>Body</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <JSONInput
                  id='a_unique_id'
                  placeholder={placeholderBody}
                  locale={locale}
                  height='100px'
                  width='100%'
                />
              </AccordionDetails>
            </Accordion>
          )}
        </DialogContent>
        <DialogActions sx={{ m: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleClose}>Test</Button>
          <Button onClick={handleClose}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

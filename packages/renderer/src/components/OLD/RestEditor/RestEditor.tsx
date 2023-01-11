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
  const [name, setName] = useState('UniqueName')
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const [headerExpanded, setHeaderExpanded] = useState(false)
  const [message, setMessage] = useState('http://192.168.1.170')
  const [method, setMethod] = useState('GET')
  const placeholderHeader = {
    Authorization: 'Bearer token',
  }
  const placeholderBody = {
    id: 'red',
    action: 'activate',
  }
  const [header, setHeader] = useState(placeholderHeader)
  const [body, setBody] = useState(placeholderBody)
  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }
  const handleSave = () => {
    onChange({
      name,
      host: message,
      options: {
        method: method,
        ...(headerExpanded && { headers: header }),
        ...(bodyExpanded && { body: JSON.stringify(body) }),
      },
    })
    setOpen(false)
  }

  const testRest = async () => {
    await fetch(message, {
      method: method,
      ...(headerExpanded && { headers: header }),
      ...(bodyExpanded && { body: JSON.stringify(body) }),
    })
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
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <Accordion
            sx={{ border: '1px solid #555' }}
            expanded={headerExpanded}
            onChange={() => setHeaderExpanded(!headerExpanded)}
          >
            <AccordionSummary
              expandIcon={<ToggleOff />}
              aria-controls='panel1a-content'
              id='panel1a-header'
            >
              <Typography variant='caption'>Header</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <JSONInput
                id='restheader'
                placeholder={header}
                locale={locale}
                height='100px'
                width='100%'
                onBlur={(e: any) => setHeader(e.jsObject)}
              />
            </AccordionDetails>
          </Accordion>

          {(method === 'POST' || method === 'PUT') && (
            <Accordion
              sx={{ border: '1px solid #555' }}
              expanded={bodyExpanded}
              onChange={() => setBodyExpanded(!bodyExpanded)}
            >
              <AccordionSummary
                expandIcon={<ToggleOff />}
                aria-controls='panel1a-content'
                id='panel1a-header'
              >
                <Typography variant='caption'>Body</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <JSONInput
                  id='restbody'
                  placeholder={body}
                  locale={locale}
                  height='100px'
                  width='100%'
                  onBlur={(e: any) => setBody(e.jsObject)}
                />
              </AccordionDetails>
            </Accordion>
          )}
        </DialogContent>
        <DialogActions sx={{ m: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={testRest}>Test</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

import { useState } from 'react';
import { Button, Input, Stack } from '@mui/material';
import { useHotkeys } from 'react-hotkeys-hook';
import { Keyboard } from '@mui/icons-material';

const Shortkey = ({
  addShortcut = (s: any, t: any) => { },
  keystring = "ctrl+alt+y",
  trigger = () => alert('Boom'),
  edit = false
}) => {
  const [shortcut, setShortcut] = useState(keystring)
  const [message, setMessage] = useState('Hacked by Blade')
  const [ctrl, setCtrl] = useState(false)
  const [alt, setAlt] = useState(false)
  const [shift, setShift] = useState(false)
  const [win, setWin] = useState(false)
  const [key, setKey] = useState('')


  useHotkeys(keystring, () => trigger())

  return edit ? (<>
    <Stack direction={"row"} gap={2} style={{ position: 'relative'}}>
      <Keyboard fontSize={'large'} />
      <Input
        value={''}
        style={{width: 400}}
        onKeyDown={(e) => {
          if (e.ctrlKey) {
            setCtrl(true)
          }
          if (e.altKey) {
            setAlt(true)
          }
          if (e.shiftKey) {
            setShift(true)
          }
          if (e.metaKey) {
            setWin(true)
          }
          if (e.code.includes('Key') && e.code.replace('Key', '') && e.code.replace('Key', '') !== '') {
            setKey(e.code.replace('Key', ''))
          }
          setShortcut([e.ctrlKey ? 'ctrl' : null, e.altKey ? 'alt' : null, e.shiftKey ? 'shift' : null, e.metaKey ? 'win' : null, e.code.includes('Key') && e.code.replace('Key', '')].filter(n => n).join('+'))
        }}
        onKeyUp={(e) => {
          if (e.ctrlKey === false) {
            setCtrl(false)
          }
          if (e.altKey === false) {
            setAlt(false)
          }
          if (e.shiftKey === false) {
            setShift(false)
          }
          if (e.metaKey === false) {
            setWin(false)
            setKey('')
          }
          if (e.code.includes('Key')) {
            setKey('')
          }
          console.log(e)
        }}
      />
      <Stack direction={'row'} gap={2} style={{ position: 'absolute', left: 50}}>
        {shortcut.split('+').map((s, i) => <Button style={{ pointerEvents: 'none'}} key={i} variant={(s === 'ctrl' && ctrl) || (s === 'alt' && alt) || (s === 'shift' && shift) || (s === 'cmd' && win) || (s === 'win' && win) || key ? 'contained' : 'outlined'}>{s}</Button>)}      
      </Stack>
      <Stack direction={"row"} gap={2}>
      <Input value={message} onChange={(e) => setMessage(e.target.value)} />
      <Button variant='contained' onClick={() => addShortcut(shortcut.toLowerCase(), message)} >Save</Button>
    </Stack>
    </Stack>
   
  </>
  ) : (<Stack direction={'row'} gap={2}>
    {shortcut.split('+').map((s, i) => <Button key={i} variant={(s === 'ctrl' && ctrl) || (s === 'alt' && alt) || (s === 'shift' && shift) || (s === 'cmd' && win) || (s === 'win' && win) || key ? 'contained' : 'outlined'}>{s}</Button>)}
  </Stack>)
}



export default Shortkey;

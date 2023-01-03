import { useEffect, useState } from 'react';
import { Button, Input, MenuItem, Select, Stack } from '@mui/material';
import { useHotkeys } from 'react-hotkeys-hook';
import { Keyboard, Piano } from '@mui/icons-material';
import { useStore } from '@/store/useStore';

const ShortMidi = ({
  addShortcut = (s: any, t: any) => { },
  keystring = "ctrl+alt+y",
  trigger = () => alert('Boom'),
  edit = false,
  exists,
  onSave = () => { },
  shortc,
  setShortc,
}: any) => {
  const [shortcut, setShortcut] = useState(keystring)
  const [message, setMessage] = useState('Hacked by Blade')
  const [ctrl, setCtrl] = useState(false)
  const [alt, setAlt] = useState(false)
  const [shift, setShift] = useState(false)
  const [win, setWin] = useState(false)
  const [key, setKey] = useState('')
  const [outputType, setOutputType] = useState('alert')
  const [inputType, setInputType] = useState('midi')
  const isMac = navigator.userAgent.includes('Mac');
  const midi = useStore((state) => state.inputs.midi);

  useEffect(() => {
    if (outputType === 'midi') {
      setMessage('')
    }
  }, [outputType])


  useEffect(() => {
    if (inputType === 'midi' && shortc !== undefined) {
      setShortcut(shortc.toLowerCase())
    }
  }, [shortc])


  return edit ? (<>
    <Stack direction={"row"} gap={2} style={{ position: 'relative', width: '100%', margin: '10px' }}>
      <Select
        value={inputType}
        onChange={(e) => setInputType(e.target.value)}
        sx={{ '& > div': { paddingTop: 0, paddingBottom: 0 } }}
      >
        <MenuItem value={'keyboard'}>
          <Keyboard fontSize={'large'} />
          {/* <div style={{ margin: '5px'}}>HID</div> */}
        </MenuItem>
        <MenuItem disabled={!midi} value={'midi'}><Piano fontSize={'large'} /> </MenuItem>
        <MenuItem disabled value={'rest'}>HTTP (rest)</MenuItem>
        <MenuItem disabled value={'mqtt'}>MQTT</MenuItem>
        <MenuItem disabled value={'websocket'}>Websocket</MenuItem>
        <MenuItem disabled value={'hass'}>HomeAssistant</MenuItem>
        <MenuItem disabled value={'hass'}>Spotify</MenuItem>
      </Select>

      <Input
        value={''}
        style={{ width: 400 }}
        onKeyDown={(e) => {
          console.log(e)
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
          setShortcut([e.ctrlKey ? 'ctrl' : null, e.altKey ? 'alt' : null, e.shiftKey ? 'shift' : null, e.metaKey ? (isMac ? 'cmd' : 'win') : null, e.code.includes('Key') && e.code.replace('Key', '')].filter(n => n).join('+'))
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
      <Stack direction={'row'} gap={2} style={{ position: 'absolute', left: 100 }}>
        {shortcut.split('+').map((s: any, i: number) => <Button style={{ pointerEvents: 'none' }} key={i} variant={(s === 'ctrl' && ctrl) || (s === 'alt' && alt) || (s === 'shift' && shift) || (s === 'cmd' && win) || (s === 'win' && win) || key ? 'contained' : 'outlined'}>{s}</Button>)}
      </Stack>
      <Stack direction={"row"} gap={2} style={{ flexBasis: '50%' }}>
        <Select
          value={outputType}
          onChange={(e) => setOutputType(e.target.value)}
        >
          <MenuItem value={'alert'}>Alert</MenuItem>
          <MenuItem value={'wled'}>Wled</MenuItem>
          <MenuItem value={'http'}>HTTP (rest)</MenuItem>
          <MenuItem value={'speak'}>Speak</MenuItem>
          <MenuItem disabled value={'mqtt'}>MQTT</MenuItem>
          <MenuItem disabled value={'websocket'}>Websocket</MenuItem>
          <MenuItem disabled value={'ledfx-scene'}>LedFx - Scene Selector</MenuItem>
          <MenuItem disabled value={'hass'}>HomeAssistant</MenuItem>
        </Select>
        {outputType === 'alert' && <Input style={{ width: '100%' }} value={message} onChange={(e) => setMessage(e.target.value)} />}
        {outputType === 'http' && <Select
          label="Method"
          defaultValue={'GET'}
          sx={{ '& > div': { paddingTop: 0, paddingBottom: 0 } }}
        >
          <MenuItem value={'GET'}>GET</MenuItem>
          <MenuItem disabled value={'PUT'}>PUT</MenuItem>
          <MenuItem disabled value={'POST'}>POST</MenuItem>
          <MenuItem disabled value={'DELETE'}>DELETE</MenuItem>
        </Select>}
        {outputType === 'http' && <Input style={{ width: '100%' }} value={message} onChange={(e) => setMessage(e.target.value)} />}
        {outputType === 'wled' && <Input style={{ width: '100%' }} value={message} onChange={(e) => setMessage(e.target.value)} />}
        {outputType === 'speak' && <Input style={{ width: '100%' }} value={message} onChange={(e) => setMessage(e.target.value)} />}
        <Button variant='contained' disabled={exists?.map((s: any) => s.shortkey).indexOf(shortcut.toLowerCase()) > -1} onClick={() => {
          console.log(shortcut)
          addShortcut(shortcut.toLowerCase(), message, inputType, outputType)
          onSave()
        }} >Save</Button>
      </Stack>
    </Stack>

  </>
  ) : (<Stack direction={'row'} gap={2}>
    {keystring.split('+').map((s: any, i: number) => <Button key={i} variant={(s === 'ctrl' && ctrl) || (s === 'alt' && alt) || (s === 'shift' && shift) || (s === 'cmd' && win) || (s === 'win' && win) || key ? 'contained' : 'outlined'}>{s}</Button>)}
  </Stack>)
}



export default ShortMidi;

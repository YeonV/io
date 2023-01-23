import { useEffect, useState } from 'react'
import Wrapper from '@/components/utils/Wrapper'
import type { Row } from '@/store/mainStore'
import {
  Button,
  Typography,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  DialogContentText,
  Radio,
} from '@mui/material'
import IoIcon from '@/components/IoIcon/IoIcon'
import DeckButton from '@/components/DeckButton'
import { Settings } from '@mui/icons-material'
import { HexColorPicker } from 'react-colorful'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Popover from '@mui/material/Popover'
import Box from '@mui/material/Box/Box'

const Deck = () => {
  const [data, setData] = useState({} as Record<string, Row>)
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const handleClose = () => {
    setAnchorEl(null)
    setColorOpen(undefined)
  }

  const [colorOpen, setColorOpen] = useState(
    undefined as 'button-color' | 'icon-color' | 'text-color' | undefined
  )
  const [open, setOpen] = useState(false)
  const [buttonColor, setButtonColor] = useState('#666666')
  const [textColor, setTextColor] = useState('#ffffff')
  const [iconColor, setIconColor] = useState('#ffffff')
  const [variant, setVariant] = useState(
    'outlined' as 'outlined' | 'text' | 'contained' | undefined
  )

  useEffect(() => {
    const getRows = async () => {
      const res = await fetch('http://localhost:1337/rows')
      const out = await res.json()
      return out
    }
    getRows().then((d: Record<string, Row>) => {
      setData(d)
    })
    console.info(
      // eslint-disable-next-line no-useless-concat
      '%c   IO  ' + '%c\n ReactApp by Blade ',
      'padding: 10px 40px; color: #ffffff; border-radius: 5px 5px 0 0; background-color: #123456;',
      'background: #fff; color: #123456; border-radius: 0 0 5px 5px;padding: 5px 0;'
    )
  }, [])

  return (
    <Wrapper>
      <div></div>
      <Grid
        container
        spacing={1}
        padding={1}
        alignItems={'center'}
        justifyContent={'center'}
      >
        {Object.keys(data).length > 0
          ? Object.keys(data).map((rk) => (
            <Grid item key={rk}>
              <DeckButton rowkey={rk} data={data} />
            </Grid>
          ))
          : 'What madness did setup the IO-Rows? Oh wait, maybe it was me and you'}
      </Grid>
      <IconButton onClick={() => setOpen(true)} sx={{ opacity: 0.3 }}>
        <Settings color='primary' />
      </IconButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby='deck-settings-title'
        aria-describedby='deck-settings-description'
      >
        <DialogTitle id='deck-settings-title'>{'Deck Settings'}</DialogTitle>
        <DialogContent>
          <DialogContentText id='deck-settings-description'>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>Button Color:</Typography>
              <Button
                style={{
                  background: buttonColor,
                  height: 40,
                  width: 100,
                  borderRadius: 5,
                  border: '2px solid #fff',
                }}
                onClick={(e) => {
                  setAnchorEl(e.currentTarget)
                  setColorOpen('button-color')
                }}
              ></Button>
            </div>
            <Popover
              id={'button-color'}
              open={colorOpen === 'button-color'}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
            >
              <HexColorPicker color={buttonColor} onChange={setButtonColor} />
            </Popover>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>Text Color:</Typography>
              <Button
                style={{
                  background: textColor,
                  height: 40,
                  width: 100,
                  borderRadius: 5,
                  border: '2px solid #fff',
                }}
                onClick={(e) => {
                  setAnchorEl(e.currentTarget)
                  setColorOpen('text-color')
                }}
              ></Button>
            </div>
            <Popover
              id={'text-color'}
              open={colorOpen === 'text-color'}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
            >
              <HexColorPicker color={textColor} onChange={setTextColor} />
            </Popover>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>Icon Color:</Typography>
              <Button
                style={{
                  background: iconColor,
                  height: 40,
                  width: 100,
                  borderRadius: 5,
                  border: '2px solid #fff',
                }}
                onClick={(e) => {
                  setAnchorEl(e.currentTarget)
                  setColorOpen('icon-color')
                }}
              ></Button>
            </div>
            <Popover
              id={'icon-color'}
              open={colorOpen === 'icon-color'}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
            >
              <HexColorPicker color={iconColor} onChange={setIconColor} />
            </Popover>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>Variant:</Typography>
              <RadioGroup
                row
                aria-labelledby='demo-row-radio-buttons-group-label'
                name='row-radio-buttons-group'
                value={variant}
                onChange={(e) =>
                  setVariant(
                    e.target.value as
                    | 'outlined'
                    | 'text'
                    | 'contained'
                    | undefined
                  )
                }
              >
                <FormControlLabel
                  value='outlined'
                  control={<Radio />}
                  label='Outlined'
                />
                <FormControlLabel
                  value='contained'
                  control={<Radio />}
                  label='Contained'
                />
                <FormControlLabel
                  value='text'
                  control={<Radio />}
                  label='Text'
                />
              </RadioGroup>
            </div>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </DialogActions>
      </Dialog>
      {/* </div> */}
    </Wrapper>
  )
}

export default Deck

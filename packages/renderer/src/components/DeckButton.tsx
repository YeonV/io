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
  TextField,
  Radio,
  InputAdornment,
} from '@mui/material'
import IoIcon from '@/components/IoIcon/IoIcon'
import DeckButtonBase from '@/components/DeckButtonBase'
import { Settings } from '@mui/icons-material'
import { HexColorPicker } from 'react-colorful'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Popover from '@mui/material/Popover'
import Box from '@mui/material/Box/Box'
import { useLongPress } from 'use-long-press'

const DeckButton = ({
  rowkey,
  data,
  showSettings,
  setShowSettings,
  setDisableDrag,
}: {
  rowkey: string
  data: any
  showSettings: boolean
  setShowSettings: (show: boolean) => void
  setDisableDrag?: (show: boolean) => void
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const [colorOpen, setColorOpen] = useState(
    undefined as 'button-color' | 'icon-color' | 'text-color' | undefined
  )
  const [open, setOpen] = useState(false)
  const [buttonColor, setButtonColor] = useState(
    data[rowkey!]?.output.settings?.buttonColor
  )
  const [textColor, setTextColor] = useState(
    data[rowkey!]?.output.settings?.textColor
  )
  const [iconColor, setIconColor] = useState(
    data[rowkey!]?.output.settings?.iconColor
  )
  const [icon, setIcon] = useState(
    data[rowkey!]?.output.icon || data[rowkey!]?.output.settings?.icon
  )
  const [label, setLabel] = useState(
    data[rowkey!]?.output.label || data[rowkey!]?.output.data.text
  )
  const [variant, setVariant] = useState(
    (data[rowkey!]?.output.settings?.variant as
      | 'outlined'
      | 'text'
      | 'contained') || 'outlined'
  )

  const bind = useLongPress(
    () => {
      setShowSettings(!showSettings)
    },
    {
      onCancel: async (event) => await fetch(`/rows?id=${rowkey}`),
    }
  )

  const handleClose = () => {
    setAnchorEl(null)
    setColorOpen(undefined)
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
    setOpen(false)
  }
  useEffect(() => {
    if (setDisableDrag) setDisableDrag(open)
  }, [open])

  return (
    <>
      <DeckButtonBase
        {...bind()}
        label={label || data[rowkey!]?.output.data.text}
        icon={icon || data[rowkey!]?.output.icon}
        onClick={async () => false}
        buttonColor={buttonColor}
        textColor={textColor}
        iconColor={iconColor}
        variant={variant}
        className={showSettings ? 'icon' : ''}
      >
        {showSettings ? (
          <>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                setOpen(true)
              }}
              sx={{ opacity: 1, position: 'absolute', top: -5, right: -5 }}
            >
              <Settings color='primary' />
            </IconButton>
            <Dialog
              sx={{
                '& .MuiDialog-container .MuiPaper-root': { maxWidth: '100%' },
              }}
              open={open}
              onClose={() => handleSettingsClose()}
              aria-labelledby='deck-settings-title'
              aria-describedby='deck-settings-description'
            >
              <DialogTitle id='deck-settings-title'>
                {'Deck Settings'}
              </DialogTitle>
              <DialogContent>
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
                  <HexColorPicker
                    color={buttonColor}
                    onChange={setButtonColor}
                  />
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
                  <Typography>Label:</Typography>
                  <TextField
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography>Icon:</Typography>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IoIcon name={icon} style={{ marginRight: '10px' }} />
                    <TextField
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography mr={5}>Variant:</Typography>
                  <RadioGroup
                    row
                    aria-labelledby='demo-row-radio-buttons-group-label'
                    name='row-radio-buttons-group'
                    value={variant}
                    onChange={(e) =>
                      setVariant(
                        e.target.value as 'outlined' | 'text' | 'contained'
                      )
                    }
                  >
                    <FormControlLabel
                      sx={{
                        color: buttonColor,
                      }}
                      value='outlined'
                      control={<Radio />}
                      label={
                        <Button
                          variant='outlined'
                          color='inherit'
                          sx={{ pointerEvents: 'none' }}
                        >
                          <IoIcon
                            name={icon}
                            style={{ marginRight: '10px', color: iconColor }}
                          />
                          <Typography
                            variant='button'
                            sx={{ color: textColor }}
                          >
                            outlined
                          </Typography>
                        </Button>
                      }
                    />
                    <FormControlLabel
                      value='contained'
                      control={<Radio />}
                      label={
                        <Button
                          variant='contained'
                          sx={{
                            pointerEvents: 'none',
                            background: buttonColor,
                          }}
                        >
                          <IoIcon
                            name={icon}
                            style={{ marginRight: '10px', color: iconColor }}
                          />
                          <Typography
                            variant='button'
                            sx={{ color: textColor }}
                          >
                            Contained
                          </Typography>
                        </Button>
                      }
                    />
                    <FormControlLabel
                      value='text'
                      control={<Radio />}
                      sx={{
                        color: buttonColor,
                      }}
                      label={
                        <Button
                          variant='text'
                          color='inherit'
                          sx={{ pointerEvents: 'none' }}
                        >
                          <IoIcon
                            name={icon}
                            style={{ marginRight: '10px', color: iconColor }}
                          />
                          <Typography
                            variant='button'
                            sx={{ color: textColor }}
                          >
                            Text
                          </Typography>
                        </Button>
                      }
                    />
                  </RadioGroup>
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => handleSettingsClose()}>Cancel</Button>
                <Button
                  onClick={async () => {
                    const res = await fetch(
                      `${location.protocol}://${
                        location.hostname
                      }:1337/rows?id=${rowkey}&update=true&buttonColor=${encodeURIComponent(
                        buttonColor
                      )}&iconColor=${encodeURIComponent(
                        iconColor
                      )}&textColor=${encodeURIComponent(
                        textColor
                      )}&variant=${variant}&icon=${encodeURIComponent(
                        icon
                      )}&label=${encodeURIComponent(label)}`
                    )
                    handleSettingsClose()
                  }}
                >
                  Save
                </Button>
              </DialogActions>
            </Dialog>
          </>
        ) : (
          <></>
        )}
      </DeckButtonBase>
    </>
  )
}

export default DeckButton

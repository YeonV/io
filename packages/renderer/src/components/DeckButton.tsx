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
import DeckButtonBase from '@/components/DeckButtonBase'
import { Settings } from '@mui/icons-material'
import { HexColorPicker } from 'react-colorful'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Popover from '@mui/material/Popover'
import Box from '@mui/material/Box/Box'

const DeckButton = ({ rowkey, data }: { rowkey: string, data: any }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
        setColorOpen(undefined)
    }

    const [colorOpen, setColorOpen] = useState(
        undefined as 'button-color' | 'icon-color' | 'text-color' | undefined
    )
    const [open, setOpen] = useState(false)
    const [buttonColor, setButtonColor] = useState(data[rowkey!]?.output.settings?.buttonColor)
    const [textColor, setTextColor] = useState(data[rowkey!]?.output.settings?.textColor)
    const [iconColor, setIconColor] = useState(data[rowkey!]?.output.settings?.iconColor)
    const [variant, setVariant] = useState(
        data[rowkey!]?.output.settings?.variant as 'outlined' | 'text' | 'contained' | undefined
    )

    return (<>
        <DeckButtonBase
            label={data[rowkey!]?.output.data.text}
            icon={data[rowkey!]?.output.icon}
            onClick={async () => await fetch(`/rows?id=${rowkey}`)}
            buttonColor={buttonColor}
            textColor={textColor}
            iconColor={iconColor}
            variant={variant}
        />

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
                <Button onClick={async () => {
                    const res = await fetch(`http://localhost:1337/rows?id=${rowkey}&update=true&buttonColor=${encodeURIComponent(buttonColor)}&iconColor=${encodeURIComponent(iconColor)}&textColor=${encodeURIComponent(textColor)}&variant=${variant}`)
                    console.log(await res.json())
                    setOpen(false)
                }}>Save</Button>
            </DialogActions>
        </Dialog>
    </>
    )
}

export default DeckButton

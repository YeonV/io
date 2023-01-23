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
  const [showSettings, setShowSettings] = useState(false)

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
        sx={{
          '& .icon:nth-of-type(2n)': {
            animationDelay: '-.75s',
            animationDuration: '.25s',
            animationName: 'keyframes1',
            animationIterationCount: 'infinite',
            transformOrigin: '50% 10%',
          },
          '& .icon:nth-of-type(2n-1)': {
            animationDelay: '-.5s',
            animationDuration: '.3s',
            animationName: 'keyframes2',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            transformOrigin: '30% 5%',
          },
          '@keyframes keyframes1': {
            '0%': {
              transform: 'rotate(-1deg)',
              animationTimingFunction: 'ease-in',
            },
            '50%': {
              transform: 'rotate(1.5deg)',
              animationTimingFunction: 'ease-out',
            },
          },
          '@keyframes keyframes2': {
            '0%': {
              transform: 'rotate(1deg)',
              animationTimingFunction: 'ease-in',
            },
            '50%': {
              transform: 'rotate(-1.5deg)',
              animationTimingFunction: 'ease-out',
            },
          },
        }}
      >
        {Object.keys(data).length > 0
          ? Object.keys(data).map((rk) => (
              <Grid item key={rk} className={showSettings ? 'icon' : ''}>
                <DeckButton
                  rowkey={rk}
                  data={data}
                  showSettings={showSettings}
                  setShowSettings={setShowSettings}
                />
              </Grid>
            ))
          : 'What madness did setup the IO-Rows? Oh wait, maybe it was me and you'}
      </Grid>
    </Wrapper>
  )
}

export default Deck

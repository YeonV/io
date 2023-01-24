import type { Row } from '@/store/mainStore'
import { useEffect, useRef, useState } from 'react'
import { Box, Grid, IconButton, Typography } from '@mui/material'
import { Rnd } from 'react-rnd'
import { useStore } from '@/store/OLD/useStore'
import { DarkMode, LightMode, Sync } from '@mui/icons-material'
import DeckButton from '@/components/DeckButton'
import 'react-resizable/css/styles.css'
import 'react-grid-layout/css/styles.css'
import { useWindowDimensions } from '@/utils'

const Deck = () => {
  const [data, setData] = useState({} as Record<string, Row>)
  const [showSettings, setShowSettings] = useState(false)
  const [disableDrag, setDisableDrag] = useState(false)
  const darkMode = useStore((state) => state.ui.darkMode)
  const setDarkMode = useStore((state) => state.ui.setDarkMode)
  const { height, width } = useWindowDimensions()
  const [magicNumber, setMagicNumber] = useState(120)

  const toggleDarkmode = () => {
    setDarkMode(!darkMode)
  }
  useEffect(() => {
    const getRows = async () => {
      const res = await fetch(`http://${location.hostname}:1337/rows`)
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

  useEffect(() => {
    setMagicNumber(
      Math.floor(width / Math.floor(width / 120)) - Math.ceil(width / 120)
    )
  }, [width])

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden',
        minHeight: 'calc(100vh - 4px)',
        paddingTop: '2px',
        paddingBottom: '2px',
        flexDirection: 'column',
      }}
    >
      <Grid
        container
        spacing={1}
        padding={1}
        alignItems={'center'}
        justifyContent={'center'}
        sx={{
          'fontFamily': 'Montserrat-Alt1',
          'marginTop': '0',
          'paddingTop': '2px',
          'marginLeft': '2px',
          'marginRight': '2px',
          'minHeight': 'calc(100vh - 44px)',
          'border': showSettings ? '2px dashed #9993' : '',
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
        <>
          {Object.keys(data).length > 0 ? (
            Object.keys(data).map((rk, i) => (
              <Rnd
                default={{
                  width: magicNumber,
                  height: magicNumber,
                  x: (i % Math.floor(width / magicNumber)) * magicNumber,
                  y:
                    Math.floor(i / Math.floor(width / magicNumber)) *
                    magicNumber,
                }}
                bounds={'parent'}
                resizeGrid={[magicNumber, magicNumber]}
                dragGrid={[magicNumber, magicNumber]}
                disableDragging={!showSettings || disableDrag}
                enableResizing={{
                  top: false,
                  right: false,
                  bottom: false,
                  left: false,
                  topRight: false,
                  bottomRight: showSettings && !disableDrag,
                  bottomLeft: false,
                  topLeft: false,
                }}
                key={rk}
                style={{
                  padding: '4px',
                  border: showSettings ? '1px dashed #9999' : '',
                }}
              >
                <DeckButton
                  rowkey={rk}
                  data={data}
                  showSettings={showSettings}
                  setShowSettings={setShowSettings}
                  setDisableDrag={setDisableDrag}
                />
              </Rnd>
            ))
          ) : (
            <div>
              What madness did setup the IO-Rows? Oh wait, maybe it was me and
              you
            </div>
          )}
        </>
      </Grid>
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: darkMode ? '#090909' : '#ddd',
        }}
      >
        <div style={{ flexBasis: '100px' }}></div>
        <Typography
          fontFamily={'Montserrat-Alt1'}
          color={darkMode ? '#333' : '#999'}
        >
          Hacked by Blade
        </Typography>
        <div
          style={{
            flexBasis: '100px',
            justifyContent: 'flex-end',
            display: 'flex',
          }}
        >
          <IconButton
            onClick={() => {
              window.location.reload()
            }}
            sx={{ opacity: 0.3 }}
          >
            <Sync />
          </IconButton>
          <IconButton
            onClick={() => {
              toggleDarkmode()
            }}
            sx={{ opacity: 0.3 }}
          >
            {darkMode ? (
              <LightMode color='primary' />
            ) : (
              <DarkMode color='primary' />
            )}
          </IconButton>
        </div>
      </footer>
    </Box>
  )
}

export default Deck

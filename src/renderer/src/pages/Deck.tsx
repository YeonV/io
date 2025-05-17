import { useEffect, useState } from 'react'
import {
  Box,
  FormControl,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography
} from '@mui/material'
import { Rnd } from 'react-rnd'
import { useMainStore } from '@/store/mainStore'
import { useDeckStore } from '@/store/deckStore'
import { DarkMode, LightMode, Settings, Sync } from '@mui/icons-material'
import DeckButton from '@/components/DeckButton'
import 'react-resizable/css/styles.css'
import 'react-grid-layout/css/styles.css'
import { useWindowDimensions } from '@/utils'
import { useShallow } from 'zustand/react/shallow'
// import { Row } from '@shared/types'

const Deck = () => {
  const {
    allProfiles,
    currentIoProfileId,
    rowsForCurrentProfile,
    deckLayouts,
    showSettings,
    initializeSse,
    closeSse,
    fetchAllProfiles,
    fetchCurrentActiveIoProfile,
    // fetchRowsForProfile,
    setDeckShowSettings,
    updateDeckLayout,
    // saveFullDeckLayoutForProfile,
    activateIoProfile
  } = useDeckStore(useShallow((state) => ({ ...state })))

  const appDarkMode = useMainStore((state) => state.ui.darkMode)
  const appSetDarkMode = useMainStore((state) => state.setDarkMode)

  const [disableDrag, setDisableDrag] = useState(false)
  const { width } = useWindowDimensions()
  const [magicNumber, setMagicNumber] = useState(120)

  // const [data, setData] = useState({} as Record<string, Row>)
  // const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    initializeSse()
    fetchAllProfiles()
    fetchCurrentActiveIoProfile()
    console.info(
      '%c   IO  ' + '%c\n ReactApp by Blade ',
      'padding: 10px 40px; color: #ffffff; border-radius: 5px 5px 0 0; background-color: #123456;',
      'background: #fff; color: #123456; border-radius: 0 0 5px 5px;padding: 5px 0;'
    )

    console.log('Deck: currentIoProfileId:', currentIoProfileId)
    console.log('Deck: rowsForCurrentProfile:', rowsForCurrentProfile)
    console.log('Deck: allProfiles:', allProfiles)
    console.log('Deck: deckLayouts:', deckLayouts)
    return () => {
      closeSse()
    }
  }, [initializeSse, closeSse, fetchAllProfiles, fetchCurrentActiveIoProfile])

  useEffect(() => {
    setMagicNumber(Math.floor(width / Math.floor(width / 120)) - Math.ceil(width / 120))
  }, [width])

  const currentProfileLayout = currentIoProfileId ? deckLayouts[currentIoProfileId] : []

  const handleToggleDarkmode = () => {
    if (appSetDarkMode) appSetDarkMode(!appDarkMode)
    // If Deck had its own darkMode: deckStore.toggleDarkMode();
  }

  const handleProfileChangeOnDeck = (event: SelectChangeEvent<string>) => {
    const newProfileId = event.target.value || null
    activateIoProfile(newProfileId)
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden',
        minHeight: 'calc(100vh - 4px)',
        paddingTop: '2px',
        paddingBottom: '2px',
        flexDirection: 'column'
      }}
    >
      <Grid
        container
        spacing={1}
        padding={1}
        alignItems={'center'}
        justifyContent={'center'}
        sx={{
          fontFamily: 'Montserrat-Alt1',
          marginTop: '0',
          paddingTop: '2px',
          marginLeft: '2px',
          marginRight: '2px',
          minHeight: 'calc(100vh - 44px)',
          border: showSettings ? '2px dashed #9993' : '',
          '& .icon:nth-of-type(2n)': {
            animationDelay: '-.75s',
            animationDuration: '.25s',
            animationName: 'keyframes1',
            animationIterationCount: 'infinite',
            transformOrigin: '50% 10%'
          },
          '& .icon:nth-of-type(2n-1)': {
            animationDelay: '-.5s',
            animationDuration: '.3s',
            animationName: 'keyframes2',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            transformOrigin: '30% 5%'
          },
          '@keyframes keyframes1': {
            '0%': {
              transform: 'rotate(-1deg)',
              animationTimingFunction: 'ease-in'
            },
            '50%': {
              transform: 'rotate(1.5deg)',
              animationTimingFunction: 'ease-out'
            }
          },
          '@keyframes keyframes2': {
            '0%': {
              transform: 'rotate(1deg)',
              animationTimingFunction: 'ease-in'
            },
            '50%': {
              transform: 'rotate(-1.5deg)',
              animationTimingFunction: 'ease-out'
            }
          }
        }}
      >
        <>
          {Object.values(rowsForCurrentProfile).map((row, i) => {
            const layoutProps = currentProfileLayout?.find((tile) => tile.id === row.id)
            const defaultLayout = {
              width: magicNumber,
              height: magicNumber,
              x: (i % Math.floor(width / magicNumber)) * magicNumber,
              y: Math.floor(i / Math.floor(width / magicNumber)) * magicNumber
            }
            return (
              <Rnd
                key={row.id}
                default={defaultLayout}
                size={{
                  width: layoutProps?.w || magicNumber,
                  height: layoutProps?.h || magicNumber
                }}
                position={{
                  x: layoutProps?.x || defaultLayout.x,
                  y: layoutProps?.y || defaultLayout.y
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
                  topLeft: false
                }}
                style={{
                  padding: '4px',
                  border: showSettings ? '1px dashed #9999' : ''
                }}
                onClick={(e) => e.preventDefault()}
                onDragStop={(_e, d) => {
                  console.log('Deck: onDragStop:', d)
                  if (currentIoProfileId && showSettings) {
                    // Only update if in edit mode
                    const newPosition = {
                      x: Math.round(d.x / magicNumber) * magicNumber,
                      y: Math.round(d.y / magicNumber) * magicNumber
                    }
                    // updateDeckLayout should merge this position with existing w/h for the tile
                    updateDeckLayout(currentIoProfileId, row.id, newPosition)
                  }
                }}
                onResizeStop={(_e, _direction, refElement, _delta, position) => {
                  console.log('Deck: onResizeStop:', position)
                  if (currentIoProfileId && showSettings) {
                    // Only update if in edit mode
                    const newLayout = {
                      // x: Math.round(position.x / magicNumber) * magicNumber,
                      // y: Math.round(position.y / magicNumber) * magicNumber,
                      x: position.x,
                      y: position.y,
                      w: Math.round(refElement.offsetWidth / magicNumber) * magicNumber,
                      h: Math.round(refElement.offsetHeight / magicNumber) * magicNumber
                    }
                    updateDeckLayout(currentIoProfileId, row.id, newLayout)
                  }
                }}
              >
                <DeckButton
                  row={row}
                  showSettings={showSettings}
                  profileId={currentIoProfileId}
                  setShowSettings={setDeckShowSettings}
                />
              </Rnd>
            )
          })}
          {Object.keys(rowsForCurrentProfile).length === 0 && 'NO ROWS IN THIS PROFILE'}
        </>
      </Grid>
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: appDarkMode ? '#090909' : '#ddd'
        }}
      >
        <Box sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={currentIoProfileId || ''}
              onChange={handleProfileChangeOnDeck}
              displayEmpty
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {Object.values(allProfiles).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Typography fontFamily={'Montserrat-Alt1'} color={appDarkMode ? '#333' : '#999'}>
          Hacked by Blade
        </Typography>
        <div
          style={{
            flexBasis: '100px',
            justifyContent: 'flex-end',
            display: 'flex'
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
              handleToggleDarkmode()
            }}
            sx={{ opacity: 0.3 }}
          >
            {appDarkMode ? <LightMode color="primary" /> : <DarkMode color="primary" />}
          </IconButton>
          <IconButton
            onClick={() => setDeckShowSettings(!showSettings)}
            title="Toggle Layout Edit Mode"
          >
            <Settings color={showSettings ? 'primary' : 'action'} />
          </IconButton>
        </div>
      </footer>
    </Box>
  )
}

export default Deck

// src/renderer/src/pages/Deck.tsx
import { useEffect, useState, useMemo } from 'react'
import {
  Box,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Typography
} from '@mui/material'
import { Rnd, type ResizeEnable } from 'react-rnd' // Import ResizeEnable for explicit typing
import { useDeckStore } from '@/store/deckStore' // Assuming path is correct
import { DarkMode, LightMode, Settings, Sync } from '@mui/icons-material'
import DeckButton from '@/components/DeckButton' // Assuming path
import 'react-resizable/css/styles.css'
// 'react-grid-layout/css/styles.css'; // Only if you were using react-grid-layout directly

import { useWindowDimensions } from '@/utils' // Assuming path
import { useShallow } from 'zustand/react/shallow'

const DEFAULT_MAGIC_NUMBER_RENDER = 120 // Base size for calculations

const Deck = () => {
  const {
    allProfiles,
    currentIoProfileId,
    rowsForCurrentProfile,
    deckLayouts,
    showSettings,
    deckThemeMode,
    initializeSse,
    closeSse,
    fetchAllProfiles,
    fetchCurrentActiveIoProfile,
    setDeckShowSettings,
    updateAndSyncDeckTileLayout,
    activateIoProfile,
    toggleDeckTheme
    // magicNumber: storeMagicNumber, // Get from store if managed there
    // setMagicNumber: setStoreMagicNumber // Action to update store's magicNumber
  } = useDeckStore(useShallow((state) => state)) // Get all state and actions

  // For main app's dark mode if Deck is part of the same renderer context

  const [disableDrag, setDisableDrag] = useState(false)
  const { width: windowWidth } = useWindowDimensions() // Renamed to avoid conflict if 'width' is a prop

  // Calculate magicNumber locally for rendering based on current window width
  // This ensures the grid adapts, but w/h in store are grid units
  const magicNumber = useMemo(() => {
    if (windowWidth <= 0) return DEFAULT_MAGIC_NUMBER_RENDER
    const preliminaryMaxCells = Math.floor(windowWidth / DEFAULT_MAGIC_NUMBER_RENDER) || 1
    // This calculation can be simplified, aim is to get a cell size that fits well
    // Example: const cellSize = windowWidth / preliminaryMaxCells; (would make cells fill width)
    // For now, keeping your existing logic, but ensure it results in a sane positive number.
    let calculated =
      Math.floor(windowWidth / preliminaryMaxCells) -
      Math.ceil(windowWidth / (preliminaryMaxCells * DEFAULT_MAGIC_NUMBER_RENDER)) // This formula seems off
    calculated = Math.floor(
      windowWidth / (Math.floor(windowWidth / DEFAULT_MAGIC_NUMBER_RENDER) || 1)
    ) // Simplified attempt

    // A more direct way to get a grid cell size that aims for around 120px
    const numCols = Math.max(1, Math.floor(windowWidth / DEFAULT_MAGIC_NUMBER_RENDER))
    const cellPaddingAndGaps = 16 // Estimate for Grid spacing and Rnd padding
    const effectiveWidth = windowWidth - cellPaddingAndGaps
    calculated = Math.max(30, Math.floor(effectiveWidth / numCols))

    return calculated > 0 ? calculated : DEFAULT_MAGIC_NUMBER_RENDER
  }, [windowWidth])

  useEffect(() => {
    initializeSse()
    fetchAllProfiles()
    fetchCurrentActiveIoProfile() // This will also trigger fetchRowsForProfile

    console.info(
      '%c   IO Deck  %c\n   by Blade    ',
      'padding: 10px 20px; color: #ffffff; border-radius: 5px 5px 0 0; background-color: #123456;',
      'background: #fff; color: #123456; border-radius: 0 0 5px 5px;padding: 5px 0;'
    )
    return () => {
      closeSse()
    }
  }, [initializeSse, closeSse, fetchAllProfiles, fetchCurrentActiveIoProfile])

  // Debug logs for state changes
  useEffect(() => {
    console.log('Deck State: currentIoProfileId changed to:', currentIoProfileId)
    // fetchRowsForProfile is called within fetchCurrentActiveIoProfile
  }, [currentIoProfileId])

  useEffect(() => {
    console.log('Deck State: rowsForCurrentProfile changed:', rowsForCurrentProfile)
  }, [rowsForCurrentProfile])

  useEffect(() => {
    console.log('Deck State: deckLayouts changed:', deckLayouts)
  }, [deckLayouts])

  const currentProfileLayout = currentIoProfileId ? deckLayouts[currentIoProfileId] || [] : []

  const handleToggleDarkmode = () => {
    toggleDeckTheme()
  }
  const handleProfileChangeOnDeck = (event: SelectChangeEvent<string>) => {
    const newProfileId = event.target.value || null
    activateIoProfile(newProfileId) // This tells main IO app to switch, SSE will update Deck's view
  }

  const resizeEnableOptions: ResizeEnable = {
    // Explicit type for enableResizing
    top: false,
    right: false,
    bottom: false,
    left: false,
    topRight: false,
    bottomRight: showSettings && !disableDrag,
    bottomLeft: false,
    topLeft: false
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden',
        minHeight: 'calc(100vh - 4px)', // Small gap for potential scrollbars
        paddingTop: '2px',
        paddingBottom: '2px',
        display: 'flex',
        flexDirection: 'column', // Ensure flex for footer
        position: 'relative' // For Rnd bounds if parent is not body
      }}
    >
      <Grid
        container // Use MUI Grid container for overall structure
        spacing={1} // Spacing between Rnd items (effectively margins for Rnd)
        sx={{
          flexGrow: 1, // Allow grid to take available space
          fontFamily: 'Montserrat-Alt1', // Consider moving to theme
          padding: '8px', // Padding around the grid
          minHeight: 'calc(100vh - 50px)', // Adjust based on footer height
          border: showSettings ? '2px dashed #9993' : '2px dashed transparent', // Keep space even when not shown
          position: 'relative', // Rnd bounds='parent' needs a positioned parent
          // Animation styles (as before)
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
            '0%': { transform: 'rotate(-1deg)', animationTimingFunction: 'ease-in' },
            '50%': { transform: 'rotate(1.5deg)', animationTimingFunction: 'ease-out' }
          },
          '@keyframes keyframes2': {
            '0%': { transform: 'rotate(1deg)', animationTimingFunction: 'ease-in' },
            '50%': { transform: 'rotate(-1.5deg)', animationTimingFunction: 'ease-out' }
          }
        }}
      >
        {Object.values(rowsForCurrentProfile).map((row, index) => {
          const layoutProps = currentProfileLayout?.find((tile) => tile.id === row.id)

          // Default position in pixels, calculated based on index if not in layout
          const numCols = Math.max(1, Math.floor(windowWidth / magicNumber))
          const defaultX = (index % numCols) * magicNumber
          const defaultY = Math.floor(index / numCols) * magicNumber

          // w/h in store are GRID UNITS. x/y in store are PIXELS.
          const tileWidthGridUnits = layoutProps?.w || 1 // Default 1 grid unit wide
          const tileHeightGridUnits = layoutProps?.h || 1 // Default 1 grid unit tall

          const tilePixelWidth = tileWidthGridUnits * magicNumber
          const tilePixelHeight = tileHeightGridUnits * magicNumber

          const tilePixelX = layoutProps?.x ?? defaultX
          const tilePixelY = layoutProps?.y ?? defaultY

          return (
            // Rnd items are direct children of the Grid for bounds='parent' to work with Grid's relative positioning.
            // Grid item wrapping can interfere with Rnd's absolute positioning logic if not careful.
            // For direct Rnd children, the Grid acts as the bounds.
            <Rnd
              key={row.id}
              default={{
                // Initial size and position if not in layout (in pixels)
                width: tilePixelWidth,
                height: tilePixelHeight,
                x: tilePixelX,
                y: tilePixelY
              }}
              size={{
                // Controlled size (in pixels)
                width: tilePixelWidth,
                height: tilePixelHeight
              }}
              position={{
                // Controlled position (in pixels)
                x: tilePixelX,
                y: tilePixelY
              }}
              minWidth={magicNumber} // Min width is one grid unit
              minHeight={magicNumber} // Min height is one grid unit
              bounds="parent" // Constrain to the Grid container
              dragGrid={[magicNumber, magicNumber]}
              resizeGrid={[magicNumber, magicNumber]}
              disableDragging={!showSettings || disableDrag}
              enableResizing={resizeEnableOptions}
              style={{
                // Rnd sets position: absolute. Padding is for content inside.
                // Border visualizes the Rnd bounds during edit mode.
                border: showSettings ? '1px dashed #9999' : 'none',
                display: 'flex', // To help content within DeckButton fill Rnd
                padding: '4px' // Padding around the DeckButton inside Rnd
              }}
              // onClick={(e) => e.preventDefault()} // Already handled by useLongPress in DeckButton for short press
              onDragStop={(_e, d) => {
                if (currentIoProfileId && showSettings) {
                  const layoutChanges = {
                    // x, y are pixels
                    x: d.x, // Rnd provides final pixel position snapped to dragGrid
                    y: d.y
                  }
                  // w, h are not changed by drag, so they remain as per current tile state
                  updateAndSyncDeckTileLayout(currentIoProfileId, row.id, layoutChanges)
                }
              }}
              onResizeStop={(_e, _direction, refElement, _delta, position) => {
                if (currentIoProfileId && showSettings) {
                  const newLayoutChanges = {
                    // x,y are pixels; w,h are GRID UNITS
                    x: position.x,
                    y: position.y,
                    w: Math.max(1, Math.round(refElement.offsetWidth / magicNumber)),
                    h: Math.max(1, Math.round(refElement.offsetHeight / magicNumber))
                  }
                  updateAndSyncDeckTileLayout(currentIoProfileId, row.id, newLayoutChanges)
                }
              }}
            >
              <DeckButton
                row={row}
                showSettings={showSettings}
                profileId={currentIoProfileId}
                setShowSettings={setDeckShowSettings}
                setDisableDrag={setDisableDrag}
              />
            </Rnd>
          )
        })}
        {Object.keys(rowsForCurrentProfile).length === 0 && (
          <Grid size={{ xs: 12 }} sx={{ textAlign: 'center', mt: 4 }}>
            {/* Wrap message in Grid item for centering */}
            <Typography variant="h6" color="textSecondary">
              NO ROWS IN THIS PROFILE
            </Typography>
          </Grid>
        )}
      </Grid>

      <Box // Footer
        component="footer"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: '2px 8px', // Consistent padding
          background: deckThemeMode ? '#1e1e1e' : '#e0e0e0', // Slightly adjusted footer colors
          borderTop: '1px solid',
          borderColor: 'divider',
          height: '44px', // Fixed height for footer
          flexShrink: 0 // Prevent footer from shrinking
        }}
      >
        {/* ... (Footer content: Profile Select, Typography, IconButtons as before) ... */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 180, maxWidth: 300 }}>
            <Select
              value={currentIoProfileId || ''}
              onChange={handleProfileChangeOnDeck}
              displayEmpty
              variant="outlined"
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value="">
                <em>View All Enabled</em>
              </MenuItem>
              {Object.values(allProfiles).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'Montserrat-Alt1',
            color: deckThemeMode ? 'text.disabled' : 'text.secondary'
          }}
        >
          IO Deck
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => window.location.reload()} title="Reload Deck">
            <Sync fontSize="small" />
          </IconButton>
          <IconButton onClick={handleToggleDarkmode} title="Toggle Dark Mode">
            {deckThemeMode ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
          </IconButton>
          <IconButton
            onClick={() => setDeckShowSettings(!showSettings)}
            title="Toggle Layout Edit Mode"
          >
            <Settings fontSize="small" color={showSettings ? 'primary' : 'action'} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  )
}

export default Deck

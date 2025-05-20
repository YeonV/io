// src/renderer/src/components/DeckButton.tsx
import { useEffect, useState, useMemo, FC } from 'react'
import {
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  TextField,
  Popover,
  Box,
  Stack,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material'
import DeckButtonBase from '@/components/DeckButtonBase'
import { Settings } from '@mui/icons-material'
import { HexColorPicker } from 'react-colorful'
import { useLongPress } from 'use-long-press'
import type { Row } from '@shared/types' // Import Row type
import { useDeckStore, DeckTileLayout } from '@/store/deckStore' // Import deckStore and types
import { useShallow } from 'zustand/react/shallow'

// Props for DeckButton
interface DeckButtonProps {
  row: Row // Receives the full Row object
  profileId: string | null // The ID of the currently active IO Profile on the Deck
  // Props from parent Deck.tsx for layout edit mode
  showSettings: boolean // Is the Deck in layout edit mode?
  setShowSettings: (show: boolean) => void // To toggle Deck's layout edit mode
  setDisableDrag?: (disable: boolean) => void // To disable Rnd dragging when settings dialog is open
  fontFamily?: string
}

const DeckButton: FC<DeckButtonProps> = ({
  row,
  profileId,
  showSettings,
  fontFamily = 'Montserrat-Alt1',
  setShowSettings,
  setDisableDrag
}) => {
  const {
    saveAndSyncDeckButtonAppearance,
    updateMainAppRowDisplay,
    deckLayouts /* syncDeckOverridesToMain */
  } = useDeckStore(
    useShallow((state) => ({
      saveAndSyncDeckButtonAppearance: state.saveAndSyncDeckButtonAppearance,
      updateMainAppRowDisplay: state.updateMainAppRowDisplay,
      deckLayouts: state.deckLayouts
      // syncDeckOverridesToMain: state.syncDeckOverridesToMain, // If using this for backup
    }))
  )

  // Get Deck-specific appearance for this button under the current profile
  const deckButtonSpecifics = useMemo(() => {
    if (!profileId) return undefined
    const profileLayout = deckLayouts[profileId]
    return profileLayout?.find((tile) => tile.id === row.id)
  }, [deckLayouts, profileId, row.id])

  // Initialize state with Deck-specific settings, then fall back to row.output settings, then defaults
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [colorOpen, setColorOpen] = useState<
    'button-color' | 'icon-color' | 'text-color' | undefined
  >(undefined)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  // Appearance state - prioritize deckButtonSpecifics, then row.output.settings, then row data, then defaults
  const [buttonColor, setButtonColor] = useState(
    deckButtonSpecifics?.buttonColor || row.output.settings?.buttonColor
  )
  const [textColor, setTextColor] = useState(
    deckButtonSpecifics?.textColor || row.output.settings?.textColor
  )
  const [iconColor, setIconColor] = useState(
    deckButtonSpecifics?.iconColor || row.output.settings?.iconColor
  )
  // For icon and label, Deck can override, or use row's output icon/label, or output data text
  const [icon, setIcon] = useState(row.output.icon || row.output.settings?.icon || 'help_outline')
  const [label, setLabel] = useState(
    row.output.label ||
      row.output.settings?.label ||
      row.output.data.text ||
      row.output.name ||
      row.id.substring(0, 8)
  )
  const [variant, setVariant] = useState<'outlined' | 'text' | 'contained'>(
    deckButtonSpecifics?.variant || row.output.settings?.variant || 'outlined'
  )
  const [innerFontFamily, setInnerFontFamily] = useState(
    deckButtonSpecifics?.fontFamily || fontFamily
  )

  // Effect to update local state if deckButtonSpecifics or row data changes from store/props
  useEffect(() => {
    setButtonColor(deckButtonSpecifics?.buttonColor || row.output.settings?.buttonColor)
    setTextColor(deckButtonSpecifics?.textColor || row.output.settings?.textColor)
    setIconColor(deckButtonSpecifics?.iconColor || row.output.settings?.iconColor)
    setIcon(row.output.settings?.icon || row.output.icon || 'help_outline')
    setLabel(
      row.output.label ||
        row.output.settings?.label ||
        row.output.name ||
        row.output.data.text ||
        row.id.substring(0, 8)
    )
    setVariant(deckButtonSpecifics?.variant || row.output.settings?.variant || 'outlined')
    setInnerFontFamily(deckButtonSpecifics?.fontFamily || fontFamily)
  }, [deckButtonSpecifics, row, fontFamily])

  // Long press toggles Deck's general layout edit mode
  // Short press triggers the IO Row action
  const bind = useLongPress(
    () => {
      if (setDisableDrag) setDisableDrag(true) // Prevent drag while menu might appear
      setShowSettings(!showSettings) // Toggle global Deck edit mode
      setTimeout(() => {
        if (setDisableDrag) setDisableDrag(settingsDialogOpen)
      }, 50) // Re-evaluate drag after timeout
    },
    {
      onCancel: async (_event) => {
        // This is the "click" or short press
        if (showSettings) {
          // If in Deck edit mode, click opens settings dialog
          // setSettingsDialogOpen(true)
        } else {
          // If not in Deck edit mode, click triggers the row action
          await fetch(`http://${location.hostname}:1337/rows?id=${row.id}`, {
            // headers: { /* No CORS headers needed for simple GET from same-origin-like context if API allows */ }
          })
        }
      },
      threshold: 500, // ms for long press
      captureEvent: true,
      cancelOnMovement: true
    }
  )

  const handleColorPopoverClose = () => {
    setAnchorEl(null)
    setColorOpen(undefined)
  }
  const handleOpenColorPicker = (
    event: React.MouseEvent<HTMLButtonElement>,
    type: 'button-color' | 'icon-color' | 'text-color'
  ) => {
    setAnchorEl(event.currentTarget)
    setColorOpen(type)
  }

  const handleDialogSettingsClose = () => {
    setSettingsDialogOpen(false)
    if (setDisableDrag) setDisableDrag(false) // Re-enable drag when dialog closes
  }

  const handleSaveDeckButtonSettings = () => {
    if (profileId && row) {
      // 1. DECK-SPECIFIC VISUAL OVERRIDES (colors, variant, fontFamily for DECK LAYOUTS)
      const deckVisualOverrides: Partial<
        Omit<DeckTileLayout, 'id' | 'x' | 'y' | 'w' | 'h' | 'icon' | 'label'>
      > = {
        buttonColor,
        textColor,
        iconColor,
        variant,
        fontFamily: innerFontFamily
      }
      saveAndSyncDeckButtonAppearance(profileId, row.id, deckVisualOverrides)

      // 2. UPDATES FOR THE MAIN IO APP'S ROW (top-level output.icon and output.label)
      const mainAppDisplayUpdates: { icon?: string; label?: string } = {}

      // Master values are directly from row.output
      const masterIcon = row.output.icon || row.output.settings?.icon || 'help_outline' // Fallback if row.output.icon is cleared
      const masterLabel =
        row.output.label ||
        row.output.settings?.label ||
        row.output.data?.text ||
        row.output.name ||
        row.id.substring(0, 8)

      if (icon !== masterIcon) {
        // 'icon' is from DeckButton's local state (dialog edit)
        mainAppDisplayUpdates.icon = icon
      }
      if (label !== masterLabel) {
        // 'label' is from DeckButton's local state (dialog edit)
        mainAppDisplayUpdates.label = label
      }

      if (Object.keys(mainAppDisplayUpdates).length > 0) {
        updateMainAppRowDisplay(row.id, mainAppDisplayUpdates)
      }
    }
    handleDialogSettingsClose()
  }
  useEffect(() => {
    if (setDisableDrag) setDisableDrag(settingsDialogOpen)
  }, [settingsDialogOpen, setDisableDrag])

  return (
    <>
      <DeckButtonBase
        {...bind()}
        label={label}
        icon={icon}
        buttonColor={buttonColor}
        textColor={textColor}
        iconColor={iconColor}
        variant={variant}
        fontFamily={innerFontFamily}
        className={showSettings ? 'icon' : ''}
      >
        {/* Settings icon appears only when Deck is in general layout edit mode */}
        {showSettings && (
          <IconButton
            onClick={(e) => {
              // Click on settings cog always opens dialog
              e.stopPropagation() // Prevent triggering row action from useLongPress
              setSettingsDialogOpen(true)
            }}
            sx={{ opacity: 1, position: 'absolute', top: -5, right: -5, zIndex: 10 }}
            size="small"
            title="Edit Deck Button Appearance"
          >
            <Settings color="primary" fontSize="small" />
          </IconButton>
        )}
      </DeckButtonBase>

      {/* Dialog for editing this specific Deck Button's appearance */}
      <Dialog
        open={settingsDialogOpen}
        onClose={handleDialogSettingsClose}
        PaperProps={{
          component: 'form',
          onSubmit: (e) => {
            e.preventDefault()
            handleSaveDeckButtonSettings()
          }
        }}
        maxWidth="xs"
      >
        <DialogTitle>Deck Button Settings for {row.output.name || row.input.name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {/* Color Pickers (as before) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Button Color:</Typography>
              <Button
                sx={{ bgcolor: buttonColor, height: 30, width: 80, border: '1px solid #fff' }}
                onClick={(e) => handleOpenColorPicker(e, 'button-color')}
              />
            </Box>
            <Popover
              open={colorOpen === 'button-color'}
              anchorEl={anchorEl}
              onClose={handleColorPopoverClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <HexColorPicker color={buttonColor} onChange={setButtonColor} />
            </Popover>
            {/* ... Other color pickers ... */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Text Color:</Typography>
              <Button
                sx={{ bgcolor: textColor, height: 30, width: 80, border: '1px solid #fff' }}
                onClick={(e) => handleOpenColorPicker(e, 'text-color')}
              />
            </Box>
            <Popover
              open={colorOpen === 'text-color'}
              anchorEl={anchorEl}
              onClose={handleColorPopoverClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <HexColorPicker color={textColor} onChange={setTextColor} />
            </Popover>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Icon Color:</Typography>
              <Button
                sx={{ bgcolor: iconColor, height: 30, width: 80, border: '1px solid #fff' }}
                onClick={(e) => handleOpenColorPicker(e, 'icon-color')}
              />
            </Box>
            <Popover
              open={colorOpen === 'icon-color'}
              anchorEl={anchorEl}
              onClose={handleColorPopoverClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <HexColorPicker color={iconColor} onChange={setIconColor} />
            </Popover>

            {/* Label and Icon TextFields - These update the 'master' row data */}
            <TextField
              label="Label (updates main app)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              size="small"
              helperText="This label updates the main IO app's row."
            />
            <TextField
              label="Icon (updates main app)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              fullWidth
              size="small"
              helperText="This icon (MUI name) updates the main IO app's row."
            />

            {/* Button Variant ToggleButtonGroup - This is a Deck-specific override */}
            <Box sx={{ width: '100%' }}>
              <Typography
                variant="caption"
                display="block"
                gutterBottom
                sx={{ textAlign: 'left', mb: 1 }}
              >
                Button Style (Deck only)
              </Typography>
              <ToggleButtonGroup
                value={variant}
                exclusive
                onChange={(_event, newVariant) => {
                  if (newVariant !== null) {
                    setVariant(newVariant as 'outlined' | 'text' | 'contained')
                  }
                }}
                aria-label="Button variant"
                fullWidth
                size="small"
              >
                <ToggleButton
                  value="outlined"
                  aria-label="outlined"
                  sx={{ flexGrow: 1, textTransform: 'capitalize' }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    disabled
                    sx={{
                      pointerEvents: 'none',
                      color: 'inherit !important',
                      borderColor: 'inherit !important'
                    }}
                  >
                    Outlined
                  </Button>
                </ToggleButton>
                <ToggleButton
                  value="contained"
                  aria-label="contained"
                  sx={{ flexGrow: 1, textTransform: 'capitalize' }}
                >
                  <Button variant="contained" size="small" disabled sx={{ pointerEvents: 'none' }}>
                    Contained
                  </Button>
                </ToggleButton>
                <ToggleButton
                  value="text"
                  aria-label="text"
                  sx={{ flexGrow: 1, textTransform: 'capitalize' }}
                >
                  <Button
                    variant="text"
                    size="small"
                    disabled
                    sx={{ pointerEvents: 'none', color: 'inherit !important' }}
                  >
                    Text
                  </Button>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogSettingsClose}>Cancel</Button>
          <Button variant="contained" type="submit">
            Save Changes
          </Button>{' '}
          {/* Changed to "Save Changes" */}
        </DialogActions>
      </Dialog>
    </>
  )
}

export default DeckButton

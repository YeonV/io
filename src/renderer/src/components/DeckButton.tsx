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
  Radio,
  RadioGroup,
  FormControlLabel,
  Popover,
  Box, // Added Box
  FormControl,
  Stack
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
  const { deckLayouts, saveDeckButtonAppearance } = useDeckStore(
    useShallow((state) => ({
      deckLayouts: state.deckLayouts,
      saveDeckButtonAppearance: state.saveFullDeckLayoutForProfile // Or a new action: updateDeckButtonAppearance
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
  const [icon, setIcon] = useState(
    deckButtonSpecifics?.icon || row.output.settings?.icon || row.output.icon || 'help_outline'
  )
  const [label, setLabel] = useState(
    deckButtonSpecifics?.label ||
      row.output.settings?.label ||
      row.output.data.text ||
      row.output.name ||
      row.id.substring(0, 8)
  )
  const [variant, setVariant] = useState<'outlined' | 'text' | 'contained'>(
    deckButtonSpecifics?.variant || row.output.settings?.variant || 'outlined'
  )
  const [innerFontFamily, _setFontFamily] = useState(deckButtonSpecifics?.fontFamily || fontFamily)

  // Effect to update local state if deckButtonSpecifics or row data changes from store/props
  useEffect(() => {
    setButtonColor(deckButtonSpecifics?.buttonColor || row.output.settings?.buttonColor)
    setTextColor(deckButtonSpecifics?.textColor || row.output.settings?.textColor)
    setIconColor(deckButtonSpecifics?.iconColor || row.output.settings?.iconColor)
    setIcon(
      deckButtonSpecifics?.icon || row.output.settings?.icon || row.output.icon || 'help_outline'
    )
    setLabel(
      deckButtonSpecifics?.label ||
        row.output.settings?.label ||
        row.output.name ||
        row.output.data.text ||
        row.id.substring(0, 8)
    )
    setVariant(deckButtonSpecifics?.variant || row.output.settings?.variant || 'outlined')
    _setFontFamily(deckButtonSpecifics?.fontFamily || fontFamily)
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

  const handleColorPopoverClose = () => setAnchorEl(null)
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
    if (profileId) {
      // This should be an action that updates a specific tile's appearance properties
      // in the deckLayouts[profileId] array.
      // For now, let's construct the appearance part of DeckTileLayout
      const appearanceUpdate: Partial<Omit<DeckTileLayout, 'id' | 'x' | 'y' | 'w' | 'h'>> = {
        buttonColor,
        textColor,
        iconColor,
        icon,
        label,
        variant,
        fontFamily: innerFontFamily
      }

      // Need an action in deckStore: updateDeckButtonAppearance(profileId, row.id, appearanceUpdate)
      // For simplicity with existing saveFullDeckLayoutForProfile:
      const currentLayouts = useDeckStore.getState().deckLayouts
      const currentProfileLayout = currentLayouts[profileId] || []
      const existingTileIndex = currentProfileLayout.findIndex((tile) => tile.id === row.id)

      let newTileData: Partial<DeckTileLayout> = appearanceUpdate
      if (existingTileIndex > -1) {
        // Merge with existing layout data (x,y,w,h)
        newTileData = { ...currentProfileLayout[existingTileIndex], ...appearanceUpdate }
      } else {
        // No existing layout data, just save appearance (layout will be default)
        newTileData = appearanceUpdate
      }
      // This uses the existing updateDeckLayout that expects x,y,w,h etc.
      // We might need a more specific saveDeckButtonAppearance action.
      // For now, this will create/update the entry but might miss x,y,w,h if it was a new tile.
      // Let's assume updateDeckLayout merges intelligently or we call a more specific action.

      const { deckLayouts, updateDeckLayout } = useDeckStore.getState()
      const profileCurrentLayout = deckLayouts[profileId] || []
      const tileIndex = profileCurrentLayout.findIndex((tile) => tile.id === row.id)
      let newLayoutData: DeckTileLayout

      if (tileIndex > -1) {
        newLayoutData = { ...profileCurrentLayout[tileIndex], ...appearanceUpdate, id: row.id }
      } else {
        // If no layout data exists, we are only saving appearance.
        // The Rnd component will use default x,y,w,h.
        // So, when saving, we only need to store the appearance overrides.
        // The full DeckTileLayout expects x,y,w,h so this needs care.
        // Let's just pass the overrides and let an action in store handle it.
        newLayoutData = {
          id: row.id,
          x: 0,
          y: 0,
          w: 0,
          h: 0, // These would be default/ignored if not set
          ...appearanceUpdate
        } as DeckTileLayout
      }
      // A better action would be: saveDeckTileAppearance(profileId, row.id, appearanceUpdate)
      // For now, using the full save function as an example:
      const newProfileLayout =
        tileIndex > -1
          ? profileCurrentLayout.map((t) => (t.id === row.id ? newLayoutData : t))
          : [...profileCurrentLayout, newLayoutData]
      saveDeckButtonAppearance(profileId, newProfileLayout)
    }
    handleDialogSettingsClose()
  }

  useEffect(() => {
    // To control Rnd dragging when settings dialog is open
    if (setDisableDrag) setDisableDrag(settingsDialogOpen)
  }, [settingsDialogOpen, setDisableDrag])

  return (
    <>
      <DeckButtonBase
        {...bind()} // Spread long press bindings
        label={label}
        icon={icon}
        // onClick is handled by useLongPress onCancel for short press
        buttonColor={buttonColor}
        textColor={textColor}
        iconColor={iconColor}
        variant={variant}
        fontFamily={innerFontFamily}
        className={showSettings ? 'icon' : ''} // For wiggle animation in Deck edit mode
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
        aria-labelledby={`deck-button-settings-title-${row.id}`}
        PaperProps={{
          component: 'form',
          onSubmit: (e) => {
            e.preventDefault()
            handleSaveDeckButtonSettings()
          }
        }}
        maxWidth="xs"
      >
        <DialogTitle id={`deck-button-settings-title-${row.id}`}>
          Deck Button Settings for {row.output.name}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {/* Color Pickers */}
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

            {/* Label and Icon TextFields */}
            <TextField
              label="Custom Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              size="small"
              helperText="Overrides default row label on Deck."
            />
            <TextField
              label="Custom Icon (MUI Name)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              fullWidth
              size="small"
              helperText="Overrides default row icon on Deck."
            />

            {/* Variant RadioGroup */}
            <FormControl>
              <Typography variant="caption" gutterBottom>
                Button Variant
              </Typography>
              <RadioGroup
                row
                value={variant}
                onChange={(e) => setVariant(e.target.value as 'outlined' | 'text' | 'contained')}
              >
                <FormControlLabel
                  value="outlined"
                  control={<Radio size="small" />}
                  label="Outlined"
                />
                <FormControlLabel
                  value="contained"
                  control={<Radio size="small" />}
                  label="Contained"
                />
                <FormControlLabel value="text" control={<Radio size="small" />} label="Text" />
              </RadioGroup>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogSettingsClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Save Appearance
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default DeckButton

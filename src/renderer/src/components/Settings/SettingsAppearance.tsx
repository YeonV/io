// src/renderer/src/components/Settings/SettingsAppearance.tsx
import type { FC } from 'react'
import {
  Paper,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  Box,
  Grid,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Button,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  MenuItem
} from '@mui/material'
import { useMainStore } from '@/store/mainStore'
import ConfirmDialog from '../utils/ConfirmDialog'; // Added import
import {
  WbSunnyOutlined as LightModeIcon,
  Brightness2Outlined as DarkModeIcon,
  SettingsBrightness as SystemModeIcon,
  ColorLensOutlined as ThemeColorsIcon, // Changed from ColorPickerIcon
  WidgetsOutlined as HomeWidgetsIcon,
  RestartAlt as ResetIcon,
  PaletteOutlined as PaletteIcon // General Appearance Icon
} from '@mui/icons-material'
import type { ModuleId } from '@shared/module-ids'
import { moduleImplementations, ModuleImplementationMap } from '@/modules/moduleRegistry'
import { useMemo, useState, useCallback, useEffect } from 'react' // Added useCallback for debounce
import { useShallow } from 'zustand/react/shallow'
import { debounce } from 'lodash-es' // For debouncing color input
import IoIcon from '../IoIcon/IoIcon'

// Default colors from your storeUI.ts for reset functionality
const defaultThemeColorsFromStore = {
  primaryLight: '#333333',
  primaryDark: '#CCCCCC',
  secondaryLight: '#666666',
  secondaryDark: '#999999'
}

const SettingsAppearance: FC = () => {
  const themeChoice = useMainStore((state) => state.ui.themeChoice)
  const setThemeChoice = useMainStore((state) => state.setThemeChoice)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogTitle, setConfirmDialogTitle] = useState('');
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const themeColors = useMainStore(useShallow((state) => state.ui.themeColors))
  const setThemeColorsAction = useMainStore((state) => state.setThemeColors) // From your storeUIActions

  const homeWidgets = useMainStore((state) => state.ui.homeWidgets || {})
  const setHomeWidgetsConfig = useMainStore((state) => state.setHomeWidgets)
  const storedModules = useMainStore((state) => state.modules)

  // Debounced function for color changes
  const debouncedSetThemeColor = useCallback(
    debounce((key: keyof typeof themeColors, color: string) => {
      setThemeColorsAction(key, color)
    }, 100), // 300ms debounce
    [setThemeColorsAction]
  )

  // Local state for color inputs to allow typing before debounce fires
  const [localPrimaryLight, setLocalPrimaryLight] = useState(themeColors.primaryLight)
  const [localPrimaryDark, setLocalPrimaryDark] = useState(themeColors.primaryDark)
  const [localSecondaryLight, setLocalSecondaryLight] = useState(themeColors.secondaryLight)
  const [localSecondaryDark, setLocalSecondaryDark] = useState(themeColors.secondaryDark)

  useEffect(() => {
    setLocalPrimaryLight(themeColors.primaryLight)
  }, [themeColors.primaryLight])
  useEffect(() => {
    setLocalPrimaryDark(themeColors.primaryDark)
  }, [themeColors.primaryDark])
  useEffect(() => {
    setLocalSecondaryLight(themeColors.secondaryLight)
  }, [themeColors.secondaryLight])
  useEffect(() => {
    setLocalSecondaryDark(themeColors.secondaryDark)
  }, [themeColors.secondaryDark])

  const handleColorInputChange = (
    colorKey: keyof typeof themeColors,
    event: React.ChangeEvent<HTMLInputElement>,
    localSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    localSetter(event.target.value)
    debouncedSetThemeColor(colorKey, event.target.value)
  }

  const modulesWithSettingsWidgets = useMemo(() => {
    return (Object.keys(storedModules) as ModuleId[])
      .filter(
        (moduleId) => !!moduleImplementations[moduleId as keyof ModuleImplementationMap]?.Settings
      )
      .map((moduleId) => {
        const sm = storedModules[moduleId]
        let friendlyName = moduleId.replace('-module', '')
        if (sm?.inputs?.[0]?.name) friendlyName = sm.inputs[0].name
        else if (sm?.outputs?.[0]?.name) friendlyName = sm.outputs[0].name
        friendlyName = friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1)
        const moduleIcon = sm?.inputs?.[0]?.icon || sm?.outputs?.[0]?.icon || 'mdi:puzzle-outline'

        return { id: moduleId, name: friendlyName, icon: moduleIcon } // Use friendlyName and icon
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [storedModules])

  const selectedHomeWidgets = useMemo(() => {
    return modulesWithSettingsWidgets.filter((m) => homeWidgets[m.id] !== false).map((m) => m.id)
  }, [homeWidgets, modulesWithSettingsWidgets])

  const handleThemeChoiceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThemeChoice(event.target.value as 'light' | 'dark' | 'system')
  }
  const handleHomeWidgetsSelectionChange = (event: any) => {
    const { value } = event.target
    const newHomeWidgets: Record<ModuleId, boolean> = { ...homeWidgets }

    // Toggle visibility based on selection
    modulesWithSettingsWidgets.forEach((mod) => {
      newHomeWidgets[mod.id] = value.includes(mod.id)
    })

    setHomeWidgetsConfig(newHomeWidgets)
  }

  const handleResetAppearance = () => {
    setConfirmDialogTitle('Reset Appearance Settings');
    setConfirmDialogMessage(
      'Reset all appearance settings to their defaults? This includes theme choice, custom colors, and home panel visibility.'
    );
    setConfirmAction(() => () => {
      setThemeChoice('system');
      setThemeColorsAction('primaryLight', defaultThemeColorsFromStore.primaryLight);
      setThemeColorsAction('primaryDark', defaultThemeColorsFromStore.primaryDark);
      setThemeColorsAction('secondaryLight', defaultThemeColorsFromStore.secondaryLight);
      setThemeColorsAction('secondaryDark', defaultThemeColorsFromStore.secondaryDark);

      const allVisibleHomeWidgets: Record<ModuleId, boolean> = Object.fromEntries(
        (Object.keys(storedModules) as ModuleId[]).map((moduleId) => [moduleId, true])
      ) as Record<ModuleId, boolean>;
      setHomeWidgetsConfig(allVisibleHomeWidgets);
    });
    setConfirmDialogOpen(true);
  };

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      icon: (
        <LightModeIcon
          sx={{ fontSize: '1.75rem', mr: 3, ml: 1, verticalAlign: 'middle', opacity: 0.9 }}
        />
      ),
      description: 'Bright and clear interface.'
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: (
        <DarkModeIcon
          sx={{ fontSize: '1.75rem', mr: 3, ml: 1, verticalAlign: 'middle', opacity: 0.9 }}
        />
      ),
      description: 'Easy on the eyes, especially at night.'
    },
    {
      value: 'system',
      label: 'Sync with System',
      icon: (
        <SystemModeIcon
          sx={{ fontSize: '1.75rem', mr: 3, ml: 1, verticalAlign: 'middle', opacity: 0.9 }}
        />
      ),
      description: 'Automatically matches your OS theme.'
    }
  ]

  const colorFields = [
    {
      key: 'primaryLight',
      label: 'Primary (Light Mode)',
      localValue: localPrimaryLight,
      setter: setLocalPrimaryLight,
      description: 'Main accent for light theme.'
    },
    {
      key: 'primaryDark',
      label: 'Primary (Dark Mode)',
      localValue: localPrimaryDark,
      setter: setLocalPrimaryDark,
      description: 'Main accent for dark theme.'
    },
    {
      key: 'secondaryLight',
      label: 'Secondary (Light Mode)',
      localValue: localSecondaryLight,
      setter: setLocalSecondaryLight,
      description: 'Secondary highlights for light theme.'
    },
    {
      key: 'secondaryDark',
      label: 'Secondary (Dark Mode)',
      localValue: localSecondaryDark,
      setter: setLocalSecondaryDark,
      description: 'Secondary highlights for dark theme.'
    }
  ]

  return (
    <Paper sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Stack spacing={4.5}>
        <Box>
          <Typography
            variant="h6"
            component="legend"
            sx={{ mb: 1.5, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}
          >
            <PaletteIcon sx={{ mr: 1, opacity: 0.8 }} /> Application Theme
          </Typography>
          <RadioGroup value={themeChoice} onChange={handleThemeChoiceChange}>
            {themeOptions.map((option) => (
              <Paper
                key={option.value}
                variant="outlined"
                sx={{
                  p: '12px 16px 0',
                  mb: 1.5,
                  borderRadius: 1.5,
                  bgcolor: themeChoice === option.value ? 'action.selected' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => setThemeChoice(option.value as any)}
              >
                <FormControlLabel
                  value={option.value}
                  control={<Radio size="small" sx={{ p: '9px' }} />} // Standard padding for radio
                  labelPlacement="start"
                  label={
                    <Box
                      sx={{
                        textAlign: 'left',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {option.icon} {/* Icon is now larger and part of the flex row */}
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {option.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ color: 'text.secondary' }}
                        >
                          {option.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{
                    width: '100%',
                    ml: 0,
                    justifyContent: 'space-between',
                    flexDirection: 'row-reverse',
                    alignItems: 'center' /* Align radio with multi-line text */
                  }}
                />
              </Paper>
            ))}
          </RadioGroup>
        </Box>
        {/* --- Custom Theme Colors Section --- */}
        <Box>
          <Typography
            variant="h6"
            sx={{ mb: 2, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}
          >
            <ThemeColorsIcon sx={{ mr: 1, opacity: 0.8 }} /> Theme Colors
          </Typography>
          <Grid container spacing={3}>
            {colorFields.map((cf) => (
              <Grid size={{ xs: 12, sm: 6 }} key={cf.key}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                  {cf.label}
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <input
                    type="color"
                    value={cf.localValue}
                    onChange={(e) =>
                      handleColorInputChange(cf.key as keyof typeof themeColors, e, cf.setter)
                    }
                    style={{
                      width: '40px',
                      height: '40px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      padding: 0,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      backgroundColor: 'transparent'
                    }}
                    title={`Select ${cf.label}`}
                  />
                  <TextField
                    value={cf.localValue}
                    onChange={(e) =>
                      handleColorInputChange(
                        cf.key as keyof typeof themeColors,
                        e as React.ChangeEvent<HTMLInputElement>,
                        cf.setter
                      )
                    }
                    size="small"
                    variant="outlined"
                    sx={{ flexGrow: 1 }}
                    InputProps={{ sx: { fontFamily: 'monospace' } }}
                  />
                </Stack>
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 0.75, color: 'text.secondary' }}
                >
                  {cf.description}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
        {/* --- Home Screen Panels Visibility Section --- */}
        <Box>
          <Typography
            variant="h6"
            sx={{ mb: 1.5, mt: 1, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}
          >
            <HomeWidgetsIcon sx={{ mr: 1, opacity: 0.8 }} /> Home Screen Panels
          </Typography>
          {modulesWithSettingsWidgets.length > 0 ? (
            <FormControl fullWidth size="small" margin="normal">
              <InputLabel id="home-widgets-filter-label">Visible Quick Settings Panels</InputLabel>
              <Select
                labelId="home-widgets-filter-label"
                multiple
                value={selectedHomeWidgets}
                onChange={handleHomeWidgetsSelectionChange}
                input={
                  <OutlinedInput
                    size="medium"
                    label="Visible Quick Settings Panels"
                    notched={selectedHomeWidgets.length > 0}
                  />
                }
                renderValue={(selected) => {
                  if (selected.length === 0) return <em>None visible</em>
                  if (selected.length === modulesWithSettingsWidgets.length)
                    return 'All panels visible'
                  return `${selected.length} panel(s) visible`
                }}
                MenuProps={{
                  sx: {
                    '&& .Mui-selected:not(:hover)': {
                      backgroundColor: 'transparent'
                    }
                  },
                  PaperProps: { style: { maxHeight: 280 } }
                }}
              >
                {modulesWithSettingsWidgets.map((mod) => (
                  <MenuItem key={mod.id} value={mod.id} sx={{ bgcolor: 'transparent' }}>
                    <Checkbox checked={selectedHomeWidgets.includes(mod.id)} size="small" />
                    {mod.icon && (
                      <IoIcon
                        name={mod.icon}
                        style={{ marginRight: 8, fontSize: '1.2rem', opacity: 0.7 }}
                      />
                    )}
                    <ListItemText primary={mod.name} />
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Choose which module quick settings panels appear on the Home screen. You can also
                manage this in &quo;Module Settings&quo; using individual toggles.
              </Typography>
            </FormControl>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No modules have quick settings panels.
            </Typography>
          )}
        </Box>
        <Divider sx={{ mt: 2, mb: 1 }} />
        <Box sx={{ textAlign: 'right' }}>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<ResetIcon />}
            onClick={handleResetAppearance}
          >
            Reset Appearance Settings
          </Button>
        </Box>
      </Stack>
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setConfirmAction(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
          setConfirmDialogOpen(false);
          setConfirmAction(null);
        }}
        title={confirmDialogTitle}
        message={confirmDialogMessage}
      />
    </Paper>
  )
}

export default SettingsAppearance

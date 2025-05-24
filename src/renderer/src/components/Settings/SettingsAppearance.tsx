// src/renderer/src/components/Settings/SettingsAppearance.tsx
import type { FC } from 'react'
import {
  Paper,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  FormLabel,
  FormControl
} from '@mui/material'
import { useMainStore } from '@/store/mainStore'
import {
  WbSunnyOutlined as LightModeIcon,
  Brightness2Outlined as DarkModeIcon,
  SettingsBrightness as SystemModeIcon
} from '@mui/icons-material'

const SettingsAppearance: FC = () => {
  const themeChoice = useMainStore((state) => state.ui.themeChoice)
  const setThemeChoice = useMainStore((state) => state.setThemeChoice)

  const handleThemeChoiceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThemeChoice(event.target.value as 'light' | 'dark' | 'system')
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Appearance Settings
      </Typography>

      <FormControl component="fieldset">
        <FormLabel component="legend" sx={{ mb: 1, typography: 'subtitle1', fontWeight: 'medium' }}>
          Application Theme
        </FormLabel>
        <RadioGroup
          aria-label="theme-choice"
          name="theme-choice-radio-group"
          value={themeChoice}
          onChange={handleThemeChoiceChange}
        >
          <FormControlLabel
            value="light"
            control={<Radio size="small" />}
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <LightModeIcon fontSize="small" /> <Typography variant="body2">Light</Typography>
              </Stack>
            }
          />
          <FormControlLabel
            value="dark"
            control={<Radio size="small" />}
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <DarkModeIcon fontSize="small" /> <Typography variant="body2">Dark</Typography>
              </Stack>
            }
          />
          <FormControlLabel
            value="system"
            control={<Radio size="small" />}
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <SystemModeIcon fontSize="small" />{' '}
                <Typography variant="body2">Sync with System</Typography>
              </Stack>
            }
          />
        </RadioGroup>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Choose your preferred application theme. &quot;Sync with System&quot; will match your
          operating system&apos;s light or dark mode setting.
        </Typography>
      </FormControl>

      {/* Future: Other appearance settings like font size, density, accent color picker, etc. */}
    </Paper>
  )
}

export default SettingsAppearance

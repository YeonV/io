// src/renderer/src/components/Settings/SettingsIntegrations.tsx
import { useState, type FC } from 'react'
import {
  Box,
  Button,
  Typography,
  Stack,
  IconButton,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material' // Added Switch, FormControlLabel, Tooltip
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material' // Example icons for toggle
import IntegrationsBrowser from './IntegrationsBrowser'
import { integrationsMap } from '@/integrations/integrations'
import type { IntegrationId, FullIntegrationDefinition } from '@shared/integration-types'
import IoIcon from '@/components/IoIcon/IoIcon'
import { useMainStore } from '@/store/mainStore' // To get/set config
import { useShallow } from 'zustand/react/shallow'
import type { integrationsState } from '@/store/integrationsStore'

type HomeAssistantConfigFromStore = integrationsState['homeAssistant']['config']

export const SettingsIntegrations: FC = () => {
  const [viewingIntegrationId, setViewingIntegrationId] = useState<IntegrationId | null>(null)

  // Get HA config and updater from Zustand, specifically for the enable toggle
  const { haConfig, setHaConfig } = useMainStore(
    useShallow((state) => ({
      haConfig: state.integrations.homeAssistant.config,
      setHaConfig: state.setHomeAssistantConfig
    }))
  )
  // Local copy for editing, if SettingsBase needs it, but for now, enable toggle directly updates store
  // This component (SettingsIntegrations) will manage the enable toggle for the *selected* integration.
  // If viewingIntegrationId is 'home-assistant', then the toggle affects haConfig.

  const handleIntegrationEnableToggle = (state: boolean) => {
    if (viewingIntegrationId === 'home-assistant') {
      const newConfig: HomeAssistantConfigFromStore = {
        ...haConfig,
        enabled: state
      }
      setHaConfig(newConfig) // This updates Zustand and sends IPC to main
    }
    // Add logic for other integrations if/when they exist
  }

  const handleSelectIntegration = (integrationId: IntegrationId) => {
    setViewingIntegrationId(integrationId)
  }

  const handleBackToBrowser = () => {
    setViewingIntegrationId(null)
  }

  if (viewingIntegrationId) {
    const selectedIntegration: FullIntegrationDefinition | undefined =
      integrationsMap[viewingIntegrationId]

    if (!selectedIntegration) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            Error: Selected integration not found.
          </Typography>
          <Button onClick={handleBackToBrowser} variant="outlined">
            Back to Integrations Browser
          </Button>
        </Box>
      )
    }

    const SpecificIntegrationSettingsComponent = selectedIntegration.SettingsComponent
    const isCurrentIntegrationEnabled =
      viewingIntegrationId === 'home-assistant' ? haConfig.enabled : false // Adapt for other integrations

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1} // Reduced spacing for a tighter header
          sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
        >
          <IconButton onClick={handleBackToBrowser} size="small" aria-label="back to browser">
            <ArrowBackIcon />
          </IconButton>
          <IoIcon
            name={selectedIntegration.icon}
            style={{ fontSize: '1.75rem', color: 'primary.main' }}
          />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', flexGrow: 1 }}>
            {selectedIntegration.name} Settings
          </Typography>
          <ToggleButtonGroup
            color="primary"
            size="small"
            sx={{ pr: 2 }}
            value={isCurrentIntegrationEnabled ? 'enable' : 'disable'}
            exclusive
            onChange={() => handleIntegrationEnableToggle(!isCurrentIntegrationEnabled)}
            aria-label="Platform"
          >
            <ToggleButton value="enable">
              {isCurrentIntegrationEnabled ? 'Enabled' : 'Enable'}
            </ToggleButton>
            <ToggleButton value="disable">
              {isCurrentIntegrationEnabled ? 'Disable' : 'Disabled'}
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Description for the selected integration */}
        <Typography variant="body2" color="text.secondary" sx={{ p: { xs: 1.5, sm: 2 }, pb: 0 }}>
          {selectedIntegration.description}
        </Typography>

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <SpecificIntegrationSettingsComponent />{' '}
          {/* This will be HomeAssistantSettingsBase passed via HomeAssistantSettings (container) */}
        </Box>
      </Box>
    )
  }

  return <IntegrationsBrowser onSelectIntegration={handleSelectIntegration} />
}

export default SettingsIntegrations

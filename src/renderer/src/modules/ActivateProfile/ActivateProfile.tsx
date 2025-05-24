// src/renderer/src/modules/ActivateProfile/ActivateProfile.tsx

import type { FC } from 'react'
import { useEffect } from 'react' // useEffect might not be strictly needed if action is sync
import { useMainStore } from '@/store/mainStore'
import type { ModuleConfig, OutputData, Row } from '@shared/types'
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormHelperText,
  type SelectChangeEvent
} from '@mui/material'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import { useRowActivation } from '@/hooks/useRowActivation' // To respect row's own enabled state
import { useShallow } from 'zustand/react/shallow'

// --- Row Data Type for this Module ---
interface ActivateProfileOutputData {
  targetProfileId?: string // ID of the profile to activate
}

// --- Module Definition ---
export const id = 'activate-profile-module'
export const moduleConfig: ModuleConfig<{}> = {
  // No custom global config needed
  menuLabel: 'Application Control', // Or 'System', 'Profiles'
  description: 'Activate a specific profile when this output is triggered',
  inputs: [], // This is an output-only module
  outputs: [
    {
      name: 'Activate Profile',
      icon: 'switch_account',
      editable: true,
      supportedContexts: ['electron', 'web']
    }
  ],
  config: {
    enabled: true
  }
}

// --- OutputDisplay: UI for showing configured Profile Activation in a row ---
export const OutputDisplay: FC<{ output: OutputData }> = ({ output }) => {
  const outputData = output.data as ActivateProfileOutputData
  const profiles = useMainStore((state) => state.profiles)
  const targetProfileName = outputData.targetProfileId
    ? profiles[outputData.targetProfileId]?.name
    : 'None'

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1, overflow: 'hidden' }}>
      <DisplayButtons data={{ ...output, name: 'Profile' }} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexGrow: 1,
          textAlign: 'left'
        }}
      >
        <Typography noWrap variant="body2" title={targetProfileName || 'No Profile Selected'}>
          {targetProfileName || 'Not Set'}
        </Typography>
      </Box>
    </Box>
  )
}

// --- OutputEdit: UI for configuring which Profile to activate ---
export const OutputEdit: FC<{
  output: OutputData // output.data will be ActivateProfileOutputData
  onChange: (data: Partial<ActivateProfileOutputData>) => void
}> = ({ output, onChange }) => {
  const profiles = useMainStore(
    useShallow((state) => {
      // console.log('ActivateProfile.OutputEdit: Recalculating profiles from store') // Check frequency
      return Object.values(state.profiles).sort((a, b) => a.name.localeCompare(b.name))
    })
  )
  const currentData = output.data as Partial<ActivateProfileOutputData>

  const handleProfileChange = (event: SelectChangeEvent<string>) => {
    onChange({ targetProfileId: event.target.value || undefined })
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FormControl fullWidth size="small">
        <InputLabel id={`activate-profile-select-label-${output.name}`}>
          Target Profile *
        </InputLabel>
        <Select
          labelId={`activate-profile-select-label-${output.name}`}
          value={currentData.targetProfileId || ''}
          label="Target Profile *"
          onChange={handleProfileChange}
          required
        >
          <MenuItem value="" disabled>
            <em>Select profile to activate...</em>
          </MenuItem>
          {profiles.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
        {profiles.length === 0 && (
          <FormHelperText error>
            No profiles defined yet. Create profiles in Settings.
          </FormHelperText>
        )}
        {!currentData.targetProfileId && profiles.length > 0 && (
          <FormHelperText error>Please select a target profile.</FormHelperText>
        )}
      </FormControl>
    </Box>
  )
}

// --- useOutputActions: Handles activating the selected profile ---
export const useOutputActions = (row: Row) => {
  const { id: rowId, output } = row
  const outputData = output.data as ActivateProfileOutputData
  const { isActive, inactiveReason } = useRowActivation(row)

  const setActiveProfile = useMainStore((state) => state.setActiveProfile)

  useEffect(() => {
    if (!isActive) {
      log.info2(`ActivateProfile: Row ${rowId} Output not active. Reason: ${inactiveReason}`)
      return // Do nothing if not active
    }

    log.info2(
      `ActivateProfile: Attaching 'io_input' listener for Output Row ${rowId} to activate profile '${outputData.targetProfileId || 'None'}'`
    )

    const listener = (event: CustomEvent) => {
      const eventDetail = event.detail
      let triggerRowId: string | undefined

      if (typeof eventDetail === 'string') {
        triggerRowId = eventDetail
      } else if (
        typeof eventDetail === 'object' &&
        eventDetail !== null &&
        Object.prototype.hasOwnProperty.call(eventDetail, 'rowId')
      ) {
        triggerRowId = eventDetail.rowId
      } else {
        return // Unknown event structure
      }

      if (triggerRowId === rowId) {
        const targetProfileId = outputData.targetProfileId
        if (targetProfileId) {
          log.success(
            `ActivateProfile: Row ${rowId} TRIGGERED! Activating profile ID: ${targetProfileId}`
          )
          setActiveProfile(targetProfileId)
        } else {
          log.info1(`ActivateProfile: Row ${rowId} triggered, but no targetProfileId configured.`)
        }
      }
    }

    window.addEventListener('io_input', listener as EventListener)
    return () => {
      log.info2(`ActivateProfile: Removing 'io_input' listener for Output Row ${rowId}`)
      window.removeEventListener('io_input', listener as EventListener)
    }
  }, [rowId, isActive, inactiveReason, outputData.targetProfileId, setActiveProfile]) // Dependencies
}

// --- useGlobalActions (Not needed for this simple module) ---
// export const useGlobalActions = () => {
//   log.info1('useGlobalActions:', 'activate-profile');
// };

// src/renderer/src/components/Row/InputSelector.tsx
import type { Input, ModuleId, ModuleConfig } from '@shared/types' // Added ModuleConfig
import { useMainStore } from '@/store/mainStore'
import { Autocomplete, ListItem, TextField, Box, Typography } from '@mui/material' // Added Box, Typography
import IoIcon from '../IoIcon/IoIcon'
import { useMemo, FC } from 'react'
import { isElectron } from '@/utils/isElectron' // Your env detection util
import { ProBadge } from './ProBadge' // Your ProBadge component

interface InputOption {
  id: string // Input name (e.g., "Keyboard", "Time Trigger")
  icon: string
  label: string // This is input.name
  group: string // Module menu label
  moduleActualId: ModuleId
  moduleEnabled: boolean
  isWebCompatible: boolean // NEW
  supportedContexts?: ModuleContext[] // NEW - from Input type
}

// For the 'value' prop passed from IoNewRow
interface InputSelectorValue {
  name?: string // This is input.name
  icon?: string
  inputModuleId?: ModuleId
}

// Helper type from shared/types.ts if not already there
type ModuleContext = 'electron' | 'web'

export const InputSelector: FC<{
  disabled?: boolean
  value?: InputSelectorValue
  onSelect: (modId: ModuleId, input: Omit<Input, 'data' | 'editable' | 'supportedContexts'>) => void // Return base Input type
}> = ({ disabled = false, value, onSelect }) => {
  const allModulesFromStore = useMainStore((state) => state.modules)
  const isWebEnvironment = useMemo(() => !isElectron(), [])

  const options = useMemo((): InputOption[] => {
    const opts: InputOption[] = []
    for (const moduleId in allModulesFromStore) {
      const modConfig = allModulesFromStore[moduleId as ModuleId] as ModuleConfig<any> // Cast
      if (modConfig && Array.isArray(modConfig.inputs)) {
        modConfig.inputs.forEach((inpDef) => {
          const isWebCompatible = inpDef.supportedContexts
            ? inpDef.supportedContexts.includes('web')
            : false

          opts.push({
            id: inpDef.name, // Use input definition name as part of unique option ID
            icon: inpDef.icon,
            label: inpDef.name,
            group: modConfig.menuLabel || (moduleId as string),
            moduleActualId: moduleId as ModuleId,
            moduleEnabled: modConfig.config.enabled,
            isWebCompatible: isWebCompatible,
            supportedContexts: inpDef.supportedContexts // Pass this along
          })
        })
      }
    }
    return opts.sort((a, b) => {
      // Sort by group then label
      if (a.group < b.group) return -1
      if (a.group > b.group) return 1
      return a.label.localeCompare(b.label)
    })
  }, [allModulesFromStore, isWebEnvironment])

  const selectedOption = useMemo((): InputOption | null => {
    // Return null for Autocomplete if no match
    if (!value?.name || !value.inputModuleId) return null
    return (
      options.find((opt) => opt.id === value.name && opt.moduleActualId === value.inputModuleId) ||
      null
    )
  }, [options, value])

  return (
    <Autocomplete<InputOption, false, false, false> // Adjusted generic types: Multiple=false, DisableClearable=false (by default), FreeSolo=false
      fullWidth
      id="new-row-input-select"
      options={options}
      value={selectedOption}
      disabled={disabled}
      // disableClearable // Keep your original preference if you had it
      getOptionLabel={(option) => option.label} // Autocomplete needs this to display selected value in input
      renderOption={(props, option) => {
        // props includes key, pass it down
        // The props passed by Autocomplete already include a key.
        // We spread props onto ListItem, which will use that key.
        return (
          <ListItem
            {...props}
            // key={option.id + option.moduleActualId} // Key is handled by Autocomplete's props
            style={{
              display: 'flex',
              padding: '5px 15px',
              minWidth: '100px',
              justifyContent: 'space-between'
              // background: isWebEnvironment && !option.isWebCompatible ? 'red' : 'transparent'
            }}
            // Disable the option visually and functionally if not web compatible in web env
            // disabled={isWebEnvironment && !option.isWebCompatible}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                opacity: isWebEnvironment && !option.isWebCompatible ? 0.5 : 1
              }}
            >
              <IoIcon style={{ marginRight: '10px' }} name={option.icon} />
              {option.label}
            </Box>
            {isWebEnvironment && !option.isWebCompatible && <ProBadge />}
          </ListItem>
        )
      }}
      isOptionEqualToValue={(option, val) =>
        option?.id === val?.id && option?.moduleActualId === val?.moduleActualId
      }
      // getOptionDisabled is an alternative to styling/disabling in renderOption
      getOptionDisabled={(option) =>
        !option.moduleEnabled || (isWebEnvironment && !option.isWebCompatible)
      }
      groupBy={(option) => option.group}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Input"
          disabled={disabled} // Ensure TextField disabled state matches Autocomplete
          InputProps={{
            // Use InputProps directly from params for Autocomplete structure
            ...params.InputProps,
            startAdornment: (
              <>
                {/* This is your existing adornment logic */}
                {value?.icon && ( // Only show if there's a selected value with an icon
                  <IoIcon style={{ marginLeft: '10px', marginRight: '5px' }} name={value.icon} />
                )}
                {params.InputProps.startAdornment}{' '}
                {/* Preserve any existing adornments from Autocomplete */}
              </>
            )
          }}
          // slotProps={{ // slotProps is for newer MUI, InputProps is more common for Autocomplete's TextField
          //   input: {
          //     ...params.InputProps, // This was incorrect, InputProps is for the whole input, not just the input element
          //   }
          // }}
        />
      )}
      onChange={(_, newValue) => {
        if (!newValue) {
          // Handle case where selection is cleared (if disableClearable is false)
          // You might want to call onSelect with undefined or specific "cleared" values
          return
        }
        // If the selected option is disabled due to web incompatibility, optionally prevent selection or warn
        if (isWebEnvironment && !newValue.isWebCompatible) {
          alert(
            `"${newValue.label}" is an Electron-only ("Pro") feature and may not function fully in this web version. You can select it to see its configuration, but it might not trigger.`
          )
          // To prevent selection:
          // return;
        }

        const moduleConf = allModulesFromStore[newValue.moduleActualId]
        // Find the original Input definition from the module's config
        const selectedInputDef = moduleConf?.inputs.find((inp) => inp.name === newValue.id)

        if (selectedInputDef) {
          // Pass back the core parts of Input definition
          onSelect(newValue.moduleActualId, {
            name: selectedInputDef.name,
            icon: selectedInputDef.icon
            // editable and supportedContexts are part of the full Input type,
            // but onSelect might only need name/icon if IoNewRow re-derives editable status.
            // Your onSelect signature is: (modId: ModuleId, input: Input) => void
            // Let's pass the full inputDef that matches the Input type.
          })
        } else {
          console.error('InputSelector: Input definition not found for selected option:', newValue)
        }
      }}
      // readOnly={disabled} // Autocomplete uses 'disabled' prop
    />
  )
}

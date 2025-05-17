// src/renderer/src/components/Row/InputSelector.tsx
import type { Input, ModuleId } from '@shared/types'
import { useMainStore } from '@/store/mainStore'
import { Autocomplete, ListItem, TextField } from '@mui/material'
import IoIcon from '../IoIcon/IoIcon'
import { useMemo, FC } from 'react' // Added FC

interface InputOption {
  id: string // Input name (e.g., "Alexa", "Keyboard")
  icon: string
  label: string
  group: string // Module menu label
  moduleActualId: ModuleId // Store the actual ModuleId
  moduleEnabled: boolean
}

// For the 'value' prop passed from IoNewRow
interface InputSelectorValue {
  name?: string
  icon?: string
  inputModuleId?: ModuleId
}

export const InputSelector: FC<{
  disabled?: boolean
  value?: InputSelectorValue
  onSelect: (modId: ModuleId, input: Input) => void // Input is base type without data
}> = ({ disabled = false, value, onSelect }) => {
  const moduleConfigsRecord = useMainStore((state) => state.modules) // Gets Record<ModuleId, ModuleConfig<any>>

  const options = useMemo((): InputOption[] => {
    return Object.entries(moduleConfigsRecord)
      .flatMap(([moduleId, modConfig]) => {
        if (!modConfig || !modConfig.inputs) {
          console.warn(`InputSelector: Module ${moduleId} has no config or inputs array`)
          return []
        }
        return modConfig.inputs.map(
          (inp): InputOption => ({
            id: inp.name,
            icon: inp.icon,
            label: inp.name,
            group: modConfig.menuLabel,
            moduleActualId: moduleId as ModuleId,
            moduleEnabled: modConfig.config.enabled
          })
        )
      })
      .sort((a, b) => a.group.localeCompare(b.group))
  }, [moduleConfigsRecord])

  const selectedOption = useMemo((): InputOption | undefined => {
    if (!value?.name || !value.inputModuleId) return undefined
    return (
      options.find((opt) => opt.id === value.name && opt.moduleActualId === value.inputModuleId) ??
      undefined
    )
  }, [options, value])

  return (
    <Autocomplete<InputOption, false, true, false>
      fullWidth
      id="new-row-input-select"
      options={options}
      value={selectedOption}
      disabled={disabled}
      disableClearable
      getOptionLabel={(option) => option?.label ?? ''}
      renderOption={(
        props,
        option // MUI provides props with key
      ) => (
        <ListItem {...props} style={{ display: 'flex', padding: '5px 15px', minWidth: '100px' }}>
          <IoIcon style={{ marginRight: '10px' }} name={option.icon} />
          {option.label}
        </ListItem>
      )}
      isOptionEqualToValue={(opt, val) =>
        opt?.id === val?.id && opt?.moduleActualId === val?.moduleActualId
      }
      getOptionDisabled={(opt) => !opt?.moduleEnabled}
      groupBy={(option) => option?.group ?? ''}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Input"
          disabled={disabled}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <IoIcon
                    style={{ marginLeft: '10px', marginRight: '5px' }}
                    name={selectedOption?.icon}
                  />
                </>
              )
            }
          }}
        />
      )}
      onChange={(_, newValue) => {
        if (!newValue) return
        const moduleConf = moduleConfigsRecord[newValue.moduleActualId]
        const selectedInputDef = moduleConf?.inputs.find((inp) => inp.name === newValue.id)
        if (selectedInputDef) {
          onSelect(newValue.moduleActualId, selectedInputDef)
        } else {
          console.error('InputSelector: Input definition not found for selected option:', newValue)
        }
      }}
      readOnly={disabled}
    />
  )
}

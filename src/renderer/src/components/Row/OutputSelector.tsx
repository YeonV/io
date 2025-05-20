// src/renderer/src/components/Row/OutputSelector.tsx
import type { Output, ModuleId, ModuleConfig, ModuleContext } from '@shared/types'
import { useMainStore } from '@/store/mainStore'
import { Autocomplete, Box, ListItem, TextField } from '@mui/material'
import IoIcon from '../IoIcon/IoIcon'
import { useMemo, FC } from 'react'
import { isElectron } from '@/utils/isElectron'
import { ProBadge } from './ProBadge'

interface OutputOption {
  id: string // Output name
  icon: string
  label: string
  group: string
  moduleActualId: ModuleId
  moduleEnabled: boolean
  isWebCompatible: boolean // NEW
  supportedContexts?: ModuleContext[] // NEW - from Input type
}

interface OutputSelectorValue {
  name?: string
  icon?: string
  outputModuleId?: ModuleId
}

export const OutputSelector: FC<{
  disabled?: boolean
  value?: OutputSelectorValue
  onSelect: (modId: ModuleId, output: Output) => void
}> = ({ disabled = false, value, onSelect }) => {
  const moduleConfigsRecord = useMainStore((state) => state.modules)
  const allModulesFromStore = useMainStore((state) => state.modules)
  const isWebEnvironment = useMemo(() => !isElectron(), [])

  const options = useMemo((): OutputOption[] => {
    const opts: OutputOption[] = []
    for (const moduleId in allModulesFromStore) {
      const modConfig = allModulesFromStore[moduleId as ModuleId] as ModuleConfig<any> // Cast
      if (modConfig && Array.isArray(modConfig.outputs)) {
        modConfig.outputs.forEach((outDef) => {
          const isWebCompatible = outDef.supportedContexts
            ? outDef.supportedContexts.includes('web')
            : false

          opts.push({
            id: outDef.name, // Use input definition name as part of unique option ID
            icon: outDef.icon,
            label: outDef.name,
            group: modConfig.menuLabel || (moduleId as string),
            moduleActualId: moduleId as ModuleId,
            moduleEnabled: modConfig.config.enabled,
            isWebCompatible: isWebCompatible,
            supportedContexts: outDef.supportedContexts // Pass this along
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

  const selectedOption = useMemo((): OutputOption | undefined => {
    if (!value?.name || !value.outputModuleId) return undefined
    return (
      options.find((opt) => opt.id === value.name && opt.moduleActualId === value.outputModuleId) ??
      undefined
    )
  }, [options, value])

  return (
    <Autocomplete<OutputOption, false, true, false>
      fullWidth
      id="new-row-output-select"
      options={options}
      value={selectedOption}
      disabled={disabled}
      disableClearable
      getOptionLabel={(option) => option?.label ?? ''}
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
      isOptionEqualToValue={(opt, val) =>
        opt?.id === val?.id && opt?.moduleActualId === val?.moduleActualId
      }
      getOptionDisabled={(option) =>
        !option.moduleEnabled || (isWebEnvironment && !option.isWebCompatible)
      }
      groupBy={(option) => option?.group ?? ''}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Output"
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
        const selectedOutputDef = moduleConf?.outputs.find((outp) => outp.name === newValue.id)
        if (selectedOutputDef) {
          onSelect(newValue.moduleActualId, selectedOutputDef)
        } else {
          console.error(
            'OutputSelector: Output definition not found for selected option:',
            newValue
          )
        }
      }}
      readOnly={disabled}
    />
  )
}

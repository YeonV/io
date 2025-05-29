import type { Input, ModuleId, ModuleConfig } from '@shared/types'
import { useMainStore } from '@/store/mainStore'
import { Autocomplete, ListItem, TextField, Box } from '@mui/material'
import IoIcon from '../IoIcon/IoIcon'
import { useMemo, FC } from 'react'
import { isElectron } from '@/utils/isElectron'
import { ProBadge } from './ProBadge'

interface InputOption {
  id: string
  icon: string
  label: string
  group: string
  moduleActualId: ModuleId
  moduleEnabled: boolean
  isWebCompatible: boolean
  supportedContexts?: ModuleContext[]
}

interface InputSelectorValue {
  name?: string
  icon?: string
  inputModuleId?: ModuleId
}

type ModuleContext = 'electron' | 'web'

export const InputSelector: FC<{
  disabled?: boolean
  value?: InputSelectorValue
  onSelect: (modId: ModuleId, input: Omit<Input, 'data' | 'editable' | 'supportedContexts'>) => void
}> = ({ disabled = false, value, onSelect }) => {
  const allModulesFromStore = useMainStore((state) => state.modules)
  const isWebEnvironment = useMemo(() => !isElectron(), [])

  const options = useMemo((): InputOption[] => {
    const opts: InputOption[] = []
    for (const moduleId in allModulesFromStore) {
      const modConfig = allModulesFromStore[moduleId as ModuleId] as ModuleConfig<any>
      if (modConfig && Array.isArray(modConfig.inputs)) {
        modConfig.inputs.forEach((inpDef) => {
          const isWebCompatible = inpDef.supportedContexts
            ? inpDef.supportedContexts.includes('web')
            : false

          opts.push({
            id: inpDef.name,
            icon: inpDef.icon,
            label: inpDef.name,
            group: modConfig.menuLabel || (moduleId as string),
            moduleActualId: moduleId as ModuleId,
            moduleEnabled: modConfig.config.enabled,
            isWebCompatible: isWebCompatible,
            supportedContexts: inpDef.supportedContexts
          })
        })
      }
    }
    return opts.sort((a, b) => {
      if (a.group < b.group) return -1
      if (a.group > b.group) return 1
      return a.label.localeCompare(b.label)
    })
  }, [allModulesFromStore, isWebEnvironment])

  const selectedOption = useMemo((): InputOption | null => {
    if (!value?.name || !value.inputModuleId) return null
    return (
      options.find((opt) => opt.id === value.name && opt.moduleActualId === value.inputModuleId) ||
      null
    )
  }, [options, value])

  return (
    <Autocomplete<InputOption, false, false, false>
      fullWidth
      id="new-row-input-select"
      options={options}
      value={selectedOption}
      disabled={disabled}
      getOptionLabel={(option) => option.label}
      renderOption={(props, option) => {
        // eslint-disable-next-line react/prop-types
        const { key, ...propsWithoutkey } = props
        return (
          <ListItem
            key={key}
            {...propsWithoutkey}
            style={{
              display: 'flex',
              padding: '5px 15px',
              minWidth: '100px',
              justifyContent: 'space-between'
            }}
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
      getOptionDisabled={(option) =>
        !option.moduleEnabled || (isWebEnvironment && !option.isWebCompatible)
      }
      groupBy={(option) => option.group}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Input"
          disabled={disabled}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                {value?.icon && (
                  <IoIcon style={{ marginLeft: '10px', marginRight: '5px' }} name={value.icon} />
                )}
                {params.InputProps.startAdornment}
              </>
            )
          }}
        />
      )}
      onChange={(_, newValue) => {
        if (!newValue) {
          return
        }

        if (isWebEnvironment && !newValue.isWebCompatible) {
          alert(
            `"${newValue.label}" is an Electron-only ("Pro") feature and may not function fully in this web version. You can select it to see its configuration, but it might not trigger.`
          )
        }

        const moduleConf = allModulesFromStore[newValue.moduleActualId]
        const selectedInputDef = moduleConf?.inputs.find((inp) => inp.name === newValue.id)

        if (selectedInputDef) {
          onSelect(newValue.moduleActualId, {
            name: selectedInputDef.name,
            icon: selectedInputDef.icon
          })
        } else {
          console.error('InputSelector: Input definition not found for selected option:', newValue)
        }
      }}
    />
  )
}

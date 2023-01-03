import { ModuleId, Input, useMainStore } from '@/store/mainStore'
import { Autocomplete, Icon, TextField } from '@mui/material'

export const OutputSelector = ({
  onSelect,
}: {
  onSelect: (mod: ModuleId, input: Input) => void
}) => {
  const modulesAsArray = useMainStore((state) => Object.values(state.modules))
  const modules = useMainStore((state) => state.modules)

  return (
    <Autocomplete
      id={`new-row-input-select`}
      options={modulesAsArray.flatMap((mod) => {
        console.log('Y', mod.moduleConfig.outputs)
        return mod.moduleConfig.outputs.map((output) => ({
          id: output.name,
          icon: output.icon,
          label: output.name,
          group: mod.moduleConfig.menuLabel,
          groupId: mod.id,
          moduleEnabled: mod.moduleConfig.config.enabled,
        }))
      })}
      disableClearable
      isOptionEqualToValue={(opt, value) => opt.id === value.id}
      getOptionDisabled={(opt) => !opt.moduleEnabled}
      groupBy={(option) => option.group}
      renderOption={(props, option) => (
        <li
          style={{ display: 'flex', padding: '5px 15px', minWidth: '100px' }}
          {...props}
        >
          <Icon sx={{ mr: 2 }}>{option.icon}</Icon>
          {option.label}
        </li>
      )}
      sx={{ width: 200 }}
      renderInput={(params) => {
        const InputProps = { ...params.InputProps }
        InputProps.endAdornment = null
        return (
          <TextField
            {...params}
            label='Select Output'
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <Icon sx={{ mr: 1 }}>{params.inputProps.value}</Icon>
              ), // TODO @monestereo: need icon string here
            }}
          />
        )
      }}
      onChange={(_, value) => {
        console.log(value)
        if (!value) {
          return
        }
        const currentModule = modules[value.groupId as ModuleId]
        const output = currentModule.moduleConfig.outputs.find(
          (output) => output.name === value.id
        )
        if (output) {
          onSelect(currentModule.id, output)
        } else {
          throw new Error('Input not found. Cannot be possible')
        }
      }}
    />
  )
}

import type { ModuleId, Input } from '@/store/mainStore'
import { useMainStore } from '@/store/mainStore'
import { Autocomplete, Icon, TextField } from '@mui/material'

export const InputSelector = ({
  onSelect,
}: {
  onSelect: (mod: ModuleId, input: Input) => void
}) => {
  const modulesAsArray = useMainStore((state) => Object.values(state.modules))
  const modules = useMainStore((state) => state.modules)
  const fixId = 'new-row-input-select'
  return (
    <Autocomplete
      id={fixId}
      options={modulesAsArray.flatMap((mod) => {
        return mod.moduleConfig.inputs.map((inp) => ({
          id: inp.name,
          icon: inp.icon,
          label: inp.name,
          group: mod.moduleConfig.menuLabel,
          groupId: mod.id,
          moduleEnabled: mod.moduleConfig.config.enabled,
        }))
      })}
      disableClearable
      renderOption={(props, option) => (
        <li
          style={{ display: 'flex', padding: '5px 15px', minWidth: '100px' }}
          {...props}
        >
          <Icon sx={{ mr: 2 }}>{option.icon}</Icon>
          {option.label}
        </li>
      )}
      isOptionEqualToValue={(opt, value) => opt.id === value.id}
      getOptionDisabled={(opt) => !opt.moduleEnabled}
      groupBy={(option) => option.group}
      sx={{ width: 250 }}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label='Select Input'
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <Icon sx={{ mr: 1, ml: 1 }}>
                    {modulesAsArray.flatMap((mod) => mod.moduleConfig.outputs).find(o => o.name === params.inputProps.value)?.icon}
                  </Icon></>
              ),
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
        const input = currentModule.moduleConfig.inputs.find(
          (inp) => inp.name === value.id
        )
        if (input) {
          onSelect(currentModule.id, input)
        } else {
          throw new Error('Input not found. Cannot be possible')
        }
      }}
    />
  )
}

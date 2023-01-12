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
      fullWidth
      id={`new-row-output-select`}
      options={modulesAsArray
        .flatMap((mod) => {
          return mod.moduleConfig.outputs.map((output) => ({
            id: output.name,
            icon: output.icon,
            label: output.name,
            group: mod.moduleConfig.menuLabel,
            groupId: mod.id,
            moduleEnabled: mod.moduleConfig.config.enabled,
          }))
        })
        .sort((a, b) => a.group.localeCompare(b.group))}
      disableClearable
      isOptionEqualToValue={(opt, value) => opt.id === value.id}
      getOptionDisabled={(opt) => !opt.moduleEnabled}
      groupBy={(option) => option.group}
      renderOption={(props, option) => {
        return (
          <li
            style={{ display: 'flex', padding: '5px 15px', minWidth: '100px' }}
            {...props}
          >
            <Icon sx={{ mr: 2 }}>{option.icon}</Icon>
            {option.label}
          </li>
        )
      }}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label='Select Output'
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <Icon sx={{ mr: 1, ml: 1 }}>
                    {
                      modulesAsArray
                        .flatMap((mod) => mod.moduleConfig.outputs)
                        .find((o) => o.name === params.inputProps.value)?.icon
                    }
                  </Icon>
                </>
              ),
            }}
          />
        )
      }}
      onChange={(_, value) => {
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

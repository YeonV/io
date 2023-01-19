import type { ModuleId, Input } from '@/store/mainStore'
import { useMainStore } from '@/store/mainStore'
import { Autocomplete, Icon, TextField } from '@mui/material'
import IoIcon from '../IoIcon/IoIcon'

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
      fullWidth
      id={fixId}
      options={modulesAsArray
        .flatMap((mod) => {
          return mod.moduleConfig.inputs.map((inp) => ({
            id: inp.name,
            icon: inp.icon,
            label: inp.name,
            group: mod.moduleConfig.menuLabel,
            groupId: mod.id,
            moduleEnabled: mod.moduleConfig.config.enabled,
          }))
        })
        .sort((a, b) => a.group.localeCompare(b.group))}
      disableClearable
      renderOption={(props, option) => (
        <li
          style={{ display: 'flex', padding: '5px 15px', minWidth: '100px' }}
          {...props}
        >
          <IoIcon style={{ marginRight: '10px' }} name={option.icon} />
          {option.label}
        </li>
      )}
      isOptionEqualToValue={(opt, value) => opt.id === value.id}
      getOptionDisabled={(opt) => !opt.moduleEnabled || opt.label === 'REST'}
      groupBy={(option) => option.group}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            label='Select Input'
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <IoIcon
                    style={{ marginLeft: '10px', marginRight: '5px' }}
                    name={
                      modulesAsArray
                        .flatMap((mod) => mod.moduleConfig.inputs)
                        .find((o) => o.name === params.inputProps.value)?.icon
                    }
                  />
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

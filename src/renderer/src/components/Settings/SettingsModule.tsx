import { useMainStore } from '@/store/mainStore'
import { Box, Paper, Typography, FormControlLabel, Switch, Stack, Button } from '@mui/material'
import { SettingsApplications as ConfigureModuleIcon } from '@mui/icons-material'
import { moduleImplementations, type ModuleImplementationMap } from '@/modules/moduleRegistry'
import { useMemo, useState } from 'react'
import { ModuleId } from '@shared/module-ids'

const SettingsModule = () => {
  const storedModules = useMainStore((state) => state.modules)

  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({})
  const handleToggleWidgetVisibility = (moduleId: ModuleId, currentVisibility: boolean) => {
    setWidgetVisibility((prev) => ({ ...prev, [moduleId]: !currentVisibility }))

    alert(`Toggle widget for ${moduleId} to ${!currentVisibility}. (Store update needed)`)
  }

  const groupedModules = useMemo(() => {
    const groups: Record<
      string,
      Array<{ id: ModuleId; friendlyName: string; storeConfig: any; hasSettingsWidget: boolean }>
    > = {}
    ;(Object.keys(storedModules) as ModuleId[]).forEach((moduleId) => {
      const storeConfig = storedModules[moduleId]
      const impl = moduleImplementations[moduleId as keyof ModuleImplementationMap] as any

      if (!storeConfig) return

      const category = storeConfig.menuLabel || 'Uncategorized'
      if (!groups[category]) {
        groups[category] = []
      }

      let friendlyName = moduleId.replace('-module', '')
      if (storeConfig.inputs && storeConfig.inputs.length > 0 && storeConfig.inputs[0].name) {
        friendlyName = storeConfig.inputs[0].name
      } else if (
        storeConfig.outputs &&
        storeConfig.outputs.length > 0 &&
        storeConfig.outputs[0].name
      ) {
        friendlyName = storeConfig.outputs[0].name
      }
      friendlyName = friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1)

      groups[category].push({
        id: moduleId,
        friendlyName: `${friendlyName} (${moduleId.replace('-module', '')})`,
        storeConfig,
        hasSettingsWidget: !!impl?.Settings
      })
    })

    return Object.entries(groups).sort(([catA], [catB]) => catA.localeCompare(catB))
  }, [storedModules])

  const [viewingModuleSettings, setViewingModuleSettings] = useState<ModuleId | null>(null)
  const ModuleSettingsComponent = viewingModuleSettings
    ? (moduleImplementations[viewingModuleSettings as keyof ModuleImplementationMap] as any)
        ?.Settings
    : null

  if (viewingModuleSettings && ModuleSettingsComponent) {
    return (
      <Paper sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="h6">
            Configure: {storedModules[viewingModuleSettings]?.menuLabel || viewingModuleSettings} -{' '}
            {
              groupedModules.flatMap((g) => g[1]).find((m) => m.id === viewingModuleSettings)
                ?.friendlyName
            }
          </Typography>
          <Button onClick={() => setViewingModuleSettings(null)} size="small">
            Back to Module List
          </Button>
        </Box>
        <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
          <ModuleSettingsComponent />
        </Box>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Module Management
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Manage visibility of module-specific quick settings panels on the Home screen, and access
        detailed module configurations.
      </Typography>

      {groupedModules.map(([category, modulesInCategory]) => (
        <Box key={category} sx={{ mb: 3 }}>
          <Typography variant="overline" display="block" sx={{ color: 'text.secondary', mb: 1 }}>
            {category}
          </Typography>
          <Stack spacing={1.5}>
            {modulesInCategory.map((mod) => (
              <Paper key={mod.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                  {mod.friendlyName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {mod.storeConfig.inputs?.length || 0} Input(s),{' '}
                  {mod.storeConfig.outputs?.length || 0} Output(s)
                </Typography>

                {mod.hasSettingsWidget && (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={widgetVisibility[mod.id] ?? true}
                          onChange={() =>
                            handleToggleWidgetVisibility(mod.id, widgetVisibility[mod.id] ?? true)
                          }
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          Show quick panel on Home
                        </Typography>
                      }
                    />
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<ConfigureModuleIcon />}
                      onClick={() => setViewingModuleSettings(mod.id)}
                    >
                      Configure
                    </Button>
                  </Stack>
                )}
                {!mod.hasSettingsWidget && (
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ color: 'text.disabled', fontSize: '0.75rem' }}
                  >
                    This module has no specific settings panel.
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}
    </Paper>
  )
}

export default SettingsModule

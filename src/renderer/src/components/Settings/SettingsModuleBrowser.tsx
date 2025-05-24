// src/renderer/src/components/Settings/SettingsModule.tsx
import { useMainStore } from '@/store/mainStore'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Settings as ConfigureModuleIcon, // Re-aliased for clarity
  ViewList as ListViewIcon,
  GridView as GridViewIcon,
  Search as SearchIcon,
  InfoOutlined as NoSettingsIcon // Icon for modules with no settings
} from '@mui/icons-material'
import { moduleImplementations, type ModuleImplementationMap } from '@/modules/moduleRegistry'
import { useMemo, useState, type FC } from 'react'
import { ModuleId, ALL_MODULE_IDS } from '@shared/module-ids' // Using ALL_MODULE_IDS
import IoIcon from '@/components/IoIcon/IoIcon'

// Assume this is still how individual module settings are rendered when "Configure" is clicked
// const ModuleSettingsComponent = viewingModuleSettings ? ... : null;

interface ModuleDisplayInfo {
  id: ModuleId
  enabled?: boolean // Assuming moduleConfig has this property
  friendlyName: string
  fullIdName: string // e.g., "Keyboard (keyboard-module)"
  category: string
  description?: string // Assuming moduleConfig might have this
  icon: string
  inputCount: number
  outputCount: number
  hasSettingsWidget: boolean
  // storeConfig: any; // Keep for direct access if needed by ModuleSettingsComponent
}

const SettingsModule: FC = () => {
  const storedModules = useMainStore((state) => state.modules)
  // No widgetVisibility state needed here anymore

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid') // Default to grid
  const [searchTerm, setSearchTerm] = useState('')

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'list' | 'grid' | null
  ) => {
    if (newMode !== null) {
      setViewMode(newMode)
    }
  }

  const allModuleDetails = useMemo((): ModuleDisplayInfo[] => {
    return ALL_MODULE_IDS.map((moduleId) => {
      const storeConfig = storedModules[moduleId]
      const impl = moduleImplementations?.[moduleId as keyof ModuleImplementationMap] as any // Check if implementations loaded

      if (!storeConfig) return null // Module not in store for some reason

      let friendlyNamePart = moduleId.replace('-module', '')
      if (storeConfig.inputs && storeConfig.inputs.length > 0 && storeConfig.inputs[0].name) {
        friendlyNamePart = storeConfig.inputs[0].name
      } else if (
        storeConfig.outputs &&
        storeConfig.outputs.length > 0 &&
        storeConfig.outputs[0].name
      ) {
        friendlyNamePart = storeConfig.outputs[0].name
      }
      friendlyNamePart = friendlyNamePart.charAt(0).toUpperCase() + friendlyNamePart.slice(1)

      const moduleIconName =
        storeConfig.inputs?.[0]?.icon || storeConfig.outputs?.[0]?.icon || 'mdi:puzzle-outline'

      return {
        id: moduleId,
        enabled: storeConfig.config?.enabled ?? true, // Default to true if not set
        friendlyName: friendlyNamePart,
        fullIdName: `${friendlyNamePart} (${moduleId.replace('-module', '')})`,
        category: storeConfig.menuLabel || 'Uncategorized',
        description: (storeConfig as any).description || 'No description available.', // Add description to your ModuleConfig type
        icon: moduleIconName,
        inputCount: storeConfig.inputs?.length || 0,
        outputCount: storeConfig.outputs?.length || 0,
        hasSettingsWidget: !!impl?.Settings
        // storeConfig: storeConfig // If needed by the actual settings component later
      }
    }).filter(Boolean) as ModuleDisplayInfo[] // Filter out nulls and assert type
  }, [storedModules]) // Add 'implementations' if it becomes state and affects hasSettingsWidget directly

  const filteredModules = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim()
    if (!lowerSearchTerm) return allModuleDetails

    return allModuleDetails.filter(
      (mod) =>
        mod.friendlyName.toLowerCase().includes(lowerSearchTerm) ||
        mod.fullIdName.toLowerCase().includes(lowerSearchTerm) ||
        mod.category.toLowerCase().includes(lowerSearchTerm) ||
        mod.id.toLowerCase().includes(lowerSearchTerm) ||
        mod.description?.toLowerCase().includes(lowerSearchTerm)
    )
  }, [allModuleDetails, searchTerm])

  // Grouping for List view (can be adapted for Grid if you want sections)
  const groupedModulesForList = useMemo(() => {
    if (viewMode !== 'list') return [] // Only compute if list view is active
    const groups: Record<string, ModuleDisplayInfo[]> = {}
    filteredModules.forEach((mod) => {
      const category = mod.category
      if (!groups[category]) groups[category] = []
      groups[category].push(mod)
    })
    return Object.entries(groups).sort(([catA], [catB]) => catA.localeCompare(catB))
  }, [filteredModules, viewMode])

  const [viewingModuleSettings, setViewingModuleSettings] = useState<ModuleId | null>(null)
  const ModuleSettingsComponent =
    viewingModuleSettings && moduleImplementations // Check implementations loaded
      ? (moduleImplementations[viewingModuleSettings as keyof ModuleImplementationMap] as any)
          ?.Settings
      : null

  // === Main Render Logic ===
  if (viewingModuleSettings && ModuleSettingsComponent) {
    const modBeingConfigured = allModuleDetails.find((m) => m.id === viewingModuleSettings)
    return (
      <Paper
        sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            {modBeingConfigured?.icon && (
              <IoIcon name={modBeingConfigured.icon} style={{ fontSize: '1.5rem' }} />
            )}
            <Typography variant="h6">
              Configure: {modBeingConfigured?.fullIdName || viewingModuleSettings}
            </Typography>
          </Stack>
          <Button onClick={() => setViewingModuleSettings(null)} size="small" variant="outlined">
            Back to Module Browser
          </Button>
        </Box>
        <Box sx={{ p: { xs: 1, sm: 2 }, flexGrow: 1, overflowY: 'auto' }}>
          <ModuleSettingsComponent />
        </Box>
      </Paper>
    )
  }

  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        overflowY: 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            Module Browser
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Explore available modules and access their specific configurations.
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="View mode"
          size="small"
        >
          <ToggleButton value="grid" aria-label="Grid view">
            <GridViewIcon />
          </ToggleButton>
          <ToggleButton value="list" aria-label="List view">
            <ListViewIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder="Search modules by name, category, or description..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2, flexShrink: 0 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          )
        }}
      />

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {/* Scrollable area for content */}
        {filteredModules.length === 0 && searchTerm && (
          <Typography sx={{ textAlign: 'center', mt: 4 }} color="text.secondary">
            No modules match your search &quot;{searchTerm}&quot;.
          </Typography>
        )}
        {filteredModules.length === 0 && !searchTerm && (
          <Typography sx={{ textAlign: 'center', mt: 4 }} color="text.secondary">
            No modules available.
          </Typography> // Should not happen if ALL_MODULE_IDS is populated
        )}
        {/* Grid View */}
        {viewMode === 'grid' && (
          <Grid container spacing={2}>
            {filteredModules
              .sort((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1))
              .map((mod) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={mod.id}>
                  <Card
                    elevation={mod.enabled ? 6 : 2}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      color: mod.enabled ? 'text.primary' : 'text.disabled'
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                        <IoIcon
                          name={mod.icon}
                          style={{ fontSize: '2rem', color: 'primary.main' }}
                        />
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                          {mod.friendlyName}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Category: {mod.category}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          my: 1.5,
                          fontSize: '0.8rem',
                          minHeight: '40px' /* For consistent card height */
                        }}
                      >
                        {mod.description}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${mod.inputCount} In / ${mod.outputCount} Out`}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                      {mod.hasSettingsWidget ? (
                        <Tooltip title={`Configure ${mod.friendlyName}`}>
                          <IconButton
                            onClick={() => setViewingModuleSettings(mod.id)}
                            size="small"
                            color="primary"
                          >
                            <ConfigureModuleIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="This module has no specific settings panel">
                          <span>
                            {' '}
                            {/* IconButton disabled needs a span wrapper for Tooltip */}
                            <IconButton size="small" disabled>
                              <NoSettingsIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
          </Grid>
        )}
        {/* List View */}
        {viewMode === 'list' && (
          <Stack spacing={0}>
            {' '}
            {/* No spacing, Paper provides it */}
            {groupedModulesForList.map(([category, modulesInCategory]) => (
              <Box key={category} sx={{ mb: 2.5 }}>
                <Typography
                  variant="overline"
                  display="block"
                  sx={{
                    color: 'text.secondary',
                    mb: 0.5,
                    fontWeight: 'medium',
                    borderBottom: 1,
                    borderColor: 'divider',
                    pb: 0.5
                  }}
                >
                  {category}
                </Typography>
                <List dense disablePadding>
                  {modulesInCategory.map((mod) => (
                    <Paper
                      key={mod.id}
                      variant="outlined"
                      sx={{ display: 'flex', alignItems: 'center', p: 1, mb: 0.5, borderRadius: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, mr: 0.5 }}>
                        {' '}
                        <IoIcon name={mod.icon} style={{ fontSize: '1.5rem', opacity: 0.8 }} />{' '}
                      </ListItemIcon>
                      <ListItemText
                        primary={mod.fullIdName}
                        secondary={`${mod.inputCount} Input(s), ${mod.outputCount} Output(s) ${mod.description ? `- ${mod.description.substring(0, 50)}...` : ''}`}
                        primaryTypographyProps={{ fontWeight: 'medium' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                      <Box sx={{ ml: 1, flexShrink: 0 }}>
                        {mod.hasSettingsWidget ? (
                          <Tooltip title={`Configure ${mod.friendlyName}`}>
                            <IconButton
                              onClick={() => setViewingModuleSettings(mod.id)}
                              size="small"
                              color="primary"
                            >
                              <ConfigureModuleIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="No specific settings panel">
                            <span>
                              <IconButton size="small" disabled>
                                <NoSettingsIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </List>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  )
}

export default SettingsModule

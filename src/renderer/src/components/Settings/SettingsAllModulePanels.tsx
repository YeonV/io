// src/renderer/src/components/Settings/SettingsAllModulePanels.tsx
import { useMainStore } from '@/store/mainStore'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Tooltip,
  Switch,
  FormControlLabel // Added Switch, FormControlLabel
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  UnfoldLess as CollapseAllIcon,
  UnfoldMore as ExpandAllIcon,
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon // Icons for the switch
} from '@mui/icons-material'
import { moduleImplementations, type ModuleImplementationMap } from '@/modules/moduleRegistry'
import { useMemo, useState, type FC, useEffect } from 'react'
import IoIcon from '@/components/IoIcon/IoIcon'
import { ModuleId } from '@shared/module-ids'

// Assuming mainStore has these (you'll need to implement them):
// ui.homeWidgets: Record<ModuleId, boolean>
// setUiValue: (key: string, value: any) => void; // Or a specific setter

const SettingsAllModulePanels: FC = () => {
  const storedModules = useMainStore((state) => state.modules)

  // Get widget visibility state and setter from mainStore (adapt to your actual store structure)
  const homeWidgets = useMainStore((state) => state.ui.homeWidgets || {})
  const setHomeWidgets = useMainStore((state) => state.setHomeWidgets)

  const handleToggleWidgetVisibility = (moduleId: ModuleId) => {
    const currentVisibility = homeWidgets[moduleId] ?? true // Default to true if not set
    // This assumes setUiValue can update a nested property or you have a specific action
    setHomeWidgets({
      ...homeWidgets,
      [moduleId]: !currentVisibility
    })
  }

  const [expandedPanels, setExpandedPanels] = useState<string[]>([]) // Start collapsed by default now

  const modulesWithSettings = useMemo(() => {
    /* ... (same as before) ... */
    return (Object.keys(storedModules) as ModuleId[])
      .map((moduleId) => {
        const storeConfig = storedModules[moduleId]
        const impl = moduleImplementations[moduleId as keyof ModuleImplementationMap] as any
        const SettingsComponent = impl?.Settings
        if (!storeConfig || !SettingsComponent) return null
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
        const moduleIcon =
          storeConfig.inputs?.[0]?.icon || storeConfig.outputs?.[0]?.icon || 'mdi:puzzle-outline'
        return {
          id: moduleId,
          friendlyName: `${friendlyName} (${moduleId.replace('-module', '')})`,
          category: storeConfig.menuLabel || 'Uncategorized',
          icon: moduleIcon,
          SettingsComponent
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.category.localeCompare(b!.category) !== 0) {
          return a!.category.localeCompare(b!.category)
        }
        return a!.friendlyName.localeCompare(b!.friendlyName)
      })
  }, [storedModules])

  // Initialize expandedPanels when modulesWithSettings is ready (e.g., expand all by default)
  useEffect(() => {
    if (modulesWithSettings.length > 0) {
      setExpandedPanels(modulesWithSettings.map((mod) => mod!.id))
    }
  }, [modulesWithSettings])

  const handleAccordionChange =
    (panelId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels((prevExpanded) =>
        isExpanded ? [...prevExpanded, panelId] : prevExpanded.filter((id) => id !== panelId)
      )
    }
  const handleToggleAll = () => {
    if (expandedPanels.length === modulesWithSettings.length) {
      setExpandedPanels([])
    } else {
      setExpandedPanels(modulesWithSettings.map((mod) => mod!.id))
    }
  }
  const areAllExpanded = useMemo(() => {
    if (modulesWithSettings.length === 0) return false
    return expandedPanels.length === modulesWithSettings.length
  }, [expandedPanels, modulesWithSettings])

  if (modulesWithSettings.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          All Module Settings Panels
        </Typography>
        <Typography color="text.secondary">
          No modules with configurable settings panels found.
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, overflowY: 'auto', height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            All Module Settings Panels
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
            Configure all modules and their visibility on the Home screen.
          </Typography>
        </Box>
        {modulesWithSettings.length > 0 && (
          <Tooltip title={areAllExpanded ? 'Collapse All Panels' : 'Expand All Panels'}>
            <Button
              size="small"
              onClick={handleToggleAll}
              startIcon={areAllExpanded ? <CollapseAllIcon /> : <ExpandAllIcon />}
              variant="outlined"
            >
              {areAllExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
          </Tooltip>
        )}
      </Stack>

      <Stack spacing={0.5}>
        {modulesWithSettings.map((mod) => {
          const isWidgetVisibleOnHome = homeWidgets[mod!.id] ?? true // Default to true

          return (
            <Accordion
              key={mod!.id}
              expanded={expandedPanels.includes(mod!.id)}
              onChange={handleAccordionChange(mod!.id)}
              TransitionProps={{ unmountOnExit: true }}
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-of-type': { borderBottom: 0 }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${mod!.id}-settings-content`}
                id={`${mod!.id}-settings-header`}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    gap: 1.5,
                    width: '100%'
                  }, // Ensure content takes full width
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <IoIcon name={mod!.icon} style={{ fontSize: '1.5rem', opacity: 0.8 }} />
                <Typography
                  sx={{
                    fontWeight: 'medium',
                    flexShrink: 0,
                    mr: 1,
                    flexGrow: 1 /* Allow name to take space */
                  }}
                >
                  {mod!.friendlyName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ mr: 2 }}>
                  ({mod!.category})
                </Typography>

                {/* --- New Switch for Home Visibility --- */}
                <Tooltip
                  title={
                    isWidgetVisibleOnHome ? 'Hide quick panel on Home' : 'Show quick panel on Home'
                  }
                >
                  <FormControlLabel
                    onClick={(event) => event.stopPropagation()} // Prevent accordion toggle
                    onFocus={(event) => event.stopPropagation()} // Prevent accordion focus steal
                    sx={{ mr: 0, ml: 'auto', my: -0.5 }} // Pull to the right, adjust vertical alignment
                    control={
                      <Switch
                        size="small"
                        checked={isWidgetVisibleOnHome}
                        onChange={(e) => {
                          e.stopPropagation() // Prevent accordion toggle
                          handleToggleWidgetVisibility(mod!.id)
                        }}
                        // Optional: use custom icons for the switch
                        // icon={<VisibilityOffIcon fontSize="small" />}
                        // checkedIcon={<VisibilityIcon fontSize="small" />}
                      />
                    }
                    // labelPlacement="start" // If you want label before switch
                    label={
                      null
                      //   <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                      //     Home
                      //   </Typography>
                    } // Optional tiny label
                  />
                </Tooltip>
                {/* The ExpandMoreIcon will render after this due to MUI's structure */}
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, bgcolor: 'background.default' }}>
                {mod && <mod.SettingsComponent />}
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Stack>
    </Paper>
  )
}

export default SettingsAllModulePanels

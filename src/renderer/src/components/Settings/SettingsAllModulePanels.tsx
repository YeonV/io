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
  Button, // Added Button for toggle
  Tooltip // Added Tooltip
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  UnfoldLess as CollapseAllIcon, // Icon for Collapse All
  UnfoldMore as ExpandAllIcon // Icon for Expand All
} from '@mui/icons-material'
import { moduleImplementations, type ModuleImplementationMap } from '@/modules/moduleRegistry'
import { useMemo, useState, type FC, useEffect } from 'react' // Added useEffect
import IoIcon from '@/components/IoIcon/IoIcon'
import { ModuleId } from '@shared/module-ids'

const SettingsAllModulePanels: FC = () => {
  const storedModules = useMainStore((state) => state.modules)

  // --- State for Accordion Expansion ---
  // Now an array to support multiple expansions for "Expand All"

  const modulesWithSettings = useMemo(() => {
    /* ... (same as before, no changes needed here) ... */
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

  const [expandedPanels, setExpandedPanels] = useState<string[]>(
    modulesWithSettings.map((mod) => mod!.id)
  )
  // Effect to default expand the first panel if list is not empty
  useEffect(() => {
    if (modulesWithSettings.length > 0 && expandedPanels.length === 0) {
      // setExpandedPanels([modulesWithSettings[0]!.id]); // Default expand first
    }
  }, [modulesWithSettings]) // removed expandedPanels from dep to avoid loop if user collapses all

  const handleAccordionChange =
    (panelId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels(
        (prevExpanded) =>
          isExpanded
            ? [...prevExpanded, panelId] // Add to array if not already present
            : prevExpanded.filter((id) => id !== panelId) // Remove from array
      )
    }

  const handleToggleAll = () => {
    if (expandedPanels.length === modulesWithSettings.length) {
      // All are expanded, so collapse all
      setExpandedPanels([])
    } else {
      // Not all (or none) are expanded, so expand all
      setExpandedPanels(modulesWithSettings.map((mod) => mod!.id))
    }
  }

  const areAllExpanded = useMemo(() => {
    if (modulesWithSettings.length === 0) return false
    return expandedPanels.length === modulesWithSettings.length
  }, [expandedPanels, modulesWithSettings])

  if (modulesWithSettings.length === 0) {
    /* ... (same empty state) ... */
  }

  return (
    <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, overflowY: 'auto', height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            {' '}
            {/* Removed gutterBottom from h6 */}
            All Module Settings Panels
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
            Quickly access and configure settings for all available modules.
          </Typography>
        </Box>
        {modulesWithSettings.length > 0 && ( // Only show toggle if there are items
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
        {' '}
        {/* Reduced spacing between accordions */}
        {modulesWithSettings.map((mod) => (
          <Accordion
            key={mod!.id}
            expanded={expandedPanels.includes(mod!.id)} // Check if ID is in the array
            onChange={handleAccordionChange(mod!.id)}
            TransitionProps={{ unmountOnExit: true }} // Good for performance with many panels
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
                '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 },
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <IoIcon name={mod!.icon} style={{ fontSize: '1.5rem', opacity: 0.8 }} />
              <Typography sx={{ fontWeight: 'medium', flexShrink: 0, mr: 1 }}>
                {mod!.friendlyName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                ({mod!.category})
              </Typography>
            </AccordionSummary>
            <AccordionDetails
              sx={{ p: 2, bgcolor: 'background.default' /* Slightly different bg for details */ }}
            >
              {mod && <mod.SettingsComponent />}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Paper>
  )
}

export default SettingsAllModulePanels

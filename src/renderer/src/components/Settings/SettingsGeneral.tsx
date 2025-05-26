// src/renderer/src/components/Settings/SettingsGeneral.tsx
import {
  Paper,
  Typography,
  Stack,
  Button,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box
} from '@mui/material'
import { type FC, useState, useMemo } from 'react'
import SettingsStartup from './SettingsStartup'
import SettingsWindowBehavior from './SettingsWindowBehavior'
import SettingsData from './SettingsData'
import {
  ExpandMore as ExpandMoreIcon,
  UnfoldLess as CollapseAllIcon,
  UnfoldMore as ExpandAllIcon,
  // Icons for each section can be added to section definitions
  Login as StartupIcon,
  SettingsOverscan as WindowBehaviorIconInternal, // Renamed to avoid conflict
  Storage as DataIcon
} from '@mui/icons-material'

interface SettingsSection {
  id: string
  title: string
  icon?: React.ReactNode
  component: React.ReactNode
  defaultExpanded?: boolean // Control initial expansion per section
}

const SettingsGeneral: FC = () => {
  const sections: SettingsSection[] = useMemo(
    () => [
      {
        id: 'startup',
        title: 'Application Startup',
        icon: <StartupIcon sx={{ mr: 1, opacity: 0.8 }} />,
        component: <SettingsStartup />,
        defaultExpanded: false
      },
      {
        id: 'windowBehavior',
        title: 'Window Behavior',
        icon: <WindowBehaviorIconInternal sx={{ mr: 1, opacity: 0.8 }} />,
        component: <SettingsWindowBehavior />,
        defaultExpanded: false
      },
      {
        id: 'dataManagement',
        title: 'Data Management',
        icon: <DataIcon sx={{ mr: 1, opacity: 0.8 }} />,
        component: <SettingsData />,
        defaultExpanded: false
      }
      // Add future general settings sections here
    ],
    []
  )

  // Initialize expanded state based on defaultExpanded or start all collapsed
  const initialExpanded = sections.filter((s) => s.defaultExpanded).map((s) => s.id)
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(initialExpanded)

  const handleAccordionChange =
    (panelId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedAccordions((prev) =>
        isExpanded ? [...prev, panelId] : prev.filter((id) => id !== panelId)
      )
    }

  const handleToggleAllAccordions = () => {
    if (expandedAccordions.length === sections.length) {
      setExpandedAccordions([]) // Collapse all
    } else {
      setExpandedAccordions(sections.map((s) => s.id)) // Expand all
    }
  }

  const areAllSectionsExpanded = useMemo(() => {
    if (sections.length === 0) return false
    return expandedAccordions.length === sections.length
  }, [expandedAccordions, sections])

  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            General Application Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure core application behaviors and data management.
          </Typography>
        </Box>
        {sections.length > 0 && (
          <Tooltip title={areAllSectionsExpanded ? 'Collapse All Sections' : 'Expand All Sections'}>
            <Button
              size="small"
              onClick={handleToggleAllAccordions}
              startIcon={areAllSectionsExpanded ? <CollapseAllIcon /> : <ExpandAllIcon />}
              variant="text" // More subtle than outlined for this context
            >
              {areAllSectionsExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
          </Tooltip>
        )}
      </Stack>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 /* space for scrollbar */ }}>
        {sections.map((section) => (
          <Accordion
            key={section.id}
            expanded={expandedAccordions.includes(section.id)}
            onChange={handleAccordionChange(section.id)}
            TransitionProps={{ unmountOnExit: true }} // Good for performance
            elevation={1} // Subtle elevation for each accordion
            sx={{ '&:before': { display: 'none' } /* Remove default top border */ }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${section.id}-content`}
              id={`${section.id}-header`}
              sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 0.5 } }}
            >
              {section.icon}
              <Typography sx={{ fontWeight: 'medium', flexShrink: 0 }}>{section.title}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1, pb: 2, px: 2 /* Add some padding to details */ }}>
              {section.component}
            </AccordionDetails>
          </Accordion>
        ))}
        {/* Placeholder for future sections if any, or remove */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: 'center', display: sections.length > 0 ? 'none' : 'block' }}
        >
          More general settings will appear here.
        </Typography>
      </Box>
    </Paper>
  )
}

export default SettingsGeneral

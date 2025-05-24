// src/renderer/src/components/Settings/Settings.tsx
import { forwardRef, useState, type FC, type ReactNode } from 'react'
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Paper,
  Tooltip,
  Slide
} from '@mui/material'
import {
  Close as CloseIcon,
  Tune as GeneralIcon,
  PaletteOutlined as AppearanceIcon, // Palette icon for Appearance
  AccountCircleOutlined as ProfilesIcon, // People icon for Profiles
  ExtensionOutlined as ModulesIcon, // Extension icon for Modules
  HistoryOutlined as HistoryIcon, // History icon
  InfoOutlined as AboutIcon,
  Settings as SettingsIcon,
  ViewAgendaOutlined as AllSettingsPanelsIcon
  // Icons for specific settings will be imported as needed
} from '@mui/icons-material'

import ProfileManagerSettings from './ProfileManagerSettings' // Assuming this is the one from the Home screen
// Import module settings components if they are separate and we want to embed them directly
// e.g., import { RestSettingsComponent } from '@/modules/Rest/components/RestSettings';
// For now, we'll have a placeholder for module-specific settings management.

import SettingsAbout from './SettingsAbout'
import SettingsGeneral from './SettingsGeneral'
import SettingsAppearance from './SettingsAppearance'
import SettingsModule from './SettingsModule'
import SettingsHistory from './SettingsHistory'
import { TransitionProps } from '@mui/material/transitions'
import SettingsAllModulePanels from './SettingsAllModulePanels'

type SettingsCategory =
  | 'general'
  | 'appearance'
  | 'profiles'
  | 'modules'
  | 'history'
  | 'about'
  | 'allModulePanels'

const settingsCategories: Array<{ id: SettingsCategory; label: string; icon: ReactNode }> = [
  { id: 'general', label: 'General', icon: <GeneralIcon /> },
  { id: 'appearance', label: 'Appearance', icon: <AppearanceIcon /> },
  { id: 'profiles', label: 'Profiles', icon: <ProfilesIcon /> },
  { id: 'modules', label: 'Module Management', icon: <ModulesIcon /> },
  { id: 'allModulePanels', label: 'Module Settings', icon: <AllSettingsPanelsIcon /> },
  { id: 'history', label: 'Row History', icon: <HistoryIcon /> },
  { id: 'about', label: 'About', icon: <AboutIcon /> }
]

const SettingsDialogContent: FC<{ category: SettingsCategory }> = ({ category }) => {
  switch (category) {
    case 'general':
      return <SettingsGeneral />
    case 'appearance':
      return <SettingsAppearance />
    case 'profiles':
      return <ProfileManagerSettings />
    case 'modules':
      return <SettingsModule />
    case 'allModulePanels':
      return <SettingsAllModulePanels />
    case 'history':
      return <SettingsHistory />
    case 'about':
      return <SettingsAbout />
    default:
      return <Typography>Select a category.</Typography>
  }
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<unknown>
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function Settings() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory>('general')

  const handleOpen = () => setDialogOpen(true)
  const handleClose = () => setDialogOpen(false)

  return (
    <>
      <Tooltip title="Application Settings">
        <IconButton
          color="secondary"
          onClick={handleOpen}
          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Dialog fullScreen open={dialogOpen} onClose={handleClose} slots={{ transition: Transition }}>
        <AppBar sx={{ position: 'relative', boxShadow: 1 }}>
          <Toolbar>
            <SettingsIcon sx={{ mr: 1 }} />
            <Typography sx={{ ml: 2, flex: 1, fontWeight: 'medium' }} variant="h6" component="div">
              Application Settings
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' /* Prevent double scrollbars */ }}
        >
          {/* Sidebar Navigation */}
          <Paper
            elevation={0}
            square
            sx={{
              width: 240,
              borderRight: 1,
              borderColor: 'divider',
              flexShrink: 0,
              overflowY: 'auto'
            }}
          >
            <List component="nav" sx={{ pt: 2 }}>
              {settingsCategories.map((cat) => (
                <ListItemButton
                  key={cat.id}
                  selected={selectedCategory === cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{cat.icon}</ListItemIcon>
                  <ListItemText primary={cat.label} />
                </ListItemButton>
              ))}
            </List>
          </Paper>

          {/* Content Area */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: { xs: 2, sm: 3 }, // Responsive padding
              overflowY: 'auto', // Allow content to scroll
              height: 'calc(100vh - 64px)' // Full height minus AppBar
            }}
          >
            <SettingsDialogContent category={selectedCategory} />
          </Box>
        </Box>
      </Dialog>
    </>
  )
}

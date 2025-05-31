// src/renderer/src/components/Settings/IntegrationsBrowser.tsx
import { useMemo, useState, type FC } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
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
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton, // Use ListItemButton for clickable list items
  Button
} from '@mui/material'
import {
  Settings as ConfigureIcon,
  ViewList as ListViewIcon,
  GridView as GridViewIcon,
  Search as SearchIcon
  //   ExtensionOffOutlined as NoSettingsIcon // Placeholder if needed, though integrations should have settings
} from '@mui/icons-material'
import { integrationsList } from '@/integrations/integrations' // Generated file
import type { FullIntegrationDefinition, IntegrationId } from '@shared/integration-types'
import IoIcon from '@/components/IoIcon/IoIcon' // Assuming you use IoIcon

interface IntegrationsBrowserProps {
  onSelectIntegration: (integrationId: IntegrationId) => void
}

export const IntegrationsBrowser: FC<IntegrationsBrowserProps> = ({ onSelectIntegration }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid') // Default to grid
  const [searchTerm, setSearchTerm] = useState('')

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'grid' | 'list' | null
  ) => {
    if (newMode !== null) {
      setViewMode(newMode)
    }
  }

  const filteredIntegrations = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim()
    if (!lowerSearchTerm) return integrationsList

    return integrationsList.filter(
      (intDef) =>
        intDef.name.toLowerCase().includes(lowerSearchTerm) ||
        intDef.id.toLowerCase().includes(lowerSearchTerm) ||
        intDef.description.toLowerCase().includes(lowerSearchTerm)
    )
  }, [searchTerm]) // integrationsList is static from import, no need to list as dep

  // Grouping for List view (optional, can just be a flat list)
  // For now, a flat list is simpler as integrations don't have explicit categories yet.
  // If categories are added to IntegrationConfig, grouping can be implemented.

  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        overflowY: 'auto',
        height: '100%', // Ensure it takes full height of its container in Settings
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
            Integrations Browser
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage connections to external services and platforms.
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
            <Tooltip title="Grid View">
              <GridViewIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="list" aria-label="List view">
            <Tooltip title="List View">
              <ListViewIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder="Search integrations by name or description..."
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
        {filteredIntegrations.length === 0 && (
          <Typography sx={{ textAlign: 'center', mt: 4 }} color="text.secondary">
            {searchTerm
              ? `No integrations match your search "${searchTerm}".`
              : 'No integrations available.'}
          </Typography>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredIntegrations.length > 0 && (
          <Grid container spacing={2}>
            {filteredIntegrations.map((intDef: FullIntegrationDefinition) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={intDef.id}>
                <Card
                  elevation={3}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                      <IoIcon
                        name={intDef.icon}
                        style={{ fontSize: '2.5rem', color: 'primary.main' }}
                      />
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                        {intDef.name}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.875rem',
                        minHeight: '60px', // For consistent card height
                        mb: 1
                      }}
                    >
                      {intDef.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1.5, px: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ConfigureIcon />}
                      onClick={() => onSelectIntegration(intDef.id)}
                    >
                      Configure
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* List View */}
        {viewMode === 'list' && filteredIntegrations.length > 0 && (
          <List sx={{ width: '100%' }}>
            {filteredIntegrations.map((intDef: FullIntegrationDefinition) => (
              <Paper key={intDef.id} variant="outlined" sx={{ mb: 1 }}>
                <ListItemButton onClick={() => onSelectIntegration(intDef.id)}>
                  <ListItemIcon sx={{ minWidth: 48, mr: 1 }}>
                    <IoIcon name={intDef.icon} style={{ fontSize: '2rem', opacity: 0.9 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={intDef.name}
                    secondary={intDef.description}
                    primaryTypographyProps={{ fontWeight: 'medium', mb: 0.25 }}
                    secondaryTypographyProps={{ fontSize: '0.8rem', whiteSpace: 'normal' }}
                  />
                  <Tooltip title={`Configure ${intDef.name}`}>
                    <IconButton edge="end" aria-label="configure" sx={{ ml: 1 }}>
                      <ConfigureIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              </Paper>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  )
}

export default IntegrationsBrowser

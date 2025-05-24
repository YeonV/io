import { Box, Paper, Typography } from '@mui/material'
import LogViewer from '../LogViewer/LogViwer'
import { useMainStore } from '@/store/mainStore'

const SettingsHistory = () => {
  const rowHistory = useMainStore((state) => state.rowHistory)
  return (
    <Paper sx={{ p: 0, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
      {/* Adjust height as needed */}
      <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
        Row Trigger History
      </Typography>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Ensure LogViewer can take full height */}
        <LogViewer
          entries={rowHistory}
          maxHeight="100%" // Take full height of its container
          defaultExpandedId={rowHistory[0]?.id} // Expand newest by default
          showLevelFilter={true}
          showSearchFilter={true}
          showExportButton={true}
          emptyStateMessage="No row trigger history yet."
        />
      </Box>
    </Paper>
  )
}

export default SettingsHistory

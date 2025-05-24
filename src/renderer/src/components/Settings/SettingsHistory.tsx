import { Box, Paper, Typography } from '@mui/material'
import LogViewer from '../LogViewer/LogViwer'
import { useMainStore } from '@/store/mainStore'

const SettingsHistory = () => {
  const rowHistory = useMainStore((state) => state.rowHistory)
  const clearRowHistoryAction = () => {
    // Define the action clearly
    if (
      window.confirm(
        'Are you sure you want to clear all row trigger history? This cannot be undone.'
      )
    ) {
      useMainStore.setState({ rowHistory: [] }, false, 'clearRowHistory/SettingsHistory')
      // enqueueSnackbar('Row history cleared.', { variant: 'success' }); // If you have snackbar here
      alert('Row history cleared.') // Simple alert for now
    }
  }
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
          showClearButton={true}
          onClear={clearRowHistoryAction}
          emptyStateMessage="No row trigger history yet."
        />
      </Box>
    </Paper>
  )
}

export default SettingsHistory

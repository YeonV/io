import { Box, Paper, Typography } from '@mui/material'
import LogViewer from '../LogViewer/LogViwer'
import { useMainStore } from '@/store/mainStore'
import ConfirmDialog from '../utils/ConfirmDialog';
import InfoDialog from '../utils/InfoDialog';
import { useState } from 'react';

const SettingsHistory = () => {
  const rowHistory = useMainStore((state) => state.rowHistory)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogTitle, setConfirmDialogTitle] = useState('');
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogTitle, setInfoDialogTitle] = useState('');
  const [infoDialogMessage, setInfoDialogMessage] = useState('');

  const showInfoDialog = (title: string, message: string) => {
    setInfoDialogTitle(title);
    setInfoDialogMessage(message);
    setInfoDialogOpen(true);
  };

  const clearRowHistoryAction = () => {
    setConfirmDialogTitle('Clear History');
    setConfirmDialogMessage(
      'Are you sure you want to clear all row trigger history? This cannot be undone.'
    );
    setConfirmAction(() => () => {
      useMainStore.setState({ rowHistory: [] }, false, 'clearRowHistory/SettingsHistory');
      // Replace the alert with InfoDialog
      showInfoDialog('History Cleared', 'Row trigger history has been cleared.');
    });
    setConfirmDialogOpen(true);
  };
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
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setConfirmAction(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
          setConfirmDialogOpen(false);
          setConfirmAction(null);
        }}
        title={confirmDialogTitle}
        message={confirmDialogMessage}
      />
      <InfoDialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        title={infoDialogTitle}
        message={infoDialogMessage}
      />
    </Paper>
  )
}

export default SettingsHistory

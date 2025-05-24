import { ReactNode } from 'react'
import { LogLevel } from './LogViewer.types'
import {
  InfoOutlined as InfoIcon,
  WarningAmberOutlined as WarningIcon,
  ErrorOutline as ErrorIcon,
  CheckCircleOutline as SuccessIcon,
  BugReportOutlined as DebugIcon,
  NotesOutlined as VerboseIcon,
  DataObject as DataObjectIcon
} from '@mui/icons-material'

export const getLogLevelIcon = (level?: LogLevel): ReactNode => {
  /* ... (same as before) ... */
  switch (level?.toLowerCase()) {
    case 'info':
      return <InfoIcon fontSize="inherit" color="info" />
    case 'warn':
    case 'warning':
      return <WarningIcon fontSize="inherit" color="warning" />
    case 'error':
      return <ErrorIcon fontSize="inherit" color="error" />
    case 'success':
      return <SuccessIcon fontSize="inherit" color="success" />
    case 'debug':
      return <DebugIcon fontSize="inherit" sx={{ color: 'grey.500' }} />
    case 'verbose':
      return <VerboseIcon fontSize="inherit" sx={{ color: 'grey.400' }} />
    default:
      return <DataObjectIcon fontSize="inherit" color="disabled" />
  }
}
export const getLogLevelChipColor = (
  level?: LogLevel
): 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | undefined => {
  /* ... (same as before) ... */
  switch (level?.toLowerCase()) {
    case 'info':
      return 'info'
    case 'warn':
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'success':
      return 'success'
    default:
      return undefined
  }
}

// All possible log levels you want to offer in the filter (can be dynamic from entries too)
export const ALL_POSSIBLE_LEVELS: LogLevel[] = [
  'error',
  'warn',
  'warning',
  'success',
  'info',
  'debug',
  'verbose'
]

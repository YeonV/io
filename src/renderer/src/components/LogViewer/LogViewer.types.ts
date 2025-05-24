// src/renderer/src/components/LogViewer/LogViewer.types.ts
import type { ReactNode } from 'react'

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug' | 'verbose' | string // Allow custom string levels

export interface LogEntry {
  id: string // For React key, ensure it's unique per list
  timestamp: number // Unix timestamp (milliseconds) for easier sorting & consistent formatting
  level?: LogLevel
  icon?: string // Optional explicit MUI icon name or custom IoIcon name
  summary: string // Text shown when accordion is collapsed
  source?: string // Optional: e.g., "REST Module", "MQTT Input", "System"
  details?: string | object | ReactNode // Content for expanded view
}

export interface LogViewerProps {
  entries: LogEntry[]
  title?: string
  maxHeight?: string | number
  defaultExpandedId?: string | null
  emptyStateMessage?: string
  showExportButton?: boolean
  showLevelFilter?: boolean
  showSearchFilter?: boolean
}

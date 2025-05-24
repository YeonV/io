// src/renderer/src/components/LogViewer/LogViewer.tsx
import type { FC, ReactNode } from 'react'
import { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
  TextField,
  InputAdornment,
  SelectChangeEvent
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Search as SearchIcon
} from '@mui/icons-material'
import type { LogLevel, LogViewerProps } from './LogViewer.types'
import dayjs from 'dayjs'
import IoIcon from '@/components/IoIcon/IoIcon'
import { ALL_POSSIBLE_LEVELS, getLogLevelChipColor, getLogLevelIcon } from './LogViewer.helper'

export const LogViewer: FC<LogViewerProps> = ({
  entries,
  title,
  maxHeight = '600px',
  defaultExpandedId = null,
  emptyStateMessage = 'No entries to display.',
  showExportButton = true,
  showLevelFilter = true
}) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(
    defaultExpandedId || false
  )
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const availableLevels = useMemo(() => {
    const levelsFromEntries = new Set(entries.map((e) => e.level).filter(Boolean) as LogLevel[])

    return Array.from(new Set([...ALL_POSSIBLE_LEVELS, ...levelsFromEntries])).sort()
  }, [entries])

  useEffect(() => {
    setSelectedLevels(availableLevels)
  }, [availableLevels])

  const handleChange = (panelId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panelId : false)
  }

  const handleExport = () => {
    const entriesToExport = filteredAndSortedEntries
    if (entriesToExport.length === 0) {
      alert('No entries to export (filter might be active).')
      return
    }
    try {
      const jsonString = JSON.stringify(entriesToExport, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.download = `${title?.replace(/\s+/g, '_').toLowerCase() || 'log_export'}_${dayjs().format('YYYYMMDD_HHmmss')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting log entries:', error)
      alert('Failed to export log entries.')
    }
  }

  const handleLevelFilterChange = (event: SelectChangeEvent<LogLevel[]>) => {
    const {
      target: { value }
    } = event
    setSelectedLevels(
      typeof value === 'string' ? (value.split(',') as LogLevel[]) : (value as LogLevel[])
    )
  }

  const filteredAndSortedEntries = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase()

    const levelFiltered =
      selectedLevels.length === 0 && availableLevels.length > 0
        ? []
        : entries.filter((entry) => !entry.level || selectedLevels.includes(entry.level))

    const searchFiltered =
      lowerSearchTerm.trim() === ''
        ? levelFiltered
        : levelFiltered.filter((entry) => {
            if (entry.summary.toLowerCase().includes(lowerSearchTerm)) return true
            if (entry.source && entry.source.toLowerCase().includes(lowerSearchTerm)) return true
            if (entry.details) {
              if (
                typeof entry.details === 'string' &&
                entry.details.toLowerCase().includes(lowerSearchTerm)
              )
                return true
              if (typeof entry.details === 'object') {
                try {
                  if (JSON.stringify(entry.details).toLowerCase().includes(lowerSearchTerm))
                    return true
                } catch {
                  /* ignore stringify errors for search */
                }
              }
            }
            return false
          })

    return [...searchFiltered].sort((a, b) => b.timestamp - a.timestamp)
  }, [entries, selectedLevels, availableLevels, searchTerm])

  return (
    <Paper
      variant="outlined"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
    >
      {(title || showExportButton || showLevelFilter) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          sx={{
            p: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'action.focus',
            flexShrink: 0
          }}
        >
          {title && (
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mr: 'auto' }}>
              {title}
            </Typography>
          )}
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 180, maxWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
          {showLevelFilter && availableLevels.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 150, maxWidth: 250 }}>
              <InputLabel id="log-level-filter-label">Level Filter</InputLabel>
              <Select
                labelId="log-level-filter-label"
                id="log-level-filter-select"
                multiple
                value={selectedLevels}
                onChange={handleLevelFilterChange}
                input={<OutlinedInput label="Level Filter" />}
                renderValue={(selected) => {
                  const s = selected as LogLevel[]
                  if (s.length === 0) return <em>Nothing selected</em>
                  if (s.length === availableLevels.length) return 'All levels'
                  return `${s.length} level(s) selected`
                }}
                MenuProps={{ PaperProps: { style: { maxHeight: 224, width: 250 } } }}
              >
                {availableLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    <Checkbox checked={selectedLevels.indexOf(level) > -1} size="small" />
                    <ListItemText primary={level.charAt(0).toUpperCase() + level.slice(1)} />
                    <Box sx={{ ml: 'auto' }}>{getLogLevelIcon(level)}</Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {showExportButton && entries.length > 0 && (
            <Tooltip title="Export displayed entries to JSON">
              <IconButton onClick={handleExport} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}

      <Box
        sx={{
          overflowY: 'auto',
          maxHeight: maxHeight,
          flexGrow: 1,
          p: filteredAndSortedEntries.length > 0 ? 1 : 0
        }}
      >
        {filteredAndSortedEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 3 }}>
            {emptyStateMessage}{' '}
            {selectedLevels.length > 0 && entries.length > 0
              ? '(No entries match current filter)'
              : ''}
          </Typography>
        ) : (
          filteredAndSortedEntries.map((entry) => (
            <Accordion
              key={entry.id}
              expanded={expandedAccordion === entry.id}
              onChange={handleChange(entry.id)}
              TransitionProps={{ unmountOnExit: true }}
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-of-type': { borderBottom: 0 }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`log-entry-${entry.id}-content`}
                id={`log-entry-${entry.id}-header`}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    gap: 1,
                    width: 'calc(100% - 24px)',
                    display: 'flex'
                  },
                  py: 0,
                  minHeight: '40px',
                  '&.Mui-expanded': { minHeight: '40px' }
                }}
              >
                {/* Column 1: Icon */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.secondary',
                    fontSize: '1rem',
                    width: 28,
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {entry.icon ? (
                    <IoIcon name={entry.icon} style={{ fontSize: '1.1em' }} />
                  ) : (
                    getLogLevelIcon(entry.level)
                  )}
                </Box>
                {/* Column 2: Timestamp */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: '130px', flexShrink: 0, textAlign: 'left' }}
                >
                  {dayjs(entry.timestamp).format('YYYY-MM-DD HH:mm:ss')}{' '}
                  {/* Removed .SSS for brevity */}
                </Typography>
                {/* Column 3: Source (Conditional) */}
                <Box sx={{ width: '100px', flexShrink: 0, textAlign: 'left', overflow: 'hidden' }}>
                  {entry.source && (
                    <Chip
                      component="div"
                      label={entry.source}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: '20px',
                        fontSize: '0.65rem',
                        cursor: 'default',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        maxWidth: '100%'
                      }}
                      title={entry.source}
                    />
                  )}
                </Box>
                {/* Column 4: Summary (Flexible) */}
                <Typography
                  variant="body2"
                  component="div"
                  noWrap
                  sx={{
                    flexGrow: 1,
                    fontWeight: expandedAccordion === entry.id ? 'medium' : 'normal',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    pr: 1
                  }}
                >
                  {entry.summary}
                </Typography>
                {/* Column 5: Level Chip (Conditional) */}
                <Box sx={{ width: '75px', flexShrink: 0, textAlign: 'right', mr: 1 }}>
                  {entry.level && getLogLevelChipColor(entry.level) && (
                    <Chip
                      component="div"
                      label={entry.level.toUpperCase()}
                      size="small"
                      color={getLogLevelChipColor(entry.level)}
                      sx={{
                        height: '20px',
                        fontSize: '0.65rem',
                        fontWeight: 'medium',
                        cursor: 'default'
                      }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{ bgcolor: 'action.hover', p: 1.5, borderTop: 1, borderColor: 'divider' }}
              >
                {typeof entry.details === 'string' && (
                  <Typography
                    component="pre"
                    variant="body2"
                    sx={{
                      textAlign: 'left',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem'
                    }}
                  >
                    {entry.details}
                  </Typography>
                )}
                {typeof entry.details === 'object' &&
                  entry.details !== null &&
                  !Object.prototype.hasOwnProperty.call(entry.details, '$$typeof') && (
                    <Typography
                      component="pre"
                      variant="body2"
                      sx={{
                        textAlign: 'left',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem'
                      }}
                    >
                      {JSON.stringify(entry.details, null, 2)}
                    </Typography>
                  )}
                {typeof entry.details === 'object' &&
                  entry.details !== null &&
                  Object.prototype.hasOwnProperty.call(entry.details, '$$typeof') &&
                  (entry.details as ReactNode)}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    </Paper>
  )
}

export default LogViewer

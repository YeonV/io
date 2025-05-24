import type { FC, ReactNode } from 'react'
import type { LogLevel, LogViewerProps } from './LogViewer.types'
import { useState, useMemo, useEffect } from 'react'
import { ALL_POSSIBLE_LEVELS, getLogLevelChipColor, getLogLevelIcon } from './LogViewer.helper'
import dayjs from 'dayjs'
import IoIcon from '@/components/IoIcon/IoIcon'
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
  InputAdornment
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  ClearAll
} from '@mui/icons-material'
import CopyButton from '../CopyButton'

/**
 * LogViewer component to display log entries in an expandable accordion format.
 * It allows filtering by log level and searching through entries.
 * It also provides an option to export the displayed entries as a JSON file.
 * @param entries - Array of log entries to display.
 * @param title - Optional title for the log viewer.
 * @param maxHeight - Maximum height for the log viewer.
 * @param defaultExpandedId - ID of the entry to be expanded by default.
 * @param emptyStateMessage - Message to display when there are no entries.
 * @param showExportButton - Whether to show the export button.
 * @param showLevelFilter - Whether to show the log level filter.
 * @param showSearchFilter - Whether to show the search filter.
 * @returns JSX.Element
 */
export const LogViewer: FC<LogViewerProps> = ({
  entries,
  title,
  maxHeight = '600px',
  defaultExpandedId = null,
  emptyStateMessage = 'No entries to display.',
  showExportButton = true,
  showLevelFilter = true,
  showSearchFilter = true,
  showClearButton = false,
  onClear
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

  const handleChange = (panelId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) =>
    setExpandedAccordion(isExpanded ? panelId : false)

  const handleExport = () => {
    const entriesToExport = filteredAndSortedEntries
    if (entriesToExport.length === 0) {
      alert('No entries to export.')
      return
    }
    try {
      const jsonString = JSON.stringify(entriesToExport, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
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
  const handleLevelFilterChange = (event: any) => {
    const {
      target: { value }
    } = event
    setSelectedLevels(
      typeof value === 'string' ? (value.split(',') as LogLevel[]) : (value as LogLevel[])
    )
  }

  const filteredAndSortedEntries = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim()

    const levelFiltered =
      selectedLevels.length === 0 && availableLevels.length > 0
        ? []
        : entries.filter((entry) => !entry.level || selectedLevels.includes(entry.level))

    const searchFiltered =
      lowerSearchTerm === ''
        ? levelFiltered
        : levelFiltered.filter(
            (entry) =>
              entry.summary?.toLowerCase().includes(lowerSearchTerm) ||
              entry.source?.toLowerCase().includes(lowerSearchTerm) ||
              (typeof entry.details === 'string' &&
                entry.details.toLowerCase().includes(lowerSearchTerm)) ||
              (typeof entry.details === 'object' &&
                entry.details !== null &&
                JSON.stringify(entry.details).toLowerCase().includes(lowerSearchTerm))
          )

    return [...searchFiltered].sort((a, b) => b.timestamp - a.timestamp)
  }, [entries, selectedLevels, availableLevels, searchTerm])

  return (
    <Paper
      variant="outlined"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
    >
      {(title ||
        showExportButton ||
        showLevelFilter ||
        showSearchFilter ||
        (showClearButton && entries.length > 0)) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1.5}
          sx={{
            p: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0
          }}
        >
          {title && (
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 'medium', flexGrow: 1, textAlign: 'left' }}
            >
              {title}
            </Typography>
          )}

          {showSearchFilter && (
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 150, flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          )}

          {showLevelFilter && availableLevels.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 130, maxWidth: 180 }}>
              <InputLabel id="log-level-filter-label">Level</InputLabel>
              <Select
                labelId="log-level-filter-label"
                id="log-level-filter-select"
                multiple
                value={selectedLevels}
                onChange={handleLevelFilterChange}
                input={<OutlinedInput label="Level" notched={selectedLevels.length > 0} />}
                renderValue={(selected) => {
                  const s = selected as LogLevel[]
                  if (s.length === 0 && availableLevels.length > 0) return <em>None</em>
                  if (s.length === availableLevels.length) return 'All'
                  if (s.length === 1) {
                    const levelName = s[0]
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '1em',
                            mr: 0.5,
                            opacity: 0.8
                          }}
                        >
                          {getLogLevelIcon(levelName)}
                        </Box>
                        {levelName.charAt(0).toUpperCase() + levelName.slice(1)}
                      </Box>
                    )
                  }
                  return `${s.length} Levels`
                }}
                MenuProps={{ PaperProps: { style: { maxHeight: 240, width: 200 } } }}
              >
                {availableLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    <Checkbox checked={selectedLevels.indexOf(level) > -1} size="small" />
                    <ListItemText primary={level.charAt(0).toUpperCase() + level.slice(1)} />
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                      {getLogLevelIcon(level)}
                    </Box>
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
          {showClearButton &&
            entries.length > 0 &&
            onClear && ( // <<< NEW CLEAR BUTTON
              <Tooltip title="Clear All Log Entries">
                <IconButton onClick={onClear} size="small" color="error">
                  <ClearAll />
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
          p: filteredAndSortedEntries.length > 0 ? { xs: 0.5, sm: 1 } : 0
        }}
      >
        {filteredAndSortedEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 3 }}>
            {emptyStateMessage}
            {(selectedLevels.length > 0 || searchTerm) && entries.length > 0
              ? '(No entries match current filters)'
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
                    width: '100%',
                    display: 'flex',
                    pr: 0.5
                  },
                  py: 0,
                  px: { xs: 1, sm: 1.5 },
                  minHeight: '40px',
                  '&.Mui-expanded': { minHeight: '40px' }
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.secondary',
                    fontSize: '1rem',
                    width: 24,
                    justifyContent: 'center',
                    flexShrink: 0,
                    mr: 0.5
                  }}
                >
                  {entry.icon ? (
                    <IoIcon name={entry.icon} style={{ fontSize: '1.1em' }} />
                  ) : (
                    getLogLevelIcon(entry.level)
                  )}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: '120px', flexShrink: 0, textAlign: 'left', fontSize: '0.7rem' }}
                >
                  {dayjs(entry.timestamp).format('YY-MM-DD HH:mm:ss')}
                </Typography>
                <Box
                  sx={{
                    width: '90px',
                    flexShrink: 0,
                    textAlign: 'left',
                    overflow: 'hidden',
                    mr: 0.5
                  }}
                >
                  {entry.source && (
                    <Chip
                      component="div"
                      label={entry.source}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: '18px',
                        fontSize: '0.6rem',
                        cursor: 'default',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        maxWidth: '100%',
                        p: '0 4px'
                      }}
                      title={entry.source}
                    />
                  )}
                </Box>
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
                    fontSize: '0.8rem'
                  }}
                >
                  {entry.summary}
                </Typography>
                <Box
                  sx={{
                    width: '75px',
                    flexShrink: 0,
                    textAlign: 'right',
                    mr: 0.5
                  }}
                >
                  {entry.level && getLogLevelChipColor(entry.level) && (
                    <Chip
                      component="div"
                      label={entry.level.toUpperCase()}
                      size="small"
                      color={getLogLevelChipColor(entry.level)}
                      sx={{
                        height: '18px',
                        fontSize: '0.6rem',
                        fontWeight: 'medium',
                        cursor: 'default',
                        p: '0 4px'
                      }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  bgcolor: 'action.hover',
                  p: 1.5,
                  borderTop: 1,
                  borderColor: 'divider',
                  position: 'relative'
                }}
              >
                <CopyButton
                  valueToCopy={
                    typeof entry.details === 'string'
                      ? entry.details
                      : typeof entry.details === 'object' && entry.details !== null
                        ? JSON.stringify(entry.details, null, 2)
                        : `Log Entry Summary: ${entry.summary}\nTimestamp: ${dayjs(entry.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}`
                  }
                />
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

// src/renderer/src/modules/Time/Time.tsx

import type { FC } from 'react'
import { useEffect } from 'react'
import { useMainStore } from '@/store/mainStore'
import type { ModuleConfig, InputData } from '@shared/types'
import {
  Box,
  Typography,
  // FormGroup, // No longer needed for days
  // FormControlLabel, // No longer needed for days
  // Checkbox, // No longer needed for days
  Paper,
  Stack,
  // Button, // Not used in InputEdit
  FormControl, // NEW
  InputLabel, // NEW
  Select, // NEW
  MenuItem, // NEW
  OutlinedInput, // NEW (optional, for better label behavior with Select)
  Chip, // NEW (optional, for displaying selected days in the Select)
  SelectChangeEvent,
  Tabs,
  Tab,
  FormHelperText,
  Tooltip
} from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs, { Dayjs } from 'dayjs'
import { AccessTime, CalendarMonth, EventRepeat, LooksOne } from '@mui/icons-material'
import DisplayButtons from '@/components/Row/DisplayButtons'
import type { DayOfWeek, TimeInputData, TimeModuleCustomConfig } from './Time.types'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'

const ipcRenderer = window.electron?.ipcRenderer || false // Get ipcRenderer once at module scope

// --- Module Definition ---
export const id = 'time-module'

export const moduleConfig: ModuleConfig<TimeModuleCustomConfig> = {
  menuLabel: 'Time & Schedule',
  description: 'Trigger actions based on time or schedule (recurring or one-shot).',
  inputs: [{ icon: 'schedule', name: 'Time Trigger', editable: true }],
  outputs: [],
  config: {
    enabled: true
  }
}

const ALL_DAYS_ORDERED: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// --- InputEdit Component ---
export const InputEdit: FC<{
  input: InputData
  onChange: (data: Partial<TimeInputData>) => void
}> = ({ input, onChange }) => {
  const currentData = input.data as Partial<TimeInputData>
  // Default to 'recurring' if undefined
  const isRecurringMode = currentData.recurring === undefined ? true : currentData.recurring

  // State for TimePicker (recurring)
  const recurringTimeValue: Dayjs | null = currentData.triggerTime
    ? dayjs(currentData.triggerTime, 'HH:mm')
    : null

  // State for DateTimePicker (one-shot)
  const oneShotDateTimeValue: Dayjs | null = currentData.oneShotDateTime
    ? dayjs(currentData.oneShotDateTime) // Dayjs can parse ISO strings
    : null

  const handleModeChange = (_event: React.SyntheticEvent, newMode: 'recurring' | 'one-shot') => {
    const newRecurringState = newMode === 'recurring'
    if (newRecurringState) {
      // When switching to recurring, clear oneShotDateTime and ensure defaults for recurring
      onChange({
        recurring: true,
        oneShotDateTime: undefined, // Clear one-shot specific field
        triggerTime: currentData.triggerTime || '12:00', // Keep or default recurring time
        daysOfWeek: currentData.daysOfWeek || [] // Keep or default days
      })
    } else {
      // When switching to one-shot, clear recurring specific fields (daysOfWeek)
      // and set a default oneShotDateTime if none exists
      onChange({
        recurring: false,
        daysOfWeek: undefined, // Clear recurring specific field
        triggerTime: undefined, // Clear recurring specific field (or keep if desired for default time in one-shot)
        oneShotDateTime: currentData.oneShotDateTime || dayjs().add(1, 'hour').toISOString() // Default to 1 hour from now
      })
    }
  }

  const handleRecurringTimeChange = (newValue: Dayjs | null) => {
    onChange({ triggerTime: newValue ? newValue.format('HH:mm') : undefined })
  }

  const handleDaysChange = (event: SelectChangeEvent<DayOfWeek[]>) => {
    const {
      target: { value }
    } = event
    const selectedDays = typeof value === 'string' ? (value.split(',') as DayOfWeek[]) : value
    const sortedSelectedDays = ALL_DAYS_ORDERED.filter((day) => selectedDays.includes(day))
    onChange({ daysOfWeek: sortedSelectedDays })
  }

  // src/renderer/src/modules/Time/Time.tsx

  // src/renderer/src/modules/Time/Time.tsx

  const handleOneShotDateTimeChange = (newValue: Dayjs | null) => {
    if (newValue) {
      // console.debug(
      //   `TimeInputEdit: DateTimePicker value changed. Raw newValue (Dayjs object):`,
      //   newValue
      // )
      // console.debug(`TimeInputEdit:   newValue.toString(): ${newValue.toString()}`) // Shows local time with offset

      const normalizedDateTime = newValue.second(0).millisecond(0)
      // console.debug(
      //   `TimeInputEdit:   Normalized (Dayjs object, secs/ms set to 0):`,
      //   normalizedDateTime
      // )
      // console.debug(
      //   `TimeInputEdit:   normalizedDateTime.toString(): ${normalizedDateTime.toString()}`
      // )

      const isoToSave = normalizedDateTime.toISOString()
      // console.debug(`TimeInputEdit:   ISO string to be saved: ${isoToSave}`)

      onChange({ oneShotDateTime: isoToSave })
    } else {
      console.debug(`TimeInputEdit: DateTimePicker value cleared.`)
      onChange({ oneShotDateTime: undefined })
    }
  }
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper
        elevation={0}
        sx={{ p: 2, pt: 0, mt: '16px', border: '1px solid #666', borderRadius: 1 }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={isRecurringMode ? 'recurring' : 'one-shot'}
            onChange={handleModeChange}
            aria-label="Trigger mode tabs"
            variant="fullWidth"
          >
            <Tab
              label="Recurring"
              value="recurring"
              icon={<EventRepeat />}
              iconPosition="start"
              sx={{ pt: 0, pb: 0, minHeight: 55 }}
            />
            <Tab
              label="One-Time"
              value="one-shot"
              icon={<LooksOne />}
              iconPosition="start"
              sx={{ pt: 0, pb: 0, minHeight: 55 }}
            />
          </Tabs>
        </Box>

        {isRecurringMode && (
          <Stack spacing={2} key="recurring-settings">
            <TimePicker
              label="Trigger Time Daily"
              value={recurringTimeValue}
              onChange={handleRecurringTimeChange}
              ampm={false}
            />
            <FormControl fullWidth size="small">
              <InputLabel id={`time-module-days-select-label-${input.name}`}>
                Days of the Week
              </InputLabel>
              <Select
                labelId={`time-module-days-select-label-${input.name}`}
                multiple
                value={currentData.daysOfWeek || []}
                onChange={handleDaysChange}
                input={<OutlinedInput label="Days of the Week" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as DayOfWeek[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                MenuProps={{ PaperProps: { style: { maxHeight: 224 } } }}
              >
                {ALL_DAYS_ORDERED.map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
              {(!currentData.daysOfWeek || currentData.daysOfWeek.length === 0) && (
                <FormHelperText sx={{ ml: 1.75 }}>
                  Select at least one day for recurring trigger.
                </FormHelperText>
              )}
            </FormControl>
          </Stack>
        )}

        {!isRecurringMode && (
          <Stack spacing={2} key="one-shot-settings">
            <DateTimePicker
              label="Specific Date and Time"
              value={oneShotDateTimeValue}
              onChange={handleOneShotDateTimeChange}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
              ampm={false} // Or true if you prefer AM/PM for one-shot
              minDateTime={dayjs()} // Optional: prevent selecting past date/times
            />
            <Typography variant="caption" color="textSecondary">
              The trigger will fire once at the specified date and time.
            </Typography>
          </Stack>
        )}
      </Paper>
    </LocalizationProvider>
  )
}

// --- InputDisplay Component ---
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const data = input.data as TimeInputData

  let daysOrDateDisplay = 'No days/date set'
  let timeToDisplay = 'Not set'
  const isRecurring = data.recurring === undefined || data.recurring

  if (isRecurring) {
    // RECURRING
    timeToDisplay = data.triggerTime ? dayjs(data.triggerTime, 'HH:mm').format('HH:mm') : 'Not set'
    if (data.daysOfWeek && data.daysOfWeek.length > 0) {
      if (data.daysOfWeek.length === 7) {
        daysOrDateDisplay = 'Every Day'
      } else {
        const sortedDays = [...data.daysOfWeek].sort(
          (a, b) => ALL_DAYS_ORDERED.indexOf(a) - ALL_DAYS_ORDERED.indexOf(b)
        )
        daysOrDateDisplay = sortedDays.join(', ')
      }
    } else {
      daysOrDateDisplay = 'No days selected'
    }
  } else {
    // ONE-SHOT
    if (data.oneShotDateTime) {
      const oneShotDate = dayjs(data.oneShotDateTime)
      daysOrDateDisplay = oneShotDate.format('ddd, MMM D, YYYY')
      timeToDisplay = oneShotDate.format('HH:mm') // Extract time from oneShotDateTime
    } else {
      daysOrDateDisplay = 'Specific date not set'
      // timeToDisplay remains 'Not set'
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons data={{ ...input, name: 'Time' }} />
      <Stack sx={{ textAlign: 'left', flexGrow: 1, overflow: 'hidden' }}>
        <Typography variant="body2" noWrap title={`Time: ${timeToDisplay}`}>
          <AccessTime sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} /> {timeToDisplay}
        </Typography>
        <Typography
          variant="caption"
          color="textSecondary"
          noWrap
          title={`Schedule: ${daysOrDateDisplay}`} // Removed recurrence text from here
          sx={{ display: 'flex', alignItems: 'center' }} // Added for icon alignment
        >
          {isRecurring ? ( // Conditionally show EventRepeat icon
            <Tooltip title="Recurring">
              <EventRepeat sx={{ fontSize: '0.9rem', verticalAlign: 'text-bottom', mr: 1 }} />
            </Tooltip>
          ) : (
            <Tooltip title="One-Shot">
              <CalendarMonth sx={{ fontSize: '0.9rem', verticalAlign: 'text-bottom', mr: 1 }} />
            </Tooltip>
          )}
          {daysOrDateDisplay}
        </Typography>
      </Stack>
    </Box>
  )
}

// --- useGlobalActions (Renderer) ---
// This hook now listens for IPC from the main process Time module
// and dispatches the local event for the specific row.
export const useGlobalActions = () => {
  // Get the store action for disabling one-shot rows
  const toggleRowEnabledAction = useMainStore((state) => state.toggleRowEnabled)

  useEffect(() => {
    if (!ipcRenderer) {
      console.warn(`${id} Global: ipcRenderer not available. Cannot listen for time triggers.`)
      return
    }

    const timeTriggerListener = (_event: Electron.IpcRendererEvent, data: { rowId: string }) => {
      if (data.rowId) {
        console.debug(`${id} Global: IPC 'time-trigger-fired' received for Row ID: ${data.rowId}`)

        // Dispatch the local io_input event which output modules listen to
        window.dispatchEvent(new CustomEvent('io_input', { detail: { rowId: data.rowId } }))

        // Handle one-shot logic: if the row was configured as one-shot, disable it.
        // We need to get the row's current configuration from the store.
        const triggeredRow = useMainStore.getState().rows[data.rowId]
        if (triggeredRow) {
          const rowInputData = triggeredRow.input.data as Partial<TimeInputData>
          if (rowInputData.recurring === false) {
            // Check if it was configured as one-shot
            console.debug(
              `${id} Global: Row ${data.rowId} is one-shot and was triggered. Disabling.`
            )
            // toggleRowEnabledAction(data.rowId) // Use the action obtained from useMainStore
          }
        } else {
          console.warn(
            `${id} Global: Triggered row ${data.rowId} not found in store for one-shot check.`
          )
        }
      }
    }

    ipcRenderer.on('time-trigger-fired', timeTriggerListener)
    console.debug(`${id} Global: IPC listener for 'time-trigger-fired' attached.`)

    return () => {
      console.debug(`${id} Global: Cleaning up IPC listener for 'time-trigger-fired'.`)
      if (ipcRenderer) {
        ipcRenderer.removeListener('time-trigger-fired', timeTriggerListener)
      }
    }
    // Add toggleRowEnabledAction to dependency array as it's used.
    // ipcRenderer itself is stable, but good practice to include if it were from props/context.
  }, [toggleRowEnabledAction])

  return null // This global hook doesn't render anything
}

// No useInputActions needed as the trigger comes from main via IPC.
// No useOutputActions as this is an Input module.

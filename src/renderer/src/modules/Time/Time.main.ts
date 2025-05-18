// src/renderer/src/modules/Time/Time.main.ts
import type { IOMainModulePart, Row } from '../../../../shared/types'
import type { MainModuleDeps } from '../../../../main/moduleLoader'
import type { TimeInputData } from './Time.types'
import { dayMap } from './Time.types'

export const id = 'time-module'

let masterTimerInterval: NodeJS.Timeout | null = null
let moduleCurrentRowsState: Record<string, Row> = {}
let moduleCurrentActiveProfileInfo: MainModuleDeps['activeProfileInfo'] = {
  id: null,
  includedRowIds: null
}
let getMainWindowFunction: () => Electron.BrowserWindow | null = () => null

function checkTimeTriggers() {
  const currentTime = new Date()

  // Corrected Minute Boundary Check: Only proceed if seconds are 0.
  if (currentTime.getSeconds() !== 0) {
    return
  }

  // This log will now only appear once per minute, at the :00 second mark.
  console.debug(
    `Main (${id}): Minute boundary processing - ${currentTime.toISOString()} (Local: ${currentTime.toLocaleString()})`
  )
  const mainWindow = getMainWindowFunction()
  if (!mainWindow) {
    console.warn(`Main (${id}): checkTimeTriggers - Main window not available.`)
    return
  }

  const timeTriggerRows = Object.values(moduleCurrentRowsState).filter(
    (row) => row.inputModule === id
  )

  if (timeTriggerRows.length === 0) {
    // console.debug(`Main (${id}): No time-module rows to check.`);
    return
  }

  timeTriggerRows.forEach((row) => {
    const rowData = row.input.data as TimeInputData
    let isRowActive = row.enabled === undefined ? true : row.enabled

    if (
      moduleCurrentActiveProfileInfo.id !== null &&
      moduleCurrentActiveProfileInfo.includedRowIds
    ) {
      isRowActive = isRowActive && moduleCurrentActiveProfileInfo.includedRowIds.includes(row.id)
    }

    if (!isRowActive) {
      // console.debug(`Main (${id}): Row '${row.id}' (${row.input.name}) is not active. Skipping.`);
      return
    }

    let shouldFire = false
    const currentHours = currentTime.getHours()
    const currentMinutes = currentTime.getMinutes()

    if (rowData.recurring === undefined || rowData.recurring) {
      if (rowData.triggerTime && rowData.daysOfWeek && rowData.daysOfWeek.length > 0) {
        const [hours, minutes] = rowData.triggerTime.split(':').map(Number)
        const currentDayJS = currentTime.getDay()
        const selectedDaysNumeric = rowData.daysOfWeek.map((day) => dayMap[day])

        if (
          selectedDaysNumeric.includes(currentDayJS) &&
          currentHours === hours &&
          currentMinutes === minutes
        ) {
          shouldFire = true
          console.debug(
            `Main (${id}): Recurring match for row '${row.id}'. Target: ${rowData.triggerTime}, Days: ${rowData.daysOfWeek.join(',')}. Current: ${currentHours}:${currentMinutes}, Day: ${currentDayJS}`
          )
        }
      }
    } else {
      // ONE-SHOT LOGIC
      if (rowData.oneShotDateTime) {
        const triggerDateTime = new Date(rowData.oneShotDateTime) // Parses ISO string (usually to UTC, then methods convert to local)

        // Log values for debugging one-shot
        console.debug(`Main (${id}): One-Shot Check for row '${row.id}'...`)
        console.debug(
          `  Current Time (Local): Year=${currentTime.getFullYear()}, Month=${currentTime.getMonth()}, Date=${currentTime.getDate()}, Hour=${currentHours}, Min=${currentMinutes}`
        )
        console.debug(
          `  Trigger Time (Local from ISO '${rowData.oneShotDateTime}'): Year=${triggerDateTime.getFullYear()}, Month=${triggerDateTime.getMonth()}, Date=${triggerDateTime.getDate()}, Hour=${triggerDateTime.getHours()}, Min=${triggerDateTime.getMinutes()}`
        )

        if (
          triggerDateTime.getFullYear() === currentTime.getFullYear() &&
          triggerDateTime.getMonth() === currentTime.getMonth() && // Month is 0-indexed
          triggerDateTime.getDate() === currentTime.getDate() &&
          triggerDateTime.getHours() === currentHours && // Compare local hour from triggerDateTime with current local hour
          triggerDateTime.getMinutes() === currentMinutes // Compare local minute
        ) {
          shouldFire = true
          console.debug(
            `Main (${id}): One-shot DATE-TIME MATCH for row '${row.id}'. Target: ${rowData.oneShotDateTime}.`
          )
        }
      }
    }

    if (shouldFire) {
      console.log(
        // Changed to log from success for successful firing
        `Main (${id}): FIRING Row '${row.id}' (${row.input.name}). Condition met. Time: ${currentTime.toISOString()}`
      )
      mainWindow.webContents.send('time-trigger-fired', { rowId: row.id })
    }
  })
}

const timeMainModule: IOMainModulePart = {
  moduleId: id,

  initialize: (deps: MainModuleDeps) => {
    console.log(`Main (${id}): Initializing.`)
    getMainWindowFunction = deps.getMainWindow // Store the getter function
    moduleCurrentActiveProfileInfo = deps.activeProfileInfo
    const store = deps.getStore()
    if (store) {
      moduleCurrentRowsState = store.get('rows', {})
    }

    if (masterTimerInterval) {
      clearInterval(masterTimerInterval)
    }
    masterTimerInterval = setInterval(checkTimeTriggers, 1000) // Call without deps
    console.log(`Main (${id}): Master timer interval started.`)
  },

  onRowsUpdated: (rows: Record<string, Row>, deps: MainModuleDeps) => {
    console.log(
      `Main (${id}): Received rows update. Count: ${Object.keys(rows).length}. Profile: ${deps.activeProfileInfo.id}`
    )
    moduleCurrentRowsState = rows
    moduleCurrentActiveProfileInfo = deps.activeProfileInfo
    getMainWindowFunction = deps.getMainWindow // Refresh getter in case window changed (though unlikely for this)
  },

  cleanup: () => {
    console.log(`Main (${id}): Cleaning up. Stopping master timer interval.`)
    if (masterTimerInterval) {
      clearInterval(masterTimerInterval)
      masterTimerInterval = null
    }
  }
}

export default timeMainModule

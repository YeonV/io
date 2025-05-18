// src/renderer/src/pages/Home.tsx
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useMainStore } from '@/store/mainStore'
import { Box, Button } from '@mui/material'
import { Add } from '@mui/icons-material'
import IoRow from '@/components/Row/IoRow'
import IoNewRow, { PrefillData } from '@/components/Row/IoNewRow'
import Wrapper from '@/components/utils/Wrapper'
import { log } from '@/utils'
import type { ModuleId, OutputData, Row } from '@shared/types'
import { moduleImplementations, ModuleImplementationMap } from '@/modules/moduleRegistry'
import ProfileManagerSettings from '@/components/Settings/ProfileManagerSettings'

const ipcRenderer = window.electron?.ipcRenderer || false

const ModuleGlobalActionsRunner: FC<{ moduleId: ModuleId }> = ({ moduleId }) => {
  const hook = (moduleImplementations[moduleId as keyof ModuleImplementationMap] as any)
    ?.useGlobalActions
  if (hook) {
    hook()
  }
  return null
}

const Home: FC = () => {
  const showAddRow = useMainStore((state) => state.edit)
  const setEditState = useMainStore((state) => state.setEdit)
  const [prefillData, setPrefillData] = useState<PrefillData | undefined>(undefined)
  const [ioNewRowKey, setIoNewRowKey] = useState(0)

  const editRow = useMainStore((state) => state.editRow)

  const rows = useMainStore((state) => state.rows)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const profiles = useMainStore((state) => state.profiles)
  const setActiveProfile = useMainStore((state) => state.setActiveProfile)

  const rowsToDisplay = useMemo(() => {
    const allRowsArray = Object.values(rows)
    if (!activeProfileId) {
      console.log(
        "No profile active, display all rows (IoRow will handle opacity for its 'enabled' state)"
      )
      return allRowsArray
    }

    const activeProfile = profiles[activeProfileId]
    if (!activeProfile) {
      console.log(
        "Active profile ID set, but profile definition not found (shouldn't happen ideally)"
      )
      return allRowsArray // Fallback to showing all
    }
    console.log(
      'Profile is active, filter rows to only those included in the profile',
      activeProfile,
      rows
    )
    return allRowsArray.filter((row) => activeProfile.includedRowIds.includes(row.id))
  }, [rows, activeProfileId, profiles])
  const setDarkModeStoreAction = useMainStore((state) => state.setDarkMode)

  const handleAddNewRowClick = useCallback(() => {
    setPrefillData(undefined)
    setIoNewRowKey((prevKey) => prevKey + 1)
    setEditState(true)
  }, [setEditState])

  const startNewPrefilledRow = useCallback(
    async (prefill: PrefillData) => {
      console.debug('Home: Request to start new prefilled row:', prefill)
      if (showAddRow) {
        setEditState(false)
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      setPrefillData(prefill)
      setIoNewRowKey((prevKey) => prevKey + 1)
      setEditState(true)
    },
    [setEditState, showAddRow]
  )

  const handleAddRowComplete = useCallback(() => {
    setEditState(false)
    setPrefillData(undefined)
  }, [setEditState])

  // Initial dark mode fetch & console info
  useEffect(() => {
    if (ipcRenderer && useMainStore.getState().ui.darkMode === null) {
      const isSystemDark = ipcRenderer.sendSync('get-darkmode') === 'yes'
      if (setDarkModeStoreAction) setDarkModeStoreAction(isSystemDark)
    }
    console.info(
      '%c   IO  %c\n ReactApp by Blade ',
      'padding: 10px 40px; color: #ffffff; border-radius: 5px 5px 0 0; background-color: #123456;',
      'background: #fff; color: #123456; border-radius: 0 0 5px 5px;padding: 5px 0;'
    )
  }, [setDarkModeStoreAction])

  useEffect(() => {
    if (!ipcRenderer) return

    // --- Listener for general row triggering (e.g., from Keyboard.main.ts) ---
    const triggerRowListener = (_event: Electron.IpcRendererEvent, data: { id: string }) => {
      if (data.id) {
        console.debug(`Home: IPC 'trigger-row' received for ID: ${data.id}`)
        window.dispatchEvent(new CustomEvent('io_input', { detail: data.id }))
      }
    }

    // --- Listener for the OLD generic 'update-row' (if you still use this IPC elsewhere) ---
    // You might want to phase this out if 'deck-update-row-display' is more specific
    const legacyUpdateRowListener = (
      _event: Electron.IpcRendererEvent,
      data: { id: string; icon?: string; label?: string; settings?: any }
    ) => {
      if (data.id) {
        console.debug(`Home: IPC (legacy) 'update-row' received for ID: ${data.id}`, data)
        const updatesForOutput: Partial<Row['output']['settings']> = {} // Assuming icon/label go into settings
        const topLevelOutputUpdates: Partial<Pick<Row['output'], 'icon' | 'label'>> = {}

        // Decide where icon/label should live in Row.output
        // Option 1: In Row.output.settings (as in my previous suggestion for 'deck-update-row-display')
        if (data.icon !== undefined) updatesForOutput.icon = data.icon
        if (data.label !== undefined) updatesForOutput.label = data.label
        if (data.settings !== undefined) {
          // If old endpoint sends a whole settings object
          // Merge carefully, or decide if this path should only update icon/label from top-level data fields
          Object.assign(updatesForOutput, data.settings)
        }

        // Option 2: Directly on Row.output (if that's your model)
        // if (data.icon !== undefined) topLevelOutputUpdates.icon = data.icon;
        // if (data.label !== undefined) topLevelOutputUpdates.label = data.label;

        if (
          Object.keys(updatesForOutput).length > 0 ||
          Object.keys(topLevelOutputUpdates).length > 0
        ) {
          const currentRow = useMainStore.getState().rows[data.id]
          if (currentRow) {
            const newOutputData = { ...currentRow.output, ...topLevelOutputUpdates }
            if (Object.keys(updatesForOutput).length > 0) {
              newOutputData.settings = {
                ...(currentRow.output.settings || {}),
                ...updatesForOutput
              }
            }
            editRow(data.id, { output: newOutputData })
          }
        }
        // No need to ipcRenderer.send('set', ['rows', ...]) here;
        // the mainStore update will trigger the other useEffect that syncs 'rows'.
      } else {
        console.debug("Home: IPC (legacy) 'update-row' received without data.id", data)
      }
    }

    // --- NEW Listener for Deck-specific display updates (icon/label) ---
    const handleDeckUpdateRowDisplay = (
      _event: Electron.IpcRendererEvent,
      data: { rowId: string; icon?: string; label?: string } // 'label' from Deck's dialog
    ) => {
      log.info(`Home: IPC 'deck-update-row-display' received for row ${data.rowId}`, data)
      if (data.rowId) {
        const currentRow = useMainStore.getState().rows[data.rowId]
        if (currentRow) {
          const outputUpdatesForMainStore: Partial<Pick<OutputData, 'icon' | 'label'>> = {}

          if (data.icon !== undefined) {
            outputUpdatesForMainStore.icon = data.icon // Target row.output.icon
          }
          if (data.label !== undefined) {
            outputUpdatesForMainStore.label = data.label // Target row.output.label
          }

          if (Object.keys(outputUpdatesForMainStore).length > 0) {
            // Call editRowAction with updates directly for row.output
            editRow(data.rowId, {
              output: {
                ...currentRow.output, // Preserve other output fields like name, data, settings
                ...outputUpdatesForMainStore // Apply new icon and/or label
              }
            })
          }
        }
      }
    }

    ipcRenderer.on('trigger-row', triggerRowListener)
    ipcRenderer.on('update-row', legacyUpdateRowListener) // Keep if still used, or remove if deprecated
    ipcRenderer.on('deck-update-row-display', handleDeckUpdateRowDisplay) // ADD THIS

    console.debug(
      'Home: Core IPC listeners (trigger-row, update-row, deck-update-row-display) attached.'
    )

    return () => {
      console.debug('Home: Cleaning up core IPC listeners.')
      if (ipcRenderer) {
        ipcRenderer.removeListener('trigger-row', triggerRowListener)
        ipcRenderer.removeListener('update-row', legacyUpdateRowListener)
        ipcRenderer.removeListener('deck-update-row-display', handleDeckUpdateRowDisplay) // CLEANUP THIS
      }
    }
  }, [editRow]) // editRowAction is a dependency

  // --- This useEffect syncs 'rows' to main process whenever 'rows' state changes ---
  useEffect(() => {
    if (ipcRenderer) {
      console.debug(
        "Renderer (Home.tsx): 'rows' changed, sending to main via IPC 'set'. Row count:",
        Object.keys(rows).length
      )
      ipcRenderer.send('set', ['rows', rows])
    } else {
      console.warn("Renderer (Home.tsx): ipcRenderer not available, cannot send 'rows' update.")
    }
  }, [rows]) // This effect depends on 'rows' from useMainStore

  // --- This useEffect syncs 'activeProfileId' changes initiated by Deck/API ---
  useEffect(() => {
    if (!ipcRenderer) return
    const handleApiSetActiveProfile = (_event: any, profileId: string | null) => {
      console.debug(
        "Renderer: Received 'ipc-api-set-active-profile' from main, calling store action:",
        profileId
      )
      setActiveProfile(profileId) // This updates Zustand.
      // The mainStore's setActiveProfile action already sends IPC 'set' for 'activeProfileId'
      // and 'active-profile-changed-for-main'.
    }
    ipcRenderer.on('ipc-api-set-active-profile', handleApiSetActiveProfile)
    return () => {
      if (ipcRenderer) {
        // Check again in cleanup
        ipcRenderer.removeListener('ipc-api-set-active-profile', handleApiSetActiveProfile)
      }
    }
  }, [setActiveProfile])

  // --- Prepare data for rendering ---
  const usedModules = useMemo(
    (): ModuleId[] =>
      [...new Set(Object.values(rows).flatMap((r) => [r.inputModule, r.outputModule]))].filter(
        (moduleId): moduleId is ModuleId => !!moduleId
      ),
    [rows]
  )

  const SettingsWidgets = useMemo(
    () =>
      usedModules
        .map((modId) => {
          const ModuleSettingsFC = (
            moduleImplementations[modId as keyof ModuleImplementationMap] as any
          )?.Settings
          return ModuleSettingsFC ? <ModuleSettingsFC key={modId} /> : null
        })
        .filter((widget) => widget !== null),
    [usedModules]
  )

  return (
    <Wrapper>
      {usedModules.map((modId) => (
        <ModuleGlobalActionsRunner key={`${modId}-global`} moduleId={modId} />
      ))}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}
      >
        {rowsToDisplay.length > 0 && <ProfileManagerSettings key="profile-manager" />}
        {SettingsWidgets.length > 0 &&
          SettingsWidgets.map((widget, index) => (
            <div key={(widget as any)?.key || index} style={{ padding: '8px' }}>
              {widget}
            </div>
          ))}
      </div>

      <div style={{ maxHeight: 'calc(100vh - 356px)', overflowY: 'auto' }}>
        {rowsToDisplay.map((row) => (
          <IoRow key={row.id} row={row} />
        ))}
      </div>

      {!showAddRow ? (
        <Button
          variant="contained"
          onClick={handleAddNewRowClick}
          style={{ margin: '1rem auto', display: 'flex' }}
        >
          <Add /> Add New IO Row
        </Button>
      ) : (
        <Box sx={{ mt: 2, mb: 2 }}>
          <IoNewRow
            key={ioNewRowKey}
            onComplete={handleAddRowComplete}
            startNewPrefilledRow={startNewPrefilledRow}
            initialPrefill={prefillData}
          />
        </Box>
      )}
    </Wrapper>
  )
}

export default Home

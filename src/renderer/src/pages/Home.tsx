import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import InfoDialog from '@/components/utils/InfoDialog'
import { useMainStore } from '@/store/mainStore'
import { Box, Button, Collapse } from '@mui/material'
import { Add } from '@mui/icons-material'
import IoRow from '@/components/Row/IoRow'
import IoNewRow, { PrefillData } from '@/components/Row/IoNewRow'
import Wrapper from '@/components/utils/Wrapper'
import { log } from '@/utils'
import type { ModuleId, OutputData, Row } from '@shared/types'
import { moduleImplementations, ModuleImplementationMap } from '@/modules/moduleRegistry'
import {
  BlueprintDefinition,
  RestModuleCustomConfig,
  RestPresetDefinition,
  SimpleInputFieldValue
} from '@/modules/Rest/Rest.types'
// import { id as restModuleId } from '@/modules/Rest/Rest'
import { v4 as uuidv4 } from 'uuid'
import { BlueprintRunnerDialog } from '@/modules/Rest/components/BlueprintRunnerDialog'
import { LogEntry } from '@/components/LogViewer/LogViewer.types'

const restModuleId = 'rest-module' // Ensure this matches your actual module ID
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
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [infoDialogTitle, setInfoDialogTitle] = useState('')
  const [infoDialogMessage, setInfoDialogMessage] = useState('')

  const showInfoDialog = (title: string, message: string) => {
    setInfoDialogTitle(title)
    setInfoDialogMessage(message)
    setInfoDialogOpen(true)
  }

  const showAddRow = useMainStore((state) => state.edit)
  const setEditState = useMainStore((state) => state.setEdit)
  const [prefillData, setPrefillData] = useState<PrefillData | undefined>(undefined)
  const [ioNewRowKey, setIoNewRowKey] = useState(0)

  const editRow = useMainStore((state) => state.editRow)

  const rows = useMainStore((state) => state.rows)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const profiles = useMainStore((state) => state.profiles)
  const setActiveProfile = useMainStore((state) => state.setActiveProfile)
  const addRowHistoryEntry = useMainStore((state) => state.addRowHistoryEntry)
  const homeWidgetsVisibility = useMainStore((state) => state.ui.homeWidgets || {})

  const rowsToDisplay = useMemo(() => {
    const allRowsArray = Object.values(rows)
    if (!activeProfileId) {
      // console.log(
      //   "No profile active, display all rows (IoRow will handle opacity for its 'enabled' state)"
      // )
      return allRowsArray
    }

    const activeProfile = profiles[activeProfileId]
    if (!activeProfile) {
      // console.log(
      //   "Active profile ID set, but profile definition not found (shouldn't happen ideally)"
      // )
      return allRowsArray
    }
    // console.log(
    //   'Profile is active, filter rows to only those included in the profile',
    //   activeProfile,
    //   rows
    // )
    return allRowsArray.filter((row) => activeProfile.includedRowIds.includes(row.id))
  }, [rows, activeProfileId, profiles])

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

  const blueprintToRunFromDrop = useMainStore((state) => state.blueprintToRunFromDrop)
  const setBlueprintToRunFromDrop = useMainStore((state) => state.setBlueprintToRunFromDrop)

  const [isBlueprintRunnerOpen, setIsBlueprintRunnerOpen] = useState(false)
  const [blueprintForRunner, setBlueprintForRunner] = useState<BlueprintDefinition | null>(null)

  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  useEffect(() => {
    if (blueprintToRunFromDrop) {
      console.log('[Home.tsx] Detected blueprint to run from drop:', blueprintToRunFromDrop.name)
      setBlueprintForRunner(blueprintToRunFromDrop)
      setIsBlueprintRunnerOpen(true)

      setBlueprintToRunFromDrop(null)
    }
  }, [blueprintToRunFromDrop, setBlueprintToRunFromDrop])

  const handleBlueprintRunnerDialogClose = () => {
    setIsBlueprintRunnerOpen(false)
    setBlueprintForRunner(null)
  }

  const handleBlueprintApplyFromDrop = (
    generatedPresetConfig: Omit<RestPresetDefinition, 'id'>,
    _inputSnapshot: Record<string, SimpleInputFieldValue>,
    saveAsGlobalPreset: boolean
  ) => {
    if (saveAsGlobalPreset) {
      const newGlobalPreset: RestPresetDefinition = {
        ...generatedPresetConfig,
        id: uuidv4()
      }
      const currentGlobalPresets =
        (useMainStore.getState().modules[restModuleId]?.config as RestModuleCustomConfig)
          ?.presets || []
      setModuleConfig(restModuleId, 'presets', [...currentGlobalPresets, newGlobalPreset])

      showInfoDialog(
        'Preset Created',
        `Global REST Preset "${newGlobalPreset.name}" created from dropped Blueprint!`
      )
      console.log(
        `[Home.tsx] Global Preset "${newGlobalPreset.name}" created from dropped Blueprint.`
      )
    } else {
      showInfoDialog(
        'Blueprint Processed',
        `Blueprint "${blueprintForRunner?.name}" processed. Configuration generated but not saved as a global preset.`
      )
      console.log(
        `[Home.tsx] Blueprint "${blueprintForRunner?.name}" processed. Config:`,
        generatedPresetConfig
      )
    }
  }

  useEffect(() => {
    // if (ipcRenderer && useMainStore.getState().ui.darkMode === null) {
    //   const isSystemDark = ipcRenderer.sendSync('get-darkmode') === 'yes'
    //   if (setDarkModeStoreAction) setDarkModeStoreAction(isSystemDark)
    // }
    console.info(
      '%c   IO  %c\n ReactApp by Blade ',
      'padding: 10px 40px; color: #ffffff; border-radius: 5px 5px 0 0; background-color: #123456;',
      'background: #fff; color: #123456; border-radius: 0 0 5px 5px;padding: 5px 0;'
    )
  }, [])

  useEffect(() => {
    if (!ipcRenderer) return

    const triggerRowListener = (_event: Electron.IpcRendererEvent, data: { id: string }) => {
      if (data.id) {
        console.debug(`Home: IPC 'trigger-row' received for ID: ${data.id}`)
        window.dispatchEvent(new CustomEvent('io_input', { detail: { rowId: data.id } }))
      }
    }

    const legacyUpdateRowListener = (
      _event: Electron.IpcRendererEvent,
      data: { id: string; icon?: string; label?: string; settings?: any }
    ) => {
      if (data.id) {
        console.debug(`Home: IPC (legacy) 'update-row' received for ID: ${data.id}`, data)
        const updatesForOutput: Partial<Row['output']['settings']> = {}
        const topLevelOutputUpdates: Partial<Pick<Row['output'], 'icon' | 'label'>> = {}

        if (data.icon !== undefined) updatesForOutput.icon = data.icon
        if (data.label !== undefined) updatesForOutput.label = data.label
        if (data.settings !== undefined) {
          Object.assign(updatesForOutput, data.settings)
        }

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
      } else {
        console.debug("Home: IPC (legacy) 'update-row' received without data.id", data)
      }
    }

    const handleDeckUpdateRowDisplay = (
      _event: Electron.IpcRendererEvent,
      data: { rowId: string; icon?: string; label?: string }
    ) => {
      log.info(`Home: IPC 'deck-update-row-display' received for row ${data.rowId}`, data)
      if (data.rowId) {
        const currentRow = useMainStore.getState().rows[data.rowId]
        if (currentRow) {
          const outputUpdatesForMainStore: Partial<Pick<OutputData, 'icon' | 'label'>> = {}

          if (data.icon !== undefined) {
            outputUpdatesForMainStore.icon = data.icon
          }
          if (data.label !== undefined) {
            outputUpdatesForMainStore.label = data.label
          }

          if (Object.keys(outputUpdatesForMainStore).length > 0) {
            editRow(data.rowId, {
              output: {
                ...currentRow.output,
                ...outputUpdatesForMainStore
              }
            })
          }
        }
      }
    }

    ipcRenderer.on('trigger-row', triggerRowListener)
    ipcRenderer.on('update-row', legacyUpdateRowListener)
    ipcRenderer.on('deck-update-row-display', handleDeckUpdateRowDisplay)

    console.debug(
      'Home: Core IPC listeners (trigger-row, update-row, deck-update-row-display) attached.'
    )
    const handleTriggerRowFromMainHA = (
      _event: Electron.IpcRendererEvent,
      data: { rowId: string; command: string } // command is "ON" or "OFF"
    ) => {
      if (data.rowId) {
        console.log(
          `Home: IPC 'trigger-row-from-main-ha' received for Row ID: ${data.rowId}, Command: ${data.command}`
        )
        // Dispatch the standard io_input event.
        // The payload can be the command ("ON"/"OFF") or any other relevant data from HA if needed later.
        window.dispatchEvent(
          new CustomEvent('io_input', {
            detail: {
              rowId: data.rowId,
              payload: data.command, // Pass the HA command as payload
              dispatcherModuleId: 'homeassistant-integration' // Identify the source
            }
          })
        )
      } else {
        console.warn("Home: IPC 'trigger-row-from-main-ha' received without rowId.", data)
      }
    }

    ipcRenderer.on('trigger-row-from-main-ha', handleTriggerRowFromMainHA)
    console.debug("Home: IPC listener 'trigger-row-from-main-ha' attached.")

    return () => {
      console.debug('Home: Cleaning up core IPC listeners.')
      if (ipcRenderer) {
        ipcRenderer.removeListener('trigger-row', triggerRowListener)
        ipcRenderer.removeListener('update-row', legacyUpdateRowListener)
        ipcRenderer.removeListener('deck-update-row-display', handleDeckUpdateRowDisplay)
        ipcRenderer.removeListener('trigger-row-from-main-ha', handleTriggerRowFromMainHA)
      }
    }
  }, [editRow])

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
  }, [rows])

  useEffect(() => {
    if (!ipcRenderer) return
    const handleApiSetActiveProfile = (_event: any, profileId: string | null) => {
      console.debug(
        "Renderer: Received 'ipc-api-set-active-profile' from main, calling store action:",
        profileId
      )
      setActiveProfile(profileId)
    }
    ipcRenderer.on('ipc-api-set-active-profile', handleApiSetActiveProfile)
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeListener('ipc-api-set-active-profile', handleApiSetActiveProfile)
      }
    }
  }, [setActiveProfile])

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

          if (!ModuleSettingsFC) {
            return null
          }
          const isVisible = homeWidgetsVisibility[modId] ?? true

          return (
            <Box
              key={modId}
              sx={{
                display: isVisible ? 'block' : 'none'
              }}
            >
              <ModuleSettingsFC />
            </Box>
          )
        })
        .filter((widget) => widget !== null), // Still filter out modules with no SettingsFC
    [usedModules, homeWidgetsVisibility] // Add homeWidgetsVisibility to dependency array
  )

  useEffect(() => {
    const logRowTrigger = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return

      const rowId = event instanceof CustomEvent && event.detail.rowId

      if (!rowId) {
        console.warn(
          '[History Logger] io_input event dispatched without a clear rowId in detail:',
          event
        )
        return
      }

      const storeState = useMainStore.getState()
      const row = storeState.rows[rowId]

      if (row) {
        const historyEntryData: Omit<LogEntry, 'id' | 'timestamp'> = {
          level: 'info',
          icon: row.output.icon || row.input.icon || 'mdi:play-circle-outline',
          source: `${row.outputModule.replace('-module', '')}`,
          summary: `${row.input.name || row.inputModule.replace('-module', '')} triggered ${row.output.name || row.outputModule.replace('-module', '')} ${row.output.data.originalFileName || row.output.data.text}`,
          details: {
            // rowId: row.id,
            // triggeredByModule: row.inputModule,
            // inputConfigName: row.input.data.name || 'Default Input',
            // ...(inputPayload !== undefined && { inputPayloadReceived: inputPayload }),
            // outputModule: row.outputModule || 'N/A',
            // outputConfigName: row.output.data.name || 'Default Output'
            ...row
          }
        }
        addRowHistoryEntry(historyEntryData)
        console.log(`[History Logger] Logged trigger for row: ${rowId}`)
      } else {
        console.warn(`[History Logger] Row with ID '${rowId}' not found for io_input event.`)
      }
    }

    console.debug('[Home.tsx] Attaching global io_input listener for history logging.')
    window.addEventListener('io_input', logRowTrigger)

    return () => {
      console.debug('[Home.tsx] Removing global io_input listener for history logging.')
      window.removeEventListener('io_input', logRowTrigger)
    }
  }, [addRowHistoryEntry])

  return (
    <>
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
          {/* <ProfileManagerSettings key="profile-manager" /> */}
          {SettingsWidgets.length > 0 &&
            SettingsWidgets.map((widget, index) => (
              <div key={(widget as any)?.key || index} style={{ padding: '8px' }}>
                {widget}
              </div>
            ))}
        </div>

        <Button
          disabled={showAddRow}
          variant="contained"
          onClick={handleAddNewRowClick}
          style={{ margin: '1rem auto', display: 'flex' }}
        >
          <Add /> Add New IO Row
        </Button>

        <Collapse in={showAddRow} timeout={500} unmountOnExit>
          <Box sx={{ mt: 2, mb: 2 }}>
            <IoNewRow
              key={ioNewRowKey}
              onComplete={handleAddRowComplete}
              startNewPrefilledRow={startNewPrefilledRow}
              initialPrefill={prefillData}
            />
          </Box>
        </Collapse>
        <div
          style={{
            maxHeight: 'calc(100vh - 356px - 5rem)',
            overflowY: 'auto',
            marginBottom: '5rem'
          }}
        >
          {rowsToDisplay.map((row) => (
            <IoRow key={row.id} row={row} />
          ))}
        </div>
      </Wrapper>
      {blueprintForRunner && (
        <BlueprintRunnerDialog
          open={isBlueprintRunnerOpen}
          onClose={handleBlueprintRunnerDialogClose}
          blueprint={blueprintForRunner}
          onApply={handleBlueprintApplyFromDrop}
        />
      )}
      <InfoDialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        title={infoDialogTitle}
        message={infoDialogMessage}
      />
    </>
  )
}

export default Home

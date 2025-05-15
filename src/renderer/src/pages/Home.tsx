// src/renderer/src/pages/Home.tsx
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useMainStore } from '@/store/mainStore'
import { Box, Button } from '@mui/material'
import { Add } from '@mui/icons-material'
import IoRow from '@/components/Row/IoRow'
import IoNewRow, { PrefillData } from '@/components/Row/IoNewRow'
import Wrapper from '@/components/utils/Wrapper'
import { log } from '@/utils'
import type { ModuleId, Row } from '@shared/types'
import { moduleImplementations, ModuleImplementationMap } from '@/modules/moduleRegistry'

// Legacy imports (to be removed phase by phase)
// import { useStore as useOldStore } from '../store/OLD/useStore' // Alias to avoid conflict
// import mqttService from '@/components/OLD/MQTT/mqttService' // For legacy MQTT

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
  // moduleConfigs is Record<ModuleId, ModuleConfig<any>>
  // const moduleConfigs = useMainStore((state) => state.modules); // Not directly used, but good to know
  const rows = useMainStore((state) => state.rows)
  const setDarkModeStoreAction = useMainStore((state) => state.setDarkMode)

  const handleAddNewRowClick = useCallback(() => {
    setPrefillData(undefined)
    setIoNewRowKey((prevKey) => prevKey + 1)
    setEditState(true)
  }, [setEditState])

  const startNewPrefilledRow = useCallback(
    async (prefill: PrefillData) => {
      log.info('Home: Request to start new prefilled row:', prefill)
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
    // No specific cleanup needed for this effect
  }, [setDarkModeStoreAction])

  // IPC listeners (trigger-row, update-row)
  useEffect(() => {
    if (!ipcRenderer) return

    const triggerRowListener = (_event: Electron.IpcRendererEvent, data: any) => {
      if (data.id) {
        log.info(`Home: IPC trigger-row received for ID: ${data.id}`)
        window.dispatchEvent(new CustomEvent(`io_input`, { detail: data.id }))
      }
    }

    const updateRowListener = (_event: Electron.IpcRendererEvent, data: any) => {
      if (data.id) {
        // data should contain { id, icon?, label?, settings? }
        log.success2(`Home: IPC update-row received for ID: ${data.id}`, data)
        // Construct payload for editRow carefully
        const updatesForOutput: Partial<Row['output']> = {}
        if (data.icon !== undefined) updatesForOutput.icon = data.icon
        if (data.label !== undefined) updatesForOutput.label = data.label
        if (data.settings !== undefined) updatesForOutput.settings = data.settings

        if (Object.keys(updatesForOutput).length > 0) {
          const currentRow = useMainStore.getState().rows[data.id]
          editRow(data.id, { output: { ...currentRow.output, ...updatesForOutput } }) // Merge with existing output to ensure all fields are defined
        }
        const currentRows = useMainStore.getState().rows
        ipcRenderer.send('set', ['rows', currentRows])
      } else {
        log.info1('Home: IPC update-row received without data.id', data)
      }
    }

    ipcRenderer.on('trigger-row', triggerRowListener)
    ipcRenderer.on('update-row', updateRowListener)
    log.info1('Home: IPC listeners for trigger-row and update-row attached.')

    return () => {
      log.info1('Home: Cleaning up IPC listeners for trigger-row and update-row.')
      if (ipcRenderer) {
        // Check again in cleanup
        ipcRenderer.removeListener('trigger-row', triggerRowListener)
        ipcRenderer.removeListener('update-row', updateRowListener)
      }
    }
  }, [editRow])

  // Sync rows to main process store (used by Deck API)
  useEffect(() => {
    if (ipcRenderer) {
      // This might be frequent; consider if needed if 'set' in updateRowListener is enough
      // For now, keeping it to ensure Deck API has latest on any row change
      ipcRenderer.send('set', ['rows', rows])
    }
  }, [rows])

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

  // --- Legacy MQTT Logic (To be removed) ---
  // const mqttData = useOldStore((state) => state.mqttData)
  // const useMqtt = useOldStore((state) => state.inputs.mqtt && state.outputs.mqtt)
  // useEffect(() => {
  //   if (!useMqtt) return
  //   const client = mqttService.getClient(console.log)
  //   const callBack = (mqttMessage: any) => console.log('Legacy MQTT Message:', mqttMessage)
  //   if (client && !client.connected) {
  //     client.on('connect', function () {
  //       client.subscribe(mqttData.topic, function (err: any) {
  //         if (!err) {
  //           /* ... publish initial messages ... */
  //         }
  //       })
  //     })
  //   }
  //   mqttService.onMessage(client, callBack)
  //   return () => mqttService.closeConnection(client)
  // }, [useMqtt, mqttData])

  // useEffect(() => {
  //   // Persisting old MQTT data to localStorage
  //   if (useMqtt) window.localStorage.setItem('io_mqtt_data', JSON.stringify(mqttData))
  // }, [mqttData, useMqtt])
  // --- End Legacy MQTT ---

  return (
    <Wrapper>
      {usedModules.map((modId) => (
        <ModuleGlobalActionsRunner key={`${modId}-global`} moduleId={modId} />
      ))}

      {SettingsWidgets.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {SettingsWidgets.map((widget, index) => (
            <div key={(widget as any)?.key || index} style={{ padding: '8px' }}>
              {widget}
            </div>
          ))}
        </div>
      )}

      <div style={{ maxHeight: 'calc(100vh - 356px)', overflowY: 'auto' }}>
        {Object.values(rows).map((row) => (
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

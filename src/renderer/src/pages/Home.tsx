import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMainStore } from '@/store/mainStore'
import { Box, Button } from '@mui/material'
import { useStore } from '../store/OLD/useStore'
import { Add } from '@mui/icons-material'
import mqttService from '@/components/OLD/MQTT/mqttService'
import IoRow from '@/components/Row/IoRow'
import IoNewRow from '@/components/Row/IoNewRow'
import Wrapper from '@/components/utils/Wrapper'
import { log } from '@/utils'
import type { PrefillData } from '@/components/Row/IoNewRow'

const ipcRenderer = window.electron?.ipcRenderer || false

// export const MqttContext = createContext<any>(client);

const Home = () => {
  const [_data, setData] = useState(0)
  const _edit = useMainStore((state) => state.edit)
  const showAddRow = useMainStore((state) => state.edit)
  const setEditState = useMainStore((state) => state.setEdit)
  const [prefillData, setPrefillData] = useState<PrefillData | undefined>(undefined)
  const editRow = useMainStore((state) => state.editRow)
  const [_ioNewRowKey, setIoNewRowKey] = useState(0)

  const modules = useMainStore((state) => state.modules)
  const rows = useMainStore((state) => state.rows)

  const setDarkMode = useMainStore((state) => state.setDarkMode)
  const mqttData = useStore((state) => state.mqttData)
  const inMqtt = useStore((state) => state.inputs.mqtt)
  const outMqtt = useStore((state) => state.outputs.mqtt)
  const useMqtt = inMqtt && outMqtt

  const handleAddNewRowClick = useCallback(() => {
    setPrefillData(undefined)
    setIoNewRowKey((prevKey) => prevKey + 1)
    setEditState(true)
  }, [setEditState])

  const startNewPrefilledRow = useCallback(
    async (prefill: PrefillData) => {
      log.info('Starting new row prefilled for:', prefill.input?.data)
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

  useEffect(() => {
    const client = useMqtt ? mqttService.getClient(console.log) : null
    const callBack = (mqttMessage: any) => console.log(mqttMessage)
    if (useMqtt && client && !client.connected) {
      client.on('connect', function () {
        client.subscribe(mqttData.topic, function (err: any) {
          if (!err) {
            client.publish(mqttData.topic, 'IO connected')
            client.publish(
              'homeassistant/sensor/gesturesensor/config',
              JSON.stringify({
                '~': 'homeassistant/sensor/gesturesensor',
                name: 'Hand Gestures',
                unique_id: 'gesturesensor',
                entity_category: 'diagnostic',
                cmd_t: '~/set',
                stat_t: '~/state',
                icon: 'mdi:hand-back-right',
                device: {
                  identifiers: ['yzlights'],
                  configuration_url: 'https://yeonv.github.io/io/',
                  name: 'A.I. Gesture Recognition',
                  model: 'BladeAI',
                  manufacturer: 'Yeon',
                  sw_version: '0.0.1'
                }
              })
            )
          }
        })
      })
    }
    mqttService.onMessage(client, callBack)
    return () => mqttService.closeConnection(client)
  }, [useMqtt])

  useEffect(() => {
    window.localStorage.setItem('io_mqtt_data', JSON.stringify(mqttData))
  }, [mqttData])

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('get', (_event: any, data: any) => {
        setData(data.count)
      })
      async function getDarkMode() {
        const dark = await ipcRenderer.sendSync('get-darkmode')
        setDarkMode(dark === 'yes')
      }
      getDarkMode()
    }
    console.info(
      '%c   IO  ' + '%c\n ReactApp by Blade ',
      'padding: 10px 40px; color: #ffffff; border-radius: 5px 5px 0 0; background-color: #123456;',
      'background: #fff; color: #123456; border-radius: 0 0 5px 5px;padding: 5px 0;'
    )
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('get')
      }
    }
  }, [])

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.send('set', ['rows', rows])
    }
  }, [rows])

  useEffect(() => {
    if (!ipcRenderer) {
      return
    }
    const triggerRowListener = (_event: Electron.IpcRendererEvent, data: any) => {
      if (data.id) {
        log.info(`IPC trigger-row received for ID: ${data.id}`)
        window.dispatchEvent(new CustomEvent(`io_input`, { detail: data.id }))
      }
    }

    const updateRowListener = (_event: Electron.IpcRendererEvent, data: any) => {
      if (data.id) {
        log.success2(`IPC update-row received for ID: ${data.id}`, data)

        const updatePayload = {
          icon: data.icon,
          label: data.label,
          settings: data.settings
        }

        editRow(data.id, updatePayload)
        const currentRows = useMainStore.getState().rows
        ipcRenderer.send('set', ['rows', currentRows])
      } else {
        log.info('IPC update-row received without data.id', data)
      }
    }

    ipcRenderer.on('trigger-row', triggerRowListener)
    ipcRenderer.on('update-row', updateRowListener)
    log.info('IPC listeners for trigger-row and update-row attached.')

    return () => {
      console.log(`Cleaning up Alexa useGlobalActions: Removing listener. Timestamp: ${Date.now()}`)
      if (ipcRenderer) {
        if (ipcRenderer) {
          ipcRenderer.removeListener('trigger-row', triggerRowListener)
          ipcRenderer.removeListener('update-row', updateRowListener)
        }
      }
    }
  }, [editRow])

  const usedModules = useMemo(
    () =>
      [
        ...new Set([
          ...Object.values(rows).map((r) => r.inputModule),
          ...Object.values(rows).map((r) => r.outputModule)
        ])
      ].filter(
        (moduleId): moduleId is keyof typeof modules => moduleId !== null && moduleId !== undefined
      ),
    [rows]
  )
  usedModules.forEach((modId) => {
    modules[modId]?.useGlobalActions?.()
  })

  const SettingsWidgets = useMemo(
    () =>
      usedModules
        .map((modId) => {
          const ModuleSettingsComponent = modules[modId]?.Settings
          if (ModuleSettingsComponent) {
            return <ModuleSettingsComponent key={modId} />
          }
          return null
        })
        .filter((widget) => widget !== null),
    [usedModules, modules]
  )

  return (
    <Wrapper>
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
            <div key={widget?.key || index} style={{ padding: '8px' }}>
              {widget}
            </div>
          ))}
        </div>
      )}

      <div style={{ maxHeight: 'calc(100vh - 356px)', overflowY: 'scroll' }}>
        {Object.values(rows).map((row) => (
          <IoRow key={row.id} row={row} />
        ))}
      </div>

      {!showAddRow ? (
        <Button variant="contained" onClick={handleAddNewRowClick} style={{ margin: 10 }}>
          <Add /> Add New IO Row
        </Button>
      ) : (
        <Box sx={{ mt: 2, mb: 2 }}>
          <IoNewRow
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

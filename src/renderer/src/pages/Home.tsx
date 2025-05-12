import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMainStore } from '@/store/mainStore'
import { Button } from '@mui/material'
import { useStore } from '../store/OLD/useStore'
import { Add } from '@mui/icons-material'
import mqttService from '@/components/OLD/MQTT/mqttService'
import IoRow from '@/components/Row/IoRow'
import IoNewRow from '@/components/Row/IoNewRow'
import Wrapper from '@/components/utils/Wrapper'
import { log } from '@/utils'
import type { PrefillData } from '@/components/Row/IoNewRow' // Adjust path/export if needed

// var client = null as any
const ipcRenderer = window.electron?.ipcRenderer || false

// export const MqttContext = createContext<any>(client);

const Home = () => {
  const [_data, setData] = useState(0)
  const edit = useMainStore((state) => state.edit)
  const showAddRow = useMainStore((state) => state.edit)
  const setEditState = useMainStore((state) => state.setEdit)
  const [prefillData, setPrefillData] = useState<PrefillData | undefined>(undefined)
  const editRow = useMainStore((state) => state.editRow)

  const modules = useMainStore((state) => state.modules)
  const rows = useMainStore((state) => state.rows)

  const setDarkMode = useMainStore((state) => state.setDarkMode)
  const mqttData = useStore((state) => state.mqttData)
  const inMqtt = useStore((state) => state.inputs.mqtt)
  const outMqtt = useStore((state) => state.outputs.mqtt)
  const useMqtt = inMqtt && outMqtt

  // --- Functions ---
  // Function to start the 'Add Row' process
  const handleAddNewRowClick = useCallback(() => {
    setPrefillData(undefined) // Clear any previous prefill
    setEditState(true) // Show the IoNewRow component
  }, [setEditState])

  // Function passed to IoNewRow to trigger the next step in the pairing
  const startNewPrefilledRow = useCallback(
    (prefill: PrefillData) => {
      log.info('Starting new row prefilled for:', prefill.input?.data)
      setPrefillData(prefill) // Set the prefill data
      setEditState(true) // Ensure the form stays/becomes visible
      // Maybe scroll into view?
      // window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    },
    [setEditState]
  )

  // Function passed to IoNewRow when it completes (or cancels)
  const handleAddRowComplete = useCallback(() => {
    setEditState(false) // Hide the IoNewRow component
    setPrefillData(undefined) // Clear prefill data
  }, [setEditState])

  useEffect(() => {
    const client = useMqtt ? mqttService.getClient(console.log) : null
    const callBack = (mqttMessage: any) => console.log(mqttMessage)
    if (useMqtt && client && !client.connected) {
      // setTheClient(client);
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
    // ipcRenderer.on('trigger-row', (_event: any, data: any) => {
    //   if (data.id) window.dispatchEvent(new CustomEvent(`io_input`, { detail: data.id }))
    // })
    // ipcRenderer.on('update-row', (_event: any, data: any) => {
    //   if (data.id) {
    //     log.success2('update-row', data)
    //     log.success2('update-row-settings', data.settings)
    //     editRow(data.id, {
    //       icon: data.icon,
    //       label: data.label,
    //       settings: {
    //         buttonColor: data.settings.buttonColor,
    //         iconColor: data.settings.iconColor,
    //         icon: data.settings.icon,
    //         textColor: data.settings.textColor,
    //         variant: data.settings.variant
    //       }
    //     })
    //     setTimeout(() => {
    //       ipcRenderer.send('set', ['rows', rows])
    //       location.reload()
    //     }, 500)
    //   }
    // })
    // ipcRenderer.on('trigger-row', triggerRowListener)
    // ipcRenderer.on('update-row', updateRowListener)
    const triggerRowListener = (_event: Electron.IpcRendererEvent, data: any) => {
      if (data.id) {
        log.info(`IPC trigger-row received for ID: ${data.id}`)
        window.dispatchEvent(new CustomEvent(`io_input`, { detail: data.id }))
      }
    }

    const updateRowListener = (_event: Electron.IpcRendererEvent, data: any) => {
      // Payload should be { id: string, icon?: string, label?: string, settings?: object }
      if (data.id) {
        log.success2(`IPC update-row received for ID: ${data.id}`, data)

        // Prepare the update payload for editRow action in mainStore
        const updatePayload = {
          icon: data.icon,
          label: data.label,
          settings: data.settings
        }

        // Call the editRow action from Zustand store
        editRow(data.id, updatePayload)

        // Explicitly save updated rows state back to main process store for API access
        const currentRows = useMainStore.getState().rows
        ipcRenderer.send('set', ['rows', currentRows])

        // --- REMOVED THE RELOAD ---
        // setTimeout(() => {
        //   location.reload();
        // }, 500);
      } else {
        log.info('IPC update-row received without data.id', data)
      }
    }

    // Attach the listeners
    ipcRenderer.on('trigger-row', triggerRowListener)
    ipcRenderer.on('update-row', updateRowListener)
    log.info('IPC listeners for trigger-row and update-row attached.')

    return () => {
      if (ipcRenderer) {
        // ipcRenderer.removeAllListeners('alexa-device')
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
          // Use Set for automatic unique values
          ...Object.values(rows).map((r) => r.inputModule),
          ...Object.values(rows).map((r) => r.outputModule)
        ])
      ].filter(
        (moduleId): moduleId is keyof typeof modules => moduleId !== null && moduleId !== undefined
      ),
    [rows]
  )

  // usedModules.map((mod) => modules[mod].useGlobalActions?.())
  // const SettingsWidgets = usedModules
  //   .map((mod, i) => {
  //     if (modules[mod].Settings) {
  //       const Setttingz = useMemo(() => {
  //         return modules[mod].Settings!
  //       }, [modules, mod])

  //       return <Setttingz key={i} />
  //     }
  //     return undefined
  //   })
  //   .filter((n) => n !== undefined)
  usedModules.forEach((modId) => {
    // This can cause hooks to be called conditionally if usedModules changes often.
    // Consider alternative ways to manage global listeners if this becomes an issue.
    // For now, let's assume modules[modId] exists.
    modules[modId]?.useGlobalActions?.()
  })

  const SettingsWidgets = useMemo(
    () =>
      usedModules
        .map((modId) => {
          const ModuleSettingsComponent = modules[modId]?.Settings
          if (ModuleSettingsComponent) {
            // Wrap in memo or ensure key is stable if performance becomes an issue
            return <ModuleSettingsComponent key={modId} />
          }
          return null // Return null instead of undefined
        })
        .filter((widget) => widget !== null), // Filter out nulls
    [usedModules, modules] // Dependencies
  )

  return (
    <Wrapper>
      {/* Settings Widgets Area */}
      {SettingsWidgets.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {SettingsWidgets.map(
            (
              widget,
              index // Use index only if key isn't stable enough
            ) => (
              <div key={widget?.key || index} style={{ padding: '8px' }}>
                {widget}
              </div>
            )
          )}
        </div>
      )}

      {/* Rows List */}
      <div style={{ maxHeight: 'calc(100vh - 356px)', overflowY: 'scroll' }}>
        {Object.values(rows).map((row) => (
          <IoRow key={row.id} row={row} />
        ))}
      </div>

      {/* Add New Row Section */}
      {!showAddRow ? (
        <Button variant="contained" onClick={handleAddNewRowClick} style={{ margin: 10 }}>
          <Add /> Add New IO Row
        </Button>
      ) : (
        // Pass down the new props to IoNewRow
        <IoNewRow
          onComplete={handleAddRowComplete}
          startNewPrefilledRow={startNewPrefilledRow}
          initialPrefill={prefillData}
        />
      )}
    </Wrapper>
  )
}

export default Home

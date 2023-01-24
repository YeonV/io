import { useEffect, useMemo, useState } from 'react'
import { useMainStore } from '@/store/mainStore'
import { Button, ToggleButton, Typography } from '@mui/material'
import { useStore } from '../store/OLD/useStore'
import { Add, Sync } from '@mui/icons-material'
import mqttService from '@/components/OLD/MQTT/mqttService'
import IoRow from '@/components/Row/IoRow'
import IoNewRow from '@/components/Row/IoNewRow'
import Wrapper from '@/components/utils/Wrapper'
import { log } from '@/utils'

// var client = null as any
const ipcRenderer = window.ipcRenderer || false

// export const MqttContext = createContext<any>(client);

const Home = () => {
  const [data, setData] = useState(0)
  const edit = useMainStore((state) => state.edit)
  const setEdit = useMainStore((state) => state.setEdit)
  const editRow = useMainStore((state) => state.editRow)
  const mqttData = useStore((state) => state.mqttData)
  const inMqtt = useStore((state) => state.inputs.mqtt)
  const outMqtt = useStore((state) => state.outputs.mqtt)
  const useMqtt = inMqtt && outMqtt
  const setDarkMode = useStore((state) => state.ui.setDarkMode)

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
                'name': 'Hand Gestures',
                'unique_id': 'gesturesensor',
                'entity_category': 'diagnostic',
                'cmd_t': '~/set',
                'stat_t': '~/state',
                'icon': 'mdi:hand-back-right',
                'device': {
                  identifiers: ['yzlights'],
                  configuration_url: 'https://yeonv.github.io/io/',
                  name: 'A.I. Gesture Recognition',
                  model: 'BladeAI',
                  manufacturer: 'Yeon',
                  sw_version: '0.0.1',
                },
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
      ipcRenderer.on('get', (event: any, data: any) => {
        setData(data.count)
      })
      async function getDarkMode() {
        const dark = await ipcRenderer.sendSync('get-darkmode')
        console.log(dark)
        setDarkMode(dark === 'yes')
      }
      getDarkMode()
    }
    console.info(
      // eslint-disable-next-line no-useless-concat
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

  const modules = useMainStore((state) => state.modules)
  const rows = useMainStore((state) => state.rows)

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.send('set', ['rows', rows])
    }
  }, [rows])

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('trigger-row', (event: any, data: any) => {
        if (data.id)
          window.dispatchEvent(new CustomEvent(`io_input`, { detail: data.id }))
      })
      ipcRenderer.on('update-row', (event: any, data: any) => {
        if (data.id) {
          log.success2('update-row', data)
          log.success2('update-row-settings', data.settings)
          editRow(data.id, {
            icon: data.icon,
            label: data.label,
            settings: {
              buttonColor: data.settings.buttonColor,
              iconColor: data.settings.iconColor,
              icon: data.settings.icon,
              textColor: data.settings.textColor,
              variant: data.settings.variant,
            },
          })
          setTimeout(() => {
            ipcRenderer.send('set', ['rows', rows])
            location.reload()
          }, 500)
        }
      })
    }
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('alexa-device')
      }
    }
  }, [])

  const usedModules = [
    ...Object.values(rows).flatMap((r) => r.inputModule),
    ...Object.values(rows).flatMap((r) => r.outputModule),
  ]
    .filter((n) => n !== null)
    .filter((v, i, a) => a.indexOf(v) === i)

  usedModules.map((mod) => modules[mod].useGlobalActions?.())
  const SettingsWidgets = usedModules
    .map((mod) => {
      if (modules[mod].Settings) {
        const Setttingz = useMemo(() => {
          return modules[mod].Settings!
        }, [modules, mod])

        return <Setttingz />
      }
    })
    .filter((n) => n !== undefined)

  return (
    <Wrapper>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        {SettingsWidgets.map((n: any, i: number) => (
          <div key={i} style={{ padding: '8px' }}>
            {n}
          </div>
        ))}
        {/* {localStorage.getItem('io-restart-needed') === 'deck' ? ( */}
        {
          <div style={{ padding: '8px' }}>
            <ToggleButton
              size='large'
              value='restart'
              sx={{ '& .MuiSvgIcon-root': { fontSize: 50 } }}
              selected={localStorage.getItem('io-restart-needed') === 'yes'}
              onChange={() => {
                ipcRenderer?.sendSync('restart-app')
                localStorage.setItem('io-restart-needed', 'no')
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 90,
                  height: 90,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant='caption' color={'#999'}>
                  Restart
                </Typography>
                <Sync />
                <Typography variant='caption' color={'#999'}>
                  Sync Deck
                </Typography>
              </div>
            </ToggleButton>
          </div>
        }
      </div>
      <div style={{ maxHeight: 'calc(100vh - 356px)', overflowY: 'scroll' }}>
        {Object.values(rows).map((row) => {
          return <IoRow key={row.id} row={row} />
        })}
      </div>
      {!edit ? (
        <Button
          variant='contained'
          onClick={() => setEdit(true)}
          style={{ margin: 10 }}
        >
          <Add />
        </Button>
      ) : (
        <IoNewRow
          onComplete={() => {
            setEdit(false)
          }}
        />
      )}
    </Wrapper>
  )
}

export default Home

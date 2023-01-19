import { useEffect, useMemo, useState } from 'react'
import { useMainStore } from '@/store/mainStore'
import { Button } from '@mui/material'
import { useStore } from '../store/OLD/useStore'
import { Add } from '@mui/icons-material'
import mqttService from '@/components/OLD/MQTT/mqttService'
import IoRow from '@/components/Row/IoRow'
import IoNewRow from '@/components/Row/IoNewRow'
import Wrapper from '@/components/utils/Wrapper'

// var client = null as any
const ipcRenderer = window.ipcRenderer || false

// export const MqttContext = createContext<any>(client);

const Home = () => {
  const [data, setData] = useState(0)
  const edit = useMainStore((state) => state.edit)
  const setEdit = useMainStore((state) => state.setEdit)
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
          marginTop: '1rem',
          marginBottom: '1rem',
        }}
      >
        {SettingsWidgets.map((n: any, i: number) => (
          <div key={i}>{n}</div>
        ))}
      </div>
      {Object.values(rows).map((row) => {
        return <IoRow key={row.id} row={row} />
      })}
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

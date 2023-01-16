import logoTitle from '@/assets/logo-cropped.svg'
import logo from '@/assets/icon.png'
import styles from '@/styles/app.module.scss'
import pkg from '../../../../package.json'
import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { useStore } from '../store/OLD/useStore'
import IoRow from '@/components/IoRow'
import { Add } from '@mui/icons-material'
import mqttService from '@/components/OLD/MQTT/mqttService'
import { useMainStore } from '@/store/mainStore'
import { IoNewRow } from '@/components/IoNewRow'
import { Widget } from '@/modules/Alexa/Alexa'
import { Stack } from '@mui/system'

// var client = null as any

const ipcRenderer = window.ipcRenderer || false

// export const MqttContext = createContext<any>(client);

const Home = () => {
  const [data, setData] = useState(0)
  // const [edit, setEdit] = useState(false)
  const edit = useMainStore((state) => state.edit)
  const setEdit = useMainStore((state) => state.setEdit)
  const cam = useStore((state) => state.inputs.cam)
  const mqttData = useStore((state) => state.mqttData)
  const inMqtt = useStore((state) => state.inputs.mqtt)
  const outMqtt = useStore((state) => state.outputs.mqtt)
  const useMqtt = inMqtt && outMqtt

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

  Widget()

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('get', (event: any, data: any) => {
        setData(data.count)
      })
    }
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('get')
      }
    }
  }, [])

  const modules = useMainStore((state) => state.modules)
  const rows = useMainStore((state) => state.rows)

  const a = Object.values(rows).flatMap(r => r.inputModule)
  const b = Object.values(rows).flatMap(r => r.outputModule)
  const c = [...a, ...b]
  const d = c.filter((item, index) => c.indexOf(item) === index)
  d.map(mod => modules[mod].useGlobalActions?.())
  const SettingsWidgets = () => d.map((mod, i) => {
    if (modules[mod].Settings && modules[mod].Settings !== undefined) {
      return modules[mod].Settings!({ props: { key: i } })
    } else {
      return null
    }
  }
  ).filter(g => g !== null)


  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden',
      }}
      className={styles.app}
    >
      <div
        className={styles.appWrapper}
        style={{
          margin: '0 auto',
          minHeight:
            ipcRenderer && pkg.env.VITRON_CUSTOM_TITLEBAR
              ? 'calc(100vh - 30px)'
              : '100vh',
        }}
      >
        <header className={styles.logos}>
          <img
            src={logo}
            style={{ width: '100px', filter: 'invert(0)' }}
            alt='logoIO'
          />
          <div className={styles.imgBox}>
            <img
              src={logoTitle}
              style={{ width: '480px', filter: 'invert(0)' }}
              alt='InputOutput'
            />
          </div>
        </header>
        <main style={{ width: '100%', maxWidth: 960 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {SettingsWidgets().map((n: any, i: number) => <div key={i} style={{ padding: '1rem' }}>{n}</div>)}
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
          {!ipcRenderer && (
            <Typography variant='body2' color='#666' sx={{ mt: 5 }}>
              If you are accessing this site via httpS, but want to communicate
              with your local network (mqtt, http, ws), you need to allow
              insecure content in your browser's site settings either via lock
              icon next to the url or copy:
              <br />
              <code>{`chrome://settings/content/siteDetails?site=${encodeURIComponent(
                window.location.href.replace(/\/+$/, '')
              )}`}</code>
            </Typography>
          )}
        </main>
        <footer>hacked by Blade</footer>
      </div>
      {/* <Widget /> */}
    </Box>
  )
}

export default Home

import electronImg from '@/assets/electron.png';
import muiImg from '@/assets/mui.png';
import react from '@/assets/react.svg';
import vite from '@/assets/vite.svg';
import zustand from '@/assets/zustand.png';
import logoTitle from '@/assets/logo-cropped.svg';
import logo from '@/assets/icon.png';
import typescript from '@/assets/typescript.svg';
import immer from '@/assets/immer.svg';
import reactRouter from '@/assets/reactrouter.svg';
import styles from '@/styles/app.module.scss';
import pkg from '../../../../../package.json';
import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Chip, IconButton } from '@mui/material';
import { useStore } from '../../store/useStore';
import Shortkey from '@/components/Shortkey';
import IoRow from '@/components/IoRow';
import { Add } from '@mui/icons-material';
import Chips from '@/components/Chips';
import { WebMidi } from "webmidi";
import Settings from '@/components/Settings';
import actions from '@/components/Actions';
import { HandsEstimator } from "../../core/hands-estimator";
import { detectGesture, Gesture } from "../../core/gesture-detector";
import { LandmarkList, Results } from "@mediapipe/hands";
import { VideoScene } from "../../video/video-scene";
import useRequestAnimationFrame from "use-request-animation-frame"
import * as mqtt from 'mqtt/dist/mqtt.min';
// const mqtt = require('mqtt')
// import * as mqtt from "mqtt"
// import mqtt from "mqtt"
// import mqtt from "mqtt/dist/mqtt";
let client = null as any
const ipcRenderer = window.ipcRenderer || false;

const Example = () => {
  const [message, setMessage] = useState('hacked by Blade');
  const [data, setData] = useState(0);
  const [add, setAdd] = useState(false);
  const { darkMode, setDarkMode } = useStore((state) => state.ui);
  const [shortcut, setShortcut] = useState('ctrl+alt+y');
  const shortcuts = useStore((state) => state.shortcuts);
  const addShortcut = useStore((state) => state.addShortcut);
  const midi = useStore((state) => state.inputs.midi);
  const cam = useStore((state) => state.inputs.cam);
  const setInput = useStore((state) => state.setInput);
  const setOutput = useStore((state) => state.setOutput);
  const mqttData = useStore((state) => state.mqttData);
  const inMqtt = useStore((state) => state.inputs.mqtt);
  const outMqtt = useStore((state) => state.outputs.mqtt);
  const useMqtt = inMqtt && outMqtt
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };
  // Zustand-Store

  const toggleDarkmode = () => {
    if (ipcRenderer) {
      ipcRenderer.sendSync('toggle-darkmode', 'try');
    } else {
      setDarkMode(!darkMode);
    }
  };

  useEffect(() => {
    if (useMqtt && !client) {
      client = mqtt.connect(mqttData.host, {
        clientId: "gestures",
        username: mqttData.username,
        password: mqttData.password,
        clean: true
      })
    }
    if (useMqtt && client) {
      client.on('connect', function () {
        client.subscribe(mqttData.topic, function (err: any) {
          if (!err) {
            client.publish(mqttData.topic, 'IO connected')
          }
        })
      })
    }
    if (!useMqtt && client) {
      client.publish(mqttData.topic, 'IO disconnected')
      client.unsubscribe(mqttData.topic)      
    }

    return () => {
      if (useMqtt && client) {
        client.publish(mqttData.topic, 'IO disconnected')
        client.unsubscribe(mqttData.topic)
      }
    }
  }, [useMqtt])

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('get', (event: any, data: any) => {
        setData(data.count);
      });
      async function getDarkMode() {
        const dark = await ipcRenderer.sendSync('get-darkmode');
        setDarkMode(dark === 'yes');
      }
      getDarkMode();
    }
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('ping-pong');
        ipcRenderer.removeAllListeners('get');
      }
    };
  }, []);

  useEffect(() => {
    if (midi) {
      WebMidi
        .enable({ sysex: true })
        .then(() => console.log("WebMidi with sysex enabled!"))
        .catch(err => alert(err));

      WebMidi
        .enable()
        .then(onEnabled)
        .catch(err => alert(err));

      function onEnabled() {
        WebMidi.inputs.forEach(input => {
          const myInput = WebMidi.getInputByName(input.name);
          setShortcut("YO")
          if (myInput) [
            myInput.addListener("noteon", e => {
              const check = shortcuts.find((s: any) => s.input_type === 'midi' && s.shortkey === e.note.identifier.toLowerCase())
              if (check) {
                console.log("AAAA", check)
                actions(check.output_type, check.action)
              }
              setShortcut(e.note.identifier)
            })
          ]
          return console.log(input.manufacturer, input.name)
        });

        // Outputs
        WebMidi.outputs.forEach(output => console.log(output.manufacturer, output.name));
      }
    }
    return () => {
      if (midi) {
        WebMidi
          .enable({ sysex: true })
          .then(() => console.log("WebMidi with sysex enabled!"))
          .catch(err => alert(err));

        WebMidi
          .enable()
          .then(onEnabled)
          .catch(err => alert(err));

        function onEnabled() {
          WebMidi.inputs.forEach(input => {
            const myInput = WebMidi.getInputByName(input.name);
            if (myInput) [
              myInput.removeListener("noteon")
            ]
            return console.log(input.manufacturer, input.name)
          });

          // Outputs

        }
      }
    }
  }, [midi])


  const videoCanvas = document.getElementById('video-canvas') as HTMLCanvasElement;
  const videoScene = new VideoScene(videoCanvas);
  var i: number = 0;

  useEffect(() => {
    const listener = (r: any) => {
      results = r;
      const landmarks = r?.multiHandLandmarks[0];
      if (landmarks) {
        hand = landmarks;
        const gesture = detectGesture(landmarks);
        if (gesture === currentGesture) {
          i++
          if (i === 10) {
            const check = shortcuts.find((s: any) => s.input_type === 'cam' && s.shortkey === Gesture[gesture].toLowerCase())
            if (check) {
              console.log(inMqtt)
              if (inMqtt) {
                actions(check.output_type, check.action, client)
              } else {
                actions(check.output_type, check.action)
              }
            } else {
              setShortcut(Gesture[gesture].toLowerCase());
            }
          }
        } else {
          currentGesture = gesture
          i = 0;
        }
      }
    }




    const handsEstimator = new HandsEstimator();


    if (cam) {
      handsEstimator.addListener(listener);
      handsEstimator.start();
      videoCanvas.style.display = 'block'
    } else {
      handsEstimator.stop();
      handsEstimator.removeListener(listener);
      videoCanvas.style.display = 'none'
    }

    return () => {
      handsEstimator.stop();
      handsEstimator.removeListener(listener);
      // videoScene.stop()
      videoCanvas.style.display = 'none'
    }

  }, [cam, inMqtt])


  var currentGesture: Gesture | null = null;
  var results: Results | null = null;
  var hand: LandmarkList | null = null;


  useRequestAnimationFrame((e: any) => {
    if (results) videoScene.update(results);
  }, { duration: undefined, shouldAnimate: cam });

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden',
      }}
      className={styles.app}>
      <header
        className={styles.appHeader}
        style={{
          maxWidth: 960,
          margin: '0 auto',
          minHeight:
            ipcRenderer && pkg.env.VITRON_CUSTOM_TITLEBAR
              ? 'calc(100vh - 30px)'
              : '100vh',
        }}>
        <div className={styles.logos}>
          <img src={logo} style={{ width: '100px', filter: 'invert(0)' }} alt='Vitron' />
          <div className={styles.imgBox}>
            <img src={logoTitle} style={{ width: '480px', filter: 'invert(0)' }} alt='Vitron' />
          </div>
        </div>

        {false && <Chips />}
        <Settings />

        {shortcuts.map((s: any, i: number) =>
          <IoRow input_payload={s.shortkey} input_type={s.input_type} output_type={s.output_type} output_payload={s.action} key={s.shortkey} />
        )}
        {!add && <Button variant="contained" onClick={() => setAdd(true)} style={{ margin: 10 }}><Add /></Button>}
        {add && <Shortkey keystring={shortcut} edit shortc={shortcut} setShortc={setShortcut} addShortcut={addShortcut} onSave={() => setAdd(false)} exists={shortcuts} />}

      </header>
      {/* {cam && <canvas style={{height: '50px', width: '50px'}} id="video-canvas"></canvas>} */}
    </Box>
  );
};

export default Example;

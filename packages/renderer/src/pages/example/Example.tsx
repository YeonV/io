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
    </Box>
  );
};

export default Example;

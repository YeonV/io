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
import { Avatar, Button, Box, Chip, Input, Stack, Accordion, AccordionSummary, Typography, AccordionDetails, Card } from '@mui/material';
import { useStore } from '../../store/useStore';

import { useHotkeys } from 'react-hotkeys-hook';
import Shortkey from '@/components/Shortkey';
import { ExpandMore, Key, Keyboard } from '@mui/icons-material';
import IoRow from '@/components/ioRow';





const ipcRenderer = window.ipcRenderer || false;

const Example = () => {
  const [message, setMessage] = useState('hacked by Blade');
  const [data, setData] = useState(0);
  const { darkMode, setDarkMode } = useStore((state) => state.ui);
  const [shortcut, setShortcut] = useState('ctrl+alt+y');
  const shortcuts = useStore((state) => state.shortcuts);
  const addShortcut = useStore((state) => state.addShortcut);
  console.log(shortcuts)
  
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

        <Box sx={{ mb: 5, mt: 2.5, maxWidth: 500 }}>
          {ipcRenderer && (
            <Chip
              avatar={<Avatar alt='Electron' src={electronImg} />}
              label='Electron'
            />
          )}
          <Chip avatar={<Avatar alt='Vite' src={vite} />} label='Vite' />
          <Chip avatar={<Avatar alt='React' src={react} />} label='React' />
          <Chip
            avatar={<Avatar alt='Typescript' src={typescript} />}
            label='Typescript'
          />
          <Chip
            avatar={<Avatar alt='Material UI' src={muiImg} />}
            label='Material UI'
          />
          <Chip
            avatar={<Avatar alt='Zustand' src={zustand} />}
            label='Zustand'
          />
          <Chip avatar={<Avatar alt='Immer' src={immer} />} label='Immer' />
          <Chip
            avatar={<Avatar alt='React Router' src={reactRouter} />}
            label='React Router'
          />
        </Box>
        <IoRow input_type="keyboard" input_payload="ctrl+alt+g" output_type="alert" ouput_payload="hacked" />
        
        {shortcuts.map((s: any,i: number) =>            
          <IoRow input_payload={s.shortkey} ouput_payload={s.action} key={s.shortkey} />          
        )  }
        <Shortkey keystring={shortcut} edit addShortcut={addShortcut} /> 
        
      </header>
    </Box>
  );
};

export default Example;

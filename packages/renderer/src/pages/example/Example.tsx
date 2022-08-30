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

const ipcRenderer = window.ipcRenderer || false;

const Example = () => {
  const [message, setMessage] = useState('hacked by Blade');
  const [data, setData] = useState(0);
  const [add, setAdd] = useState(false);
  const { darkMode, setDarkMode } = useStore((state) => state.ui);
  const [shortcut, setShortcut] = useState('ctrl+alt+y');
  const shortcuts = useStore((state) => state.shortcuts);
  const addShortcut = useStore((state) => state.addShortcut);
  console.log(shortcuts.map((s: any)=>s.shortkey).indexOf(shortcut), shortcut)
  
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
        
        
        {shortcuts.map((s: any,i: number) =>            
          <IoRow input_payload={s.shortkey} output_type={s.type} output_payload={s.action} key={s.shortkey} />          
        )  }
        {!add && <Button variant="contained" onClick={()=>setAdd(true)} style={{ margin: 10}}><Add /></Button>} 
        {add && <Shortkey keystring={shortcut} edit addShortcut={addShortcut} onSave={()=>setAdd(false)} exists={shortcuts} />} 
        
      </header>
    </Box>
  );
};

export default Example;

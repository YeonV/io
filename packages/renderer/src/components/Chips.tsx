import electronImg from '@/assets/electron.png';
import muiImg from '@/assets/mui.png';
import react from '@/assets/react.svg';
import vite from '@/assets/vite.svg';
import zustand from '@/assets/zustand.png';
import typescript from '@/assets/typescript.svg';
import immer from '@/assets/immer.svg';
import reactRouter from '@/assets/reactrouter.svg';
import { Avatar, Box, Chip } from '@mui/material';


const ipcRenderer = window.ipcRenderer || false;

const Chips = () => <Box sx={{ mb: 5, mt: 2.5, maxWidth: 500 }}>
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
export default Chips;

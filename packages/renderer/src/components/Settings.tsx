import { useStore } from '@/store/useStore';
import { Box, FormControlLabel, FormGroup, Switch } from '@mui/material';

const Settings = () => {
  const inputs = useStore((state) => state.inputs);
  const toggleInput = useStore((state) => state.toggleInput);

  return ( 
    <Box sx={{ mb: 5, mt: 2.5, maxWidth: 500 }}>
      <FormGroup>
          <FormControlLabel control={<Switch checked={inputs.midi} onChange={()=>toggleInput('midi')} />} label="MIDI" />
        </FormGroup>
    </Box>
  )
}
export default Settings;

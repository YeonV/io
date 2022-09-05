import { useState } from 'react';
import { Input, Stack, Accordion, AccordionSummary, Typography, AccordionDetails, Card, Button, IconButton } from '@mui/material';

import Shortkey from '@/components/Shortkey';
import { Delete, Edit, ExpandMore, Help, Keyboard, Piano } from '@mui/icons-material';
import { useStore } from '@/store/useStore';
import actions from './Actions';
import ShortMidi from './ShortMidi';


const IoRow = ({
  input_type = "keyboard",
  input_payload = "ctrl+alt+y",
  output_type = "alert",
  output_payload = "boom"
}, ...props: any) => {
  const [msg, setMsg] = useState('hacked by Blade');
  const [expanded, setExpanded] = useState<string | false>(false);
  const removeShortcut = useStore((state) => state.removeShortcut);

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  return (
    <Stack direction={"row"} style={{ borderTop: '1px solid #bbb', width: '100%' }} {...props}>
      <Accordion style={{ flexBasis: '50%', marginBottom: 0 }} expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Stack direction={"row"} gap={2}>
            {input_type === 'keyboard' ? <><Keyboard fontSize={'large'} /><Shortkey keystring={input_payload} trigger={() => actions(output_type, output_payload)} /></> : input_type === 'midi' ? <><Piano fontSize='large' /><ShortMidi keystring={input_payload} trigger={() => actions(output_type, output_payload)} /></> : <Help fontSize='large' />}



          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            <Button size='small' sx={{ mr: 2 }} onClick={() => removeShortcut(input_payload, input_type)}><Delete />Delete</Button>
            <Button disabled size='small' sx={{ mr: 2 }}><Edit />Edit</Button>
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Card style={{ flexBasis: '50%', display: 'flex', alignItems: 'center' }}>
        <Button variant='outlined' disabled size='small' sx={{ mr: 2 }}>{output_type.toUpperCase()}</Button>
        <Typography variant='button'>{output_payload}</Typography>
      </Card>
    </Stack>
  );
};

export default IoRow;

import { useState } from 'react';
import { Input, Stack, Accordion, AccordionSummary, Typography, AccordionDetails, Card, Button, IconButton } from '@mui/material';

import Shortkey from '@/components/Shortkey';
import { Delete, Edit, ExpandMore, Keyboard } from '@mui/icons-material';
import { useStore } from '@/store/useStore';


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

  const actions = async() => {
    if (output_type === 'wled') {      
      const call = await fetch(output_payload)
      call && console.log("wled", call)
    } 
    else if (output_type === 'http') {      
      const call = await fetch(output_payload)
      call && console.log("http", call)
    } 
    else if (output_type === 'speak') {      
      speechHandler(spk, output_payload)      
    } 
    else {
      alert(output_payload)
    }
  }

  const spk = new SpeechSynthesisUtterance()

  const speechHandler = (spk: SpeechSynthesisUtterance, text: string) => {
    spk.text = text
    window.speechSynthesis.speak(spk)
  }
  return (
    <Stack direction={"row"} style={{ borderTop: '1px solid #bbb', width: '100%' }} {...props}>
      <Accordion style={{ flexBasis: '50%', marginBottom: 0 }} expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Stack direction={"row"} gap={2}>
            <Keyboard fontSize={'large'} />
            <Shortkey keystring={input_payload} trigger={() => actions()} />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
          <Button size='small' sx={{ mr: 2 }} onClick={()=>removeShortcut(input_payload, input_type)}><Delete />Delete</Button>
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

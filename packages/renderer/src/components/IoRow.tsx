import { useState } from 'react';
import { Input, Stack, Accordion, AccordionSummary, Typography, AccordionDetails, Card, Button, IconButton } from '@mui/material';

import Shortkey from '@/components/Shortkey';
import { Delete, Edit, ExpandMore, Help, Keyboard, Piano, Videocam } from '@mui/icons-material';
import { useStore } from '@/store/useStore';
import actions from './Actions';
import ShortMidi from './ShortMidi';

import { MqttContext } from "@/pages/example/Example";
import { useContext } from "react";
import mqttService from './mqttService';

const IoRow = ({
  input_type = "keyboard",
  input_payload = "ctrl+alt+y",
  output_type = "alert",
  output_payload = "boom",
  style = {},
  theClient,
  useMqtt = false
}: any) => {
  const [expanded, setExpanded] = useState<string | false>(false);
  const removeShortcut = useStore((state) => state.removeShortcut);
  // const client = useContext(MqttContext);
  const client = theClient || mqttService.getClient(console.log);

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const handleActions = () => actions(output_type, output_payload, client)

  return (
    <Stack direction={"row"} style={{ borderTop: '1px solid #bbb', width: '100%', ...style }} >
      <Accordion style={{ flexBasis: '50%', marginBottom: 0 }} expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Stack direction={"row"} gap={2}>
            {input_type === 'keyboard' ? <><Keyboard fontSize={'large'} /><Shortkey keystring={input_payload} trigger={() => handleActions()} /></>
              : input_type === 'midi' ? <><Piano fontSize='large' /><ShortMidi keystring={input_payload} trigger={() => handleActions()} /></>
                : input_type === 'cam' ? <><Videocam fontSize='large' /><ShortMidi keystring={input_payload} trigger={() => handleActions()} /></>
                  : <Help fontSize='large' />}



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

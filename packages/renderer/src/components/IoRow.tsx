import { useState } from 'react';
import { Input, Stack, Accordion, AccordionSummary, Typography, AccordionDetails, Card, Button } from '@mui/material';

import Shortkey from '@/components/Shortkey';
import { ExpandMore, Keyboard } from '@mui/icons-material';


const IoRow = ({
  input_type="keyboard",
  input_payload="ctrl+alt+y",
  output_type="alert",
  ouput_payload="boom"
}, ...props: any) => {
  const [msg, setMsg] = useState('hacked by Blade');
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };   

  return (
    <Stack direction={"row"} style={{ borderTop: '1px solid #bbb', width: '100%' }} {...props}>
          <Accordion style={{ flexBasis: '50%', marginBottom: 0}} expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel1bh-content"
              id="panel1bh-header"
            >
              <Stack direction={"row"} gap={2}>
                <Keyboard fontSize={'large'} />
                <Shortkey keystring={input_payload} trigger={()=>alert(ouput_payload)} /> 
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Advanced Settings ...
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Card style={{ flexBasis: '50%', display: 'flex', alignItems: 'center'}}>
            <Button variant='outlined' disabled size='small' sx={{ mr: 2}}>ALERT</Button>
            <Typography variant='button'>{ouput_payload}</Typography>
          </Card>
        </Stack> 
  );
};

export default IoRow;

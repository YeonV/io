import { useMemo, useState } from 'react'
import {
  Stack,
  Accordion,
  AccordionSummary,
  Typography,
  AccordionDetails,
  Card,
  Button,
} from '@mui/material'
import { Delete, Edit, ExpandMore, Help } from '@mui/icons-material'
import { Row, useMainStore } from '@/store/mainStore'

const IoRow = ({ row }: { row: Row }) => {
  const [expanded, setExpanded] = useState<string | false>(false)
  // const removeShortcut = useStore((state) => state.removeShortcut);
  // const client = useContext(MqttContext);
  // const client = theClient || mqttService.getClient(console.log);
  const modules = useMainStore((state) => state.modules)
  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false)
    }

  //   const handleActions = () => actions(output_type, output_payload);
  const selectedInputModule = useMemo(() => {
    if (!row.input || !row.inputModule) {
      return undefined
    }
    return modules[row.inputModule]
  }, [modules, row])

  selectedInputModule?.useInputActions?.(row)

  const selectedOutputModule = useMemo(() => {
    if (!row.output || !row.outputModule) {
      return undefined
    }
    return modules[row.outputModule]
  }, [modules, row])

  selectedOutputModule?.useOutputActions?.(row)

  const SelectedModuleInputDisplay = useMemo(() => {
    return selectedInputModule?.InputDisplay
  }, [selectedInputModule])

  const SelectedModuleOutputDisplay = useMemo(() => {
    return selectedOutputModule?.OutputDisplay
  }, [selectedOutputModule])

  return (
    <Stack
      direction={'row'}
      style={{ borderTop: '1px solid #bbb', width: '100%' }}
    >
      <Accordion
        style={{ flexBasis: '50%', marginBottom: 0 }}
        expanded={expanded === 'panel1'}
        onChange={handleChange('panel1')}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls='panel1bh-content'
          id='panel1bh-header'
        >
          <Stack direction={'row'} gap={2}>
            {SelectedModuleInputDisplay ? (
              <SelectedModuleInputDisplay
                input={row.input}
              ></SelectedModuleInputDisplay>
            ) : (
              <Help fontSize='large' />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            <Button
              size='small'
              sx={{ mr: 2 }}
              onClick={() => console.log('TODO: remove row')}
            >
              <Delete />
              Delete
            </Button>
            <Button disabled size='small' sx={{ mr: 2 }}>
              <Edit />
              Edit
            </Button>
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Card style={{ flexBasis: '50%', display: 'flex', alignItems: 'center' }}>
        {SelectedModuleOutputDisplay ? (
          <SelectedModuleOutputDisplay
            output={row.output}
          ></SelectedModuleOutputDisplay>
        ) : (
          <Help fontSize='large' />
        )}
      </Card>
    </Stack>
  )
}

export default IoRow

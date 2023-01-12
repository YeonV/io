import { useMemo, useState } from 'react'
import {
  Stack,
  IconButton,
  Card,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import { Delete, Edit, ExpandMore, Help, PlayArrow } from '@mui/icons-material'
import { Row, useMainStore } from '@/store/mainStore'

const IoRow = ({ row }: { row: Row }) => {
  const [open, setOpen] = useState(false)
  const deleteRow = useMainStore((state) => state.deleteRow)

  const handlePopupClickOpen = () => {
    setOpen(true)
  }

  const handlePopupClose = () => {
    setOpen(false)
  }
  const handleDelete = () => {
    deleteRow(row)
    setOpen(false)
  }

  const modules = useMainStore((state) => state.modules)

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
      <Card
        style={{
          flexBasis: '50%',
          marginBottom: 0,
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
        }}
      >
        <Stack direction={'row'} sx={{ alignItems: 'center', color: '#666' }}>
          {SelectedModuleInputDisplay ? (
            <SelectedModuleInputDisplay
              input={row.input}
            ></SelectedModuleInputDisplay>
          ) : (
            <Help fontSize='large' />
          )}
        </Stack>
      </Card>
      <Card
        style={{
          flexBasis: '50%',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            flexGrow: 1,
            textAlign: 'left',
            display: 'flex',
            color: '#666',
            pointerEvents: 'none',
          }}
        >
          {SelectedModuleOutputDisplay ? (
            <SelectedModuleOutputDisplay
              output={row.output}
            ></SelectedModuleOutputDisplay>
          ) : (
            <Help fontSize='large' />
          )}
        </div>
        <div>
          <IconButton
            color='primary'
            sx={{ mr: 1 }}
            onClick={handlePopupClickOpen}
          >
            <Delete />
          </IconButton>
          <IconButton
            sx={{ mr: 1 }}
            color='primary'
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent(`io_input`, { detail: row.id })
              )
            }
          >
            <PlayArrow />
          </IconButton>
        </div>
        <Dialog
          open={open}
          onClose={handlePopupClose}
          aria-labelledby='alert-dialog-title'
          aria-describedby='alert-dialog-description'
        >
          <DialogTitle id='alert-dialog-title'>
            {'Are you sure you want to delete this row??'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id='alert-dialog-description'>
              This can't be undone. You will need to re-create this row from
              scratch.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePopupClose}>Cancel</Button>
            <Button onClick={handleDelete} color='error'>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Stack>
  )
}

export default IoRow

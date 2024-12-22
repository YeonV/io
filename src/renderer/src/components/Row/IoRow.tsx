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
  useMediaQuery
} from '@mui/material'
import { Delete, Help, PlayArrow } from '@mui/icons-material'
import { Row, useMainStore } from '@/store/mainStore'

const IoRow = ({ row }: { row: Row }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  const mobile = useMediaQuery('(max-width:600px)')
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

  selectedInputModule?.useInputActions?.(row)

  return (
    <Stack
      direction={mobile ? 'column' : 'row'}
      style={{
        borderTop: mobile ? 0 : '1px solid #666',
        width: mobile ? '95%' : '100%',
        margin: mobile ? '1rem auto' : 0,
        borderRadius: mobile ? 10 : 0,
        overflow: mobile ? 'hidden' : 'unset'
      }}
    >
      <Card
        style={{
          flexBasis: desktop ? '50%' : 'calc(50% - 48px)',
          marginBottom: 0,
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          padding: mobile ? '10px 0 0px 10px' : '0 0 0 10px',
          borderRadius: 0,
          boxShadow: 'none'
        }}
      >
        {SelectedModuleInputDisplay ? (
          <SelectedModuleInputDisplay input={row.input}></SelectedModuleInputDisplay>
        ) : (
          <Help fontSize="large" />
        )}
        {mobile && <div style={{ width: '96px', flexShrink: 0 }}></div>}
      </Card>
      <Card
        style={{
          flexBasis: desktop ? '50%' : 'calc(50% + 48px)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          justifyContent: 'space-between',
          borderRadius: 0,
          boxShadow: 'none'
        }}
      >
        <div
          style={{
            flexGrow: 1,
            textAlign: 'left',
            display: 'flex',
            color: '#666',
            pointerEvents: 'none',
            marginBottom: mobile ? 10 : 0
          }}
        >
          {SelectedModuleOutputDisplay ? (
            <SelectedModuleOutputDisplay output={row.output}></SelectedModuleOutputDisplay>
          ) : (
            <Help fontSize="large" />
          )}
        </div>
        <div>
          <IconButton color="primary" sx={{ mr: 1 }} onClick={handlePopupClickOpen}>
            <Delete />
          </IconButton>
          <IconButton
            sx={{ mr: 1 }}
            color="primary"
            onClick={() => window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))}
          >
            <PlayArrow />
          </IconButton>
        </div>
        <Dialog
          open={open}
          onClose={handlePopupClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {'Are you sure you want to delete this row??'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              This can&apos;t be undone. You will need to re-create this row from scratch.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePopupClose}>Cancel</Button>
            <Button onClick={handleDelete} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Stack>
  )
}

export default IoRow

// src/renderer/src/components/inputs/ToggleEditorView.tsx
import type { ReactNode, Dispatch, SetStateAction } from 'react' // Added KeyboardEvent
import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Paper,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Tooltip // Added Tooltip
} from '@mui/material'
import {
  DataObject as CodeViewIcon,
  EditNote as UiViewIcon,
  WarningAmber as WarningIcon,
  Save as SaveIcon, // Added SaveIcon
  Undo as RevertIcon // Added RevertIcon
} from '@mui/icons-material'
import JSONInput from 'react-json-editor-ajrm'
import mainLocale from './en'
import { useSnackbar } from 'notistack'

export interface ToggleEditorViewProps<T extends object | any[]> {
  /* ... same as before ... */ objectData: T
  stringData: string
  onObjectChange: (newObjectData: T) => void
  onStringChange: (newStringData: string) => void
  children: (
    data: T,
    setData: (data: T) => void,
    setUiDirty: Dispatch<SetStateAction<boolean>>
  ) => ReactNode
  jsonInputId: string
  jsonInputHeight?: string
  jsonInputColors?: Record<string, string>
  jsonInputStyle?: Record<string, any>
  title?: string
  validateStringToObject?: (jsonString: string) => {
    isValid: boolean
    parsedObject?: T
    error?: string
  }
  validateObjectToString?: (obj: T) => {
    isValid: boolean
    stringifiedObject?: string
    error?: string
  }
  disableSaveShortcut?: boolean // New prop to disable global shortcut if needed
}

const defaultJsonColors = {
  /* ... */ background: '#1e1e1e',
  default: '#e0e0e0',
  string: '#ce9178',
  number: '#b5cea8',
  colon: '#e0e0e0',
  keys: '#9cdcfe',
  error: '#f44747'
}
const defaultJsonStyle = {
  /* ... */ outerBox: { width: '100%' },
  body: { fontSize: '13px' },
  container: { border: '1px solid #444', borderRadius: '4px' }
}

export const ToggleEditorView = <T extends object | any[]>({
  objectData,
  stringData,
  onObjectChange,
  onStringChange,
  children,
  jsonInputId,
  jsonInputHeight = '250px',
  jsonInputColors = defaultJsonColors,
  jsonInputStyle = defaultJsonStyle,
  title,
  validateStringToObject,
  validateObjectToString,
  disableSaveShortcut = false // Default to shortcut enabled
}: ToggleEditorViewProps<T>) => {
  const [currentView, setCurrentView] = useState<'ui' | 'code'>('ui')
  const [isUiDirty, setIsUiDirty] = useState(false)
  const [isCodeDirty, setIsCodeDirty] = useState(false)
  const [jsonParseError, setJsonParseError] = useState<string | null>(null)

  const [confirmSwitchDialogOpen, setConfirmSwitchDialogOpen] = useState(false)
  const [targetView, setTargetView] = useState<'ui' | 'code'>('ui')

  const { enqueueSnackbar } = useSnackbar()

  const [internalObjectData, setInternalObjectData] = useState<T>(objectData)
  const [internalStringData, setInternalStringData] = useState<string>(stringData)

  useEffect(() => {
    setInternalObjectData(objectData)
    setIsUiDirty(false)
  }, [objectData])

  useEffect(() => {
    setInternalStringData(stringData)
    setIsCodeDirty(false)
    setJsonParseError(null)
  }, [stringData])

  const attemptCommitUiChanges = useCallback((): boolean => {
    if (!isUiDirty) {
      // enqueueSnackbar('No UI changes to apply.', { variant: 'info', autoHideDuration: 2000 });
      return true // No changes to commit
    }
    // ... (validation logic from before) ...
    let validationResult = {
      isValid: true,
      stringifiedObject: JSON.stringify(internalObjectData, null, 2),
      error: undefined as string | undefined
    }
    if (validateObjectToString) {
      const result = validateObjectToString(internalObjectData)
      validationResult = {
        isValid: result.isValid,
        stringifiedObject: result.stringifiedObject ?? '',
        error: result.error
      }
    }

    if (validationResult.isValid && validationResult.stringifiedObject !== '') {
      onObjectChange(internalObjectData)
      onStringChange(validationResult.stringifiedObject)
      // setInternalStringData(validationResult.stringifiedObject); // Parent prop change will trigger sync
      setIsUiDirty(false)
      enqueueSnackbar('UI changes applied.', { variant: 'success', autoHideDuration: 2000 })
      return true
    } else {
      enqueueSnackbar(
        `Error applying UI changes: ${validationResult.error || 'Validation failed.'}`,
        { variant: 'error' }
      )
      return false
    }
  }, [
    isUiDirty,
    internalObjectData,
    validateObjectToString,
    onObjectChange,
    onStringChange,
    enqueueSnackbar
  ])

  const attemptCommitCodeChanges = useCallback((): boolean => {
    if (!isCodeDirty) {
      // enqueueSnackbar('No Code changes to apply.', { variant: 'info', autoHideDuration: 2000 });
      return true
    }
    // ... (validation logic from before) ...
    let validationResult = {
      isValid: true,
      parsedObject: undefined as T | undefined,
      error: undefined as string | undefined
    }
    try {
      const parsed = JSON.parse(internalStringData) as T // Attempt parse first
      validationResult.parsedObject = parsed
      if (validateStringToObject) {
        // Then run custom validation if provided
        const customValidation = validateStringToObject(internalStringData)
        if (!customValidation.isValid) {
          validationResult.isValid = false
          validationResult.error = customValidation.error
        } else {
          // Ensure custom validation also returns the parsed object if it re-parses
          validationResult.parsedObject = customValidation.parsedObject || parsed
        }
      }
    } catch (e: any) {
      validationResult = {
        isValid: false,
        parsedObject: undefined,
        error: `Invalid JSON: ${e.message}`
      }
    }

    if (validationResult.isValid && validationResult.parsedObject !== undefined) {
      onStringChange(internalStringData)
      onObjectChange(validationResult.parsedObject)
      // setInternalObjectData(validationResult.parsedObject); // Parent prop change will trigger sync
      setIsCodeDirty(false)
      setJsonParseError(null)
      enqueueSnackbar('Code changes applied.', { variant: 'success', autoHideDuration: 2000 })
      return true
    } else {
      setJsonParseError(validationResult.error || 'Invalid JSON structure.')
      enqueueSnackbar(
        `Error in Code Editor: ${validationResult.error || 'Invalid JSON.'}. Please fix and apply.`,
        { variant: 'error' }
      )
      return false
    }
  }, [
    isCodeDirty,
    internalStringData,
    validateStringToObject,
    onStringChange,
    onObjectChange,
    enqueueSnackbar
  ])

  const handleExplicitSaveCurrentView = () => {
    if (currentView === 'ui') {
      attemptCommitUiChanges()
    } else {
      attemptCommitCodeChanges()
    }
  }

  // CTRL+S / CMD+S handler
  useEffect(() => {
    if (disableSaveShortcut) return

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        // Only save if the respective view has focus or this component is "active"
        // For simplicity, we'll save the currently displayed view if it's dirty.
        console.log(
          '[ToggleEditorView] Ctrl+S detected, attempting to apply changes for current view:',
          currentView
        )
        if (currentView === 'ui' && isUiDirty) {
          attemptCommitUiChanges()
        } else if (currentView === 'code' && isCodeDirty) {
          attemptCommitCodeChanges()
        } else {
          // enqueueSnackbar('No unsaved changes in current view to apply with Ctrl+S.', { variant: 'info', autoHideDuration: 1500 });
        }
      }
    }
    // Add listener to the document or a specific focused wrapper if preferred
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    currentView,
    isUiDirty,
    isCodeDirty,
    attemptCommitUiChanges,
    attemptCommitCodeChanges,
    disableSaveShortcut,
    enqueueSnackbar
  ])

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    newView: 'ui' | 'code' | null
  ) => {
    // ... (same as before, but prompt says "apply" instead of "save")
    if (newView === null || newView === currentView) return
    setTargetView(newView)

    if (currentView === 'ui' && isUiDirty) {
      setConfirmSwitchDialogOpen(true)
    } else if (currentView === 'code' && isCodeDirty) {
      let isValidJson = false
      try {
        JSON.parse(internalStringData)
        isValidJson = true
        setJsonParseError(null)
      } catch (e: any) {
        setJsonParseError(`Invalid JSON: ${e.message}. Fix before switching or discard.`)
        enqueueSnackbar(`Invalid JSON. Fix or discard changes.`, { variant: 'error' })
        return
      }
      if (isValidJson) {
        setConfirmSwitchDialogOpen(true)
      }
    } else {
      performSwitch(newView)
    }
  }

  const performSwitch = (toView: 'ui' | 'code') => {
    /* ... (same as before, ensures internal states are synced based on what was last valid) ... */
    if (toView === 'code') {
      // If UI was clean, internalObjectData is objectData. Stringify it.
      // If UI was dirty and changes were committed, onStringChange updated parent, which updated stringData, which updated internalStringData.
      // If UI was dirty and changes discarded, internalObjectData reverted to objectData. Stringify it.
      setInternalStringData(JSON.stringify(internalObjectData, null, 2))
    } else {
      // Switching TO UI View
      try {
        const parsed = JSON.parse(internalStringData) as T
        setInternalObjectData(parsed)
        setJsonParseError(null)
      } catch (e: any) {
        setJsonParseError(`Error parsing JSON for UI view: ${e.message}`)
        enqueueSnackbar(
          `Error preparing UI view from code. JSON might be invalid. Reverting to last good UI state.`,
          { variant: 'error' }
        )
        // Revert internalObjectData to the prop objectData to ensure UI view is stable
        setInternalObjectData(objectData)
        // Optionally, force switch back to 'code' view or alert user more strongly
        // For now, we allow switch but UI shows last good state. Code view retains the error.
      }
    }
    setCurrentView(toView)
    setIsUiDirty(false) // Switching makes current view "clean" relative to its new source
    setIsCodeDirty(false)
  }

  const handleConfirmDialogChoice = (action: 'save' | 'discard' | 'cancel') => {
    setConfirmSwitchDialogOpen(false)
    if (action === 'cancel') return

    if (action === 'discard') {
      if (currentView === 'ui') {
        setInternalObjectData(objectData)
        setIsUiDirty(false)
      } else {
        setInternalStringData(stringData)
        setIsCodeDirty(false)
        setJsonParseError(null)
      }
      performSwitch(targetView)
      return
    }
    // Action is 'save' (apply)
    let commitSuccessful = false
    if (currentView === 'ui') commitSuccessful = attemptCommitUiChanges()
    else commitSuccessful = attemptCommitCodeChanges()

    if (commitSuccessful) performSwitch(targetView)
  }

  const handleCodeInputChange = (data: { json?: string; error?: any }) => {
    /* ... (same as before, sets isCodeDirty) ... */
    if (data.json !== undefined) {
      setInternalStringData(data.json)
      setIsCodeDirty(true)
      if (data.error) {
        setJsonParseError(`JSON Syntax Error: ${data.error.reason || 'Invalid'}`)
      } else {
        setJsonParseError(null)
      }
    }
  }

  const handleRevertCurrentViewChanges = () => {
    if (currentView === 'ui') {
      if (isUiDirty) {
        setInternalObjectData(objectData) // Revert to prop
        setIsUiDirty(false)
        enqueueSnackbar('UI changes reverted to last applied state.', {
          variant: 'info',
          autoHideDuration: 2000
        })
      } else {
        // enqueueSnackbar('No unsaved UI changes to revert.', { variant: 'info', autoHideDuration: 2000 });
      }
    } else {
      // currentView === 'code'
      if (isCodeDirty || jsonParseError) {
        setInternalStringData(stringData) // Revert to prop
        setIsCodeDirty(false)
        setJsonParseError(null)
        enqueueSnackbar('Code changes reverted to last applied state.', {
          variant: 'info',
          autoHideDuration: 2000
        })
      } else {
        // enqueueSnackbar('No unsaved Code changes or errors to revert.', { variant: 'info', autoHideDuration: 2000 });
      }
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 0, mt: 2, borderColor: 'rgba(255,255,255,0.12)' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.focus' }}
      >
        {title && (
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            {title}
          </Typography>
        )}
        <Box
          sx={{
            flexGrow: title ? 1 : 0,
            display: 'flex',
            justifyContent: title ? 'flex-end' : 'flex-start',
            alignItems: 'center',
            gap: 1
          }}
        >
          {/* Revert Button for current view */}
          {(currentView === 'ui' && isUiDirty) ||
          (currentView === 'code' && (isCodeDirty || jsonParseError)) ? (
            <Tooltip title="Revert unapplied changes in this view">
              <Button
                size="small"
                onClick={handleRevertCurrentViewChanges}
                startIcon={<RevertIcon />}
                color="warning"
                variant="text"
              >
                Revert
              </Button>
            </Tooltip>
          ) : null}

          {/* Apply Button for current view */}
          {(currentView === 'ui' && isUiDirty) ||
          (currentView === 'code' && isCodeDirty && !jsonParseError) ? (
            <Tooltip title="Apply changes made in this view (Ctrl+S / Cmd+S)">
              <Button
                size="small"
                onClick={handleExplicitSaveCurrentView}
                startIcon={<SaveIcon />}
                color="primary" // Or "success"
                variant="contained"
              >
                Apply
              </Button>
            </Tooltip>
          ) : null}

          <ToggleButtonGroup
            value={currentView}
            exclusive
            onChange={handleViewChange}
            aria-label="Editor View"
            size="small"
          >
            <ToggleButton value="ui" aria-label="UI View">
              <UiViewIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} /> UI
            </ToggleButton>
            <ToggleButton value="code" aria-label="Code View">
              <CodeViewIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} /> Code
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Stack>

      <Box sx={{ p: 2 }}>
        {currentView === 'ui' &&
          children(
            internalObjectData,
            (newData) => {
              setInternalObjectData(newData)
              setIsUiDirty(true)
            },
            setIsUiDirty
          )}
        {currentView ===
          'code' /* ... JSONInput and jsonParseError Alert (same as before) ... */ && (
          <>
            <JSONInput
              id={jsonInputId}
              placeholder={(() => {
                try {
                  return JSON.parse(internalStringData)
                } catch {
                  return Array.isArray(internalObjectData) ? [] : {}
                }
              })()}
              onChange={handleCodeInputChange} // This sets internalStringData and isCodeDirty
              locale={mainLocale}
              colors={jsonInputColors}
              style={jsonInputStyle}
              height={jsonInputHeight}
              width="100%"
              confirmGood={false}
              reset={false}
            />
            {jsonParseError && (
              <Alert severity="error" sx={{ mt: 1 }} icon={<WarningIcon fontSize="inherit" />}>
                {' '}
                {jsonParseError}{' '}
              </Alert>
            )}
          </>
        )}
      </Box>

      <Dialog
        open={confirmSwitchDialogOpen}
        onClose={() => handleConfirmDialogChoice('cancel')}
        maxWidth="xs"
      >
        <DialogTitle>Unapplied Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unapplied changes in the current editor view. Do you want to apply them before
            switching?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConfirmDialogChoice('cancel')}>Cancel Switch</Button>
          <Button onClick={() => handleConfirmDialogChoice('discard')} color="warning">
            Discard Changes
          </Button>
          <Button onClick={() => handleConfirmDialogChoice('save')} variant="contained">
            Apply & Switch
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

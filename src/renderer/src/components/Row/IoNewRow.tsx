// src/renderer/src/components/Row/IoNewRow.tsx

import { produce } from 'immer'
// Need useState for internal state, useEffect for prefill logic
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Stack, Box, Typography } from '@mui/material' // Add Box, Typography, CircularProgress
import { v4 as uuidv4 } from 'uuid'
import { InputSelector } from './InputSelector'
import { OutputSelector } from './OutputSelector'
import { useMainStore } from '@/store/mainStore'
import type { Row, InputData, OutputData } from '@shared/types' // Use shared types
// REMOVE (if not used elsewhere): import { useStore } from '@/store/OLD/useStore';
import { useShallow } from 'zustand/react/shallow'
import { log } from '@/utils'

// Define the structure for prefill data
export interface PrefillData {
  inputModule: Row['inputModule']
  input: Partial<InputData> // Allow partial input data prefill
}

// Modify props to accept prefill data and the function to start a new prefilled row
export const IoNewRow = ({
  onComplete,
  startNewPrefilledRow, // Function to trigger the next step
  initialPrefill // Optional initial prefill data
}: {
  onComplete: () => void
  startNewPrefilledRow: (prefill: PrefillData) => void
  initialPrefill?: PrefillData
}) => {
  const addRow = useMainStore(useShallow((state) => state.addRow))
  // REMOVE (if not needed for MIDI anymore): const setInput = useStore(useShallow((state) => state.setInput));

  // Internal state for the row being built
  const [templateRow, setRow] = useState<Partial<Row> & Pick<Row, 'id'>>(() => ({
    id: uuidv4(),
    inputModule: initialPrefill?.inputModule,
    input: initialPrefill?.input ? { ...(initialPrefill.input as InputData) } : undefined // Initialize from prefill
    // outputModule and output start empty
  }))

  // State to manage if the input side is locked due to prefill
  const [isInputLocked, setIsInputLocked] = useState(!!initialPrefill)
  // State to store the 'separateOffAction' flag from Alexa input
  const [separateOffAction, setSeparateOffAction] = useState(false)

  // Effect to handle initial prefill when component mounts or prefill prop changes
  useEffect(() => {
    if (initialPrefill) {
      setRow({
        id: uuidv4(), // Generate new ID for the new row instance
        inputModule: initialPrefill.inputModule,
        input: { ...(initialPrefill.input as InputData) } // Ensure full InputData structure
      })
      setIsInputLocked(true)
      // Reset separateOffAction flag for the new prefilled row
      setSeparateOffAction(false)
    } else {
      // Reset if prefill is removed (e.g., navigating away and back)
      // setRow({ id: uuidv4() }); // Or keep existing if suitable
      setIsInputLocked(false)
    }
  }, [initialPrefill])

  const modules = useMainStore((state) => state.modules)

  // Memoized selectors for Edit components (Input side depends on isInputLocked)
  const selectedInputModule = useMemo(() => {
    if (!templateRow.inputModule) return undefined
    return modules[templateRow.inputModule]
  }, [modules, templateRow.inputModule])

  const selectedOutputModule = useMemo(() => {
    if (!templateRow.outputModule) return undefined
    return modules[templateRow.outputModule]
  }, [modules, templateRow.outputModule])

  const SelectedModuleInputEdit = useMemo(() => {
    // Only show edit component if input is selected AND not locked
    if (isInputLocked) return undefined
    return selectedInputModule?.InputEdit
  }, [selectedInputModule, isInputLocked])

  const SelectedModuleOutputEdit = useMemo(() => {
    return selectedOutputModule?.OutputEdit
  }, [selectedOutputModule])

  // --- Handlers ---

  // Called by InputSelector when a module/input type is chosen
  const handleInputSelect = useCallback(
    (modId: Row['inputModule'], inp: Omit<InputData, 'data'>) => {
      setRow((row) => ({
        ...row,
        inputModule: modId,
        input: { ...inp, data: {} } // Initialize with empty data
        // Reset output if input changes? Optional.
        // outputModule: undefined,
        // output: undefined,
      }))
      setSeparateOffAction(false) // Reset flag on new input selection
      log.info('Input selected:', modId, inp)
    },
    []
  )

  // Called by OutputSelector
  const handleOutputSelect = useCallback(
    (modId: Row['outputModule'], outp: Omit<OutputData, 'data'>) => {
      setRow((row) => ({
        ...row,
        outputModule: modId,
        output: { ...outp, data: {} } // Initialize with empty data
      }))
      log.info('Output selected:', modId, outp)
    },
    []
  )

  // Called by the InputEdit component's onChange
  // Needs to handle the combined data payload from Alexa ({ value, separateOffAction })
  const handleInputChange = useCallback((data: Record<string, any>) => {
    setRow(
      produce((draft) => {
        if (draft.input) {
          // If Alexa module sends specific structure, handle it
          if (
            draft.inputModule === 'alexa-module' &&
            Object.prototype.hasOwnProperty.call(data, 'separateOffAction')
          ) {
            draft.input.data.value = data.value // deviceName stored in 'value'
            setSeparateOffAction(data.separateOffAction) // Update local state flag
            // Store flag in data as well? Or rely on local state only before save? Let's store it.
            draft.input.data.separateOffAction = data.separateOffAction
          } else {
            // Default: merge data
            Object.assign(draft.input.data, data)
          }
        }
      })
    )
    log.info('Input data changed:', data)
  }, []) // Add dependencies if needed, maybe templateRow.inputModule

  // Called by the OutputEdit component's onChange
  const handleOutputChange = useCallback((data: Record<string, any>) => {
    setRow(
      produce((draft) => {
        if (draft.output) {
          Object.assign(draft.output.data, data)
        }
      })
    )
    log.info('Output data changed:', data)
  }, [])

  // --- Save Logic ---
  const handleSave = () => {
    // --- Guard clause (same as before) ---
    if (
      !templateRow.input ||
      !templateRow.inputModule ||
      !templateRow.output ||
      !templateRow.outputModule
    ) {
      /* ... */ return
    }

    // --- Determine Alexa State ---
    const isAlexa = templateRow.inputModule === 'alexa-module'
    const currentIsOffRow = isAlexa && templateRow.input?.data.triggerState === 'off'
    let finalTriggerState: 'on' | 'off' | 'any' | undefined = undefined
    let triggerNextPrefill: PrefillData | null = null

    if (isAlexa) {
      if (separateOffAction && !currentIsOffRow) {
        finalTriggerState = 'on'
        // Prepare prefill data for the "off" row
        triggerNextPrefill = {
          inputModule: 'alexa-module',
          input: {
            name: templateRow.input.name,
            icon: templateRow.input.icon,
            data: {
              value: templateRow.input.data.value, // deviceName
              triggerState: 'off' // Set state for the next row
            }
          }
        }
      } else if (!separateOffAction && !currentIsOffRow) {
        finalTriggerState = 'any'
      } else if (currentIsOffRow) {
        finalTriggerState = 'off' // It's the prefilled 'off' row
      }
    }

    // --- Construct rowToSave with NEW objects ---
    const rowToSave: Row = {
      id: templateRow.id,
      inputModule: templateRow.inputModule,
      input: {
        // Copy basic input properties
        name: templateRow.input.name,
        icon: templateRow.input.icon,
        // Create a NEW data object
        data: {
          ...templateRow.input.data, // Copy existing data
          // Overwrite/add triggerState if defined for Alexa
          ...(finalTriggerState !== undefined && { triggerState: finalTriggerState }),
          // Remove separateOffAction flag if it exists
          separateOffAction: undefined // Or delete key if preferred
        }
      },
      outputModule: templateRow.outputModule,
      output: {
        // Deep clone output too? Or is shallow copy okay? Shallow is usually fine.
        ...templateRow.output,
        data: { ...templateRow.output.data } // Clone data just in case
      }
    }
    // Remove the key explicitly if setting to undefined isn't enough
    if (rowToSave.input.data.separateOffAction === undefined) {
      delete rowToSave.input.data.separateOffAction
    }

    // --- Legacy MIDI Logic ---
    if (rowToSave.inputModule === 'midi-module') {
      /* ... */
    }

    // --- Add Row & Trigger Next ---
    log.success('Saving row:', rowToSave)
    addRow(rowToSave)

    if (triggerNextPrefill) {
      startNewPrefilledRow(triggerNextPrefill)
    } else {
      onComplete()
    }

    // --- Legacy Alexa Restart Logic ---
    // Maybe only trigger this after BOTH rows are saved? Or maybe not needed?
    // We need to revisit how emulation restart works. Defer for now.
    // if (rowToSave.inputModule === 'alexa-module') {
    //     localStorage.setItem('io-restart-needed', 'yes');
    // }
  }

  // --- Render ---
  const isSaveDisabled =
    !templateRow.input ||
    !templateRow.inputModule ||
    !templateRow.output ||
    !templateRow.outputModule

  return (
    <>
      {/* Add title when configuring the 'Off' row */}
      {isInputLocked && templateRow.input?.data?.triggerState === 'off' && (
        <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', color: 'text.secondary' }}>
          Configure Off action for: {templateRow.input.data.value}
        </Typography>
      )}
      <Stack
        direction={'row'}
        sx={
          {
            /* ... existing styles ... */
          }
        }
      >
        {/* Input Side */}
        <Box
          sx={{
            flexBasis: '50%',
            opacity: isInputLocked ? 0.6 : 1,
            pointerEvents: isInputLocked ? 'none' : 'auto'
          }}
        >
          <InputSelector
            onSelect={handleInputSelect}
            disabled={isInputLocked}
            value={templateRow.input}
          />
          {/* Conditionally render InputEdit OR static display */}
          {templateRow.input &&
            !SelectedModuleInputEdit &&
            isInputLocked &&
            selectedInputModule?.InputDisplay && (
              <Box sx={{ mt: 2, p: 1, border: '1px dashed grey', borderRadius: 1 }}>
                {/* Render InputDisplay component if Edit is not available and input is locked */}
                <selectedInputModule.InputDisplay input={templateRow.input} />
              </Box>
            )}
          {templateRow.input && SelectedModuleInputEdit && (
            <SelectedModuleInputEdit input={templateRow.input} onChange={handleInputChange} />
          )}
          {!templateRow.input && !isInputLocked && (
            <Typography sx={{ mt: 2, color: 'text.disabled' }}>
              Select an input type above.
            </Typography>
          )}
        </Box>

        {/* Output Side */}
        <Box sx={{ flexBasis: '50%', marginLeft: '10px', textAlign: 'left' }}>
          <OutputSelector onSelect={handleOutputSelect} />
          {templateRow.output && SelectedModuleOutputEdit && (
            <SelectedModuleOutputEdit output={templateRow.output} onChange={handleOutputChange} />
          )}
          {!templateRow.output && (
            <Typography sx={{ mt: 2, color: 'text.disabled' }}>
              Select an output type above.
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Action Buttons */}
      <Stack direction={'row'} sx={{ justifyContent: 'center', mt: 2 }}>
        <Button
          variant="contained"
          sx={{ width: 90, mr: '2px' }}
          size="small"
          disabled={isSaveDisabled}
          onClick={handleSave}
        >
          Save
        </Button>
        <Button
          sx={{ width: 90, ml: '10px' }}
          variant="outlined" // Use outlined for Cancel?
          size="small"
          onClick={onComplete} // Always finishes the current "add row" step
        >
          Cancel
        </Button>
      </Stack>
    </>
  )
}

// Note: Default export might need adjustment if using named exports more
export default IoNewRow

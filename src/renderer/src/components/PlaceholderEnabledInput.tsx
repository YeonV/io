// src/renderer/src/components/inputs/PlaceholderEnabledInput.tsx
import type { FC, ChangeEvent, KeyboardEvent } from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Box, TextField, type TextFieldProps, Popper, ClickAwayListener } from '@mui/material' // Added Popper, ClickAwayListener
import { AutocompletePopup, type SuggestionType } from './AutocompletePopup'

export interface Placeholder {
  /* ... same as before ... */ id: string
  label?: string
  description?: string
}
type BaseTextFieldProps = Omit<
  TextFieldProps,
  'value' | 'onChange' | 'onKeyDown' | 'onBlur' | 'inputRef'
>
export interface PlaceholderEnabledInputProps extends BaseTextFieldProps {
  /* ... same as before ... */ value: string
  onChange: (newValue: string) => void
  availablePlaceholders: Placeholder[]
  triggerSequence?: string
}

export const PlaceholderEnabledInput: FC<PlaceholderEnabledInputProps> = ({
  value,
  onChange,
  availablePlaceholders,
  triggerSequence = '{{',
  multiline = false,
  ...restTextFieldProps
}) => {
  const [inputValue, setInputValue] = useState(value)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionType[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  // const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null); // REMOVED - Popper handles
  const [filterText, setFilterText] = useState('')

  const inputRef = useRef<HTMLDivElement>(null) // Ref now on the TextField's root div for Popper anchor
  const actualInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null) // Specific ref for the input/textarea element itself
  const triggerStartIndexRef = useRef<number | null>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  // No getCaretCoordinates needed for Popper's basic placement.
  // Popper positions relative to anchorEl.

  const openSuggestionsPopup = (startIndex: number, currentFilter: string) => {
    const relevantPlaceholders = availablePlaceholders.filter(
      (p) =>
        (p.label || p.id).toLowerCase().includes(currentFilter.toLowerCase()) ||
        p.id.toLowerCase().includes(currentFilter.toLowerCase())
    )
    const suggestionItems: SuggestionType[] = relevantPlaceholders.map((p) => ({
      id: p.id,
      label: p.label || p.id,
      description: p.description
    }))

    if (suggestionItems.length > 0) {
      setSuggestions(suggestionItems)
      setActiveSuggestionIndex(0)
      // setPopupPosition(getCaretCoordinates()); // REMOVED
      setIsPopupOpen(true) // Popper will use inputRef.current as anchor
      triggerStartIndexRef.current = startIndex
      setFilterText(currentFilter)
    } else {
      closeSuggestionsPopup()
    }
  }

  const closeSuggestionsPopup = useCallback(() => {
    setIsPopupOpen(false)
    // No need to reset suggestions immediately, Popper will just hide.
    // Could reset them here if desired: setSuggestions([]);
    setActiveSuggestionIndex(0)
    triggerStartIndexRef.current = null
    setFilterText('')
  }, [])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setInputValue(newValue)
    onChange(newValue)

    const textBeforeCursor = newValue.substring(0, cursorPos)
    const triggerPos = textBeforeCursor.lastIndexOf(triggerSequence)
    const isWithinClosedPlaceholder = () => {
      const nextClosingBraces = newValue.indexOf('}}', triggerPos + triggerSequence.length)
      return nextClosingBraces !== -1 && cursorPos > nextClosingBraces
    }

    if (triggerPos !== -1 && !isWithinClosedPlaceholder() && cursorPos > triggerPos) {
      const currentFilter = textBeforeCursor.substring(triggerPos + triggerSequence.length)
      openSuggestionsPopup(triggerPos, currentFilter) // openSuggestionsPopup now filters
    } else if (isPopupOpen) {
      closeSuggestionsPopup()
    }
  }

  const insertPlaceholder = (placeholderId: string) => {
    const inputElement = actualInputRef.current // Use the ref to the actual input/textarea
    if (!inputElement || triggerStartIndexRef.current === null) return

    const placeholderToInsert = `${triggerSequence}blueprintInput.${placeholderId}}}`
    const textBeforeTrigger = inputValue.substring(0, triggerStartIndexRef.current)
    const currentSelectionStart = inputElement.selectionStart || 0
    const textAfterFilter = inputValue.substring(currentSelectionStart)

    const newValue = textBeforeTrigger + placeholderToInsert + textAfterFilter

    setInputValue(newValue)
    onChange(newValue)
    closeSuggestionsPopup()

    setTimeout(() => {
      const newCursorPos = textBeforeTrigger.length + placeholderToInsert.length
      inputElement.focus()
      inputElement.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleSuggestionSelect = (suggestion: SuggestionType) => {
    insertPlaceholder(suggestion.id)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Type from TextField onKeyDown
    if (!isPopupOpen || suggestions.length === 0) return
    // Standard TextField onKeyDown provides the event.
    // We need to ensure that default browser actions for ArrowUp/Down/Enter/Esc are prevented
    // ONLY when our popup is handling them.
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        e.preventDefault()
        if (suggestions[activeSuggestionIndex]) {
          insertPlaceholder(suggestions[activeSuggestionIndex].id)
        }
        break
      case 'Escape':
      case 'Tab': // Also close on Tab
        e.preventDefault()
        closeSuggestionsPopup()
        break
      default:
        break
    }
  }

  // ClickAwayListener to close popup when clicking outside TextField and Popup
  const handleClickAway = () => {
    if (isPopupOpen) {
      closeSuggestionsPopup()
    }
  }

  return (
    // Use ClickAwayListener to close popup when clicking outside
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box
        sx={{ position: 'relative', width: restTextFieldProps.fullWidth ? '100%' : 'auto' }}
        ref={inputRef /* Popper anchor */}
      >
        <TextField
          {...restTextFieldProps}
          multiline={multiline}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown} // Still need this for keyboard nav
          // onBlur removed - ClickAwayListener is more robust for this
          inputRef={actualInputRef} // Ref to the actual <input> or <textarea>
        />
        <Popper
          open={isPopupOpen && suggestions.length > 0}
          anchorEl={inputRef.current} // Anchor to the TextField's root Box
          placement="bottom-start"
          modifiers={[
            { name: 'offset', options: { offset: [0, 8] } }, // Offset popup slightly below
            { name: 'flip', enabled: true }, // Flip to top if not enough space below
            { name: 'preventOverflow', enabled: true, options: { boundary: 'scrollParent' } } // Prevent overflow
          ]}
          sx={{ zIndex: 1350 }} // Ensure it's above other elements like dialogs
        >
          {/* AutocompletePopup receives the anchorEl (inputRef.current) for width matching */}
          <AutocompletePopup
            suggestions={suggestions}
            activeIndex={activeSuggestionIndex}
            onSelect={handleSuggestionSelect}
            anchorEl={inputRef.current} // Pass the anchor for width matching
          />
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}

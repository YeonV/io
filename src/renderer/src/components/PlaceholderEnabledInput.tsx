import type { FC, ChangeEvent, KeyboardEvent } from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Box, TextField, type TextFieldProps, Popper, ClickAwayListener } from '@mui/material'
import { AutocompletePopup, type SuggestionType } from './AutocompletePopup'

export interface Placeholder {
  id: string
  label?: string
  description?: string
}
type BaseTextFieldProps = Omit<
  TextFieldProps,
  'value' | 'onChange' | 'onKeyDown' | 'onBlur' | 'inputRef'
>
export interface PlaceholderEnabledInputProps extends BaseTextFieldProps {
  value: string
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

  const inputRef = useRef<HTMLDivElement>(null)
  const actualInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const triggerStartIndexRef = useRef<number | null>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

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

      setIsPopupOpen(true)
      triggerStartIndexRef.current = startIndex
    } else {
      closeSuggestionsPopup()
    }
  }

  const closeSuggestionsPopup = useCallback(() => {
    setIsPopupOpen(false)

    setActiveSuggestionIndex(0)
    triggerStartIndexRef.current = null
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
      openSuggestionsPopup(triggerPos, currentFilter)
    } else if (isPopupOpen) {
      closeSuggestionsPopup()
    }
  }

  const insertPlaceholder = (placeholderId: string) => {
    const inputElement = actualInputRef.current
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
    if (!isPopupOpen || suggestions.length === 0) return

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
      case 'Tab':
        e.preventDefault()
        closeSuggestionsPopup()
        break
      default:
        break
    }
  }

  const handleClickAway = () => {
    if (isPopupOpen) {
      closeSuggestionsPopup()
    }
  }

  return (
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
          onKeyDown={handleKeyDown}
          inputRef={actualInputRef}
        />
        <Popper
          open={isPopupOpen && suggestions.length > 0}
          anchorEl={inputRef.current}
          placement="bottom-start"
          modifiers={[
            { name: 'offset', options: { offset: [0, 8] } },
            { name: 'flip', enabled: true },
            { name: 'preventOverflow', enabled: true, options: { boundary: 'scrollParent' } }
          ]}
          sx={{ zIndex: 1350 }}
        >
          {/* AutocompletePopup receives the anchorEl (inputRef.current) for width matching */}
          <AutocompletePopup
            suggestions={suggestions}
            activeIndex={activeSuggestionIndex}
            onSelect={handleSuggestionSelect}
            anchorEl={inputRef.current}
          />
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}

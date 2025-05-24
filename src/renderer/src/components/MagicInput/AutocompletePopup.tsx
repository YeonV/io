// src/renderer/src/components/inputs/AutocompletePopup.tsx
import type { FC } from 'react'
import { Paper, List, ListItemButton, ListItemText, Typography, Box } from '@mui/material'

export interface SuggestionType {
  id: string
  label?: string
  description?: string
}

interface AutocompletePopupProps {
  suggestions: SuggestionType[]
  activeIndex: number
  // position prop is removed, Popper will handle it
  onSelect: (suggestion: SuggestionType) => void
  // onClose can be removed if Popper handles clicks outside or parent manages open state
  anchorEl: HTMLElement | null // For Popper to know what to attach to (width matching)
  // Props passed by Popper.js, including style for positioning
  // These are typically named 'placement' and 'style' if Popper is direct child,
  // but if AutocompletePopup is the child of MUI <Popper>, it gets these implicitly or via context.
  // For simplicity, we'll assume MUI <Popper> handles applying its styles.
}

export const AutocompletePopup: FC<AutocompletePopupProps> = ({
  suggestions,
  activeIndex,
  onSelect,
  anchorEl // Used for width matching
}) => {
  if (!suggestions.length) {
    return null
  }

  return (
    // Paper is now directly the content of MUI Popper
    // It should not have position: 'absolute' itself.
    <Paper
      elevation={4}
      sx={{
        // zIndex: 1350, // Popper's zIndex is usually sufficient or configurable on Popper itself
        maxHeight: 200,
        overflowY: 'auto',
        width: anchorEl ? anchorEl.offsetWidth : 'auto', // Match width of the anchor (TextField)
        minWidth: anchorEl ? anchorEl.offsetWidth : '200px'
      }}
    >
      <List dense disablePadding>
        {suggestions.map((suggestion, index) => (
          <ListItemButton
            key={suggestion.id}
            selected={index === activeIndex}
            onClick={() => onSelect(suggestion)}
            onMouseDown={(e) => e.preventDefault()}
            sx={{
              minHeight: suggestion.description ? 'auto' : '36px',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ListItemText
              primary={
                <Typography variant="body2" component="span">
                  {suggestion.label || suggestion.id}
                </Typography>
              }
              secondary={
                suggestion.description ? (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    component="span"
                    sx={{ ml: 2 }}
                  >
                    {suggestion.description}
                  </Typography>
                ) : null
              }
              slotProps={{
                primary: {
                  sx: {
                    fontWeight: index === activeIndex ? 'fontWeightMedium' : 'fontWeightRegular'
                  }
                }
              }}
            />
            <Box sx={{ ml: 1, flexShrink: 0 }}>
              <Typography variant="caption" color="text.disabled">
                {`{{blueprintInput.${suggestion.id}}}`}
              </Typography>
            </Box>
          </ListItemButton>
        ))}
      </List>
    </Paper>
  )
}

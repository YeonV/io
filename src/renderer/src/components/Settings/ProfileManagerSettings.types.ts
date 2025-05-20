import { ProfileDefinition, Row } from '@shared/types'

// --- Profile Export Data Structure ---
export interface ProfileExportAudioEntry {
  originalFileName: string
  mimeType: string
  base64Data: string // Audio data as base64
}
export interface ProfileExportFormat {
  profile: ProfileDefinition
  rows: Row[]
  // Optional: audioId maps to its data for PlaySound module rows
  audioData?: Record<string, ProfileExportAudioEntry>
}
// --- Profile Editor Dialog ---
export interface ProfileEditorDialogProps {
  open: boolean
  onClose: () => void
  onSave: (profileData: Omit<ProfileDefinition, 'id'> & { id?: string }) => void // id is optional for new
  initialProfile?: ProfileDefinition | null
  allRows: Record<string, Row> // To list rows for inclusion
}

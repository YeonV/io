export interface PlaySoundOutputData {
  audioId?: string // UUID key to find the audio in IndexedDB
  originalFileName?: string // The original name of the file for display

  volume?: number // 0.0 to 1.0 (default should be handled as 1.0 in component)
  cancelPrevious?: boolean // Default should be handled as true in component
  loop?: boolean // Default should be handled as false in component
}

export interface PlaySoundModuleCustomConfig {
  // Example: defaultVolume?: number;
}

// src/renderer/src/modules/PlaySound/PlaySound.types.ts

export interface PlaySoundOutputData {
  audioDataUrl?: string // Stores the Base64 Data URL of the audio content
  originalFileName?: string // The original name of the file selected/dropped by the user for display

  volume?: number // 0.0 to 1.0 (default should be handled as 1.0 in component)
  cancelPrevious?: boolean // Default should be handled as true in component
  loop?: boolean // Default should be handled as false in component
  // playbackRate?: number; // Future addition: Control playback speed
}

export interface PlaySoundModuleCustomConfig {
  // Example for future:
  // defaultVolume?: number;
  // maxConcurrentSounds?: number;
  // For now, no global dynamic config is strictly needed by the current implementation.
}

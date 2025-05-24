export const nuke = async () => {
  const ipcRenderer = window.electron?.ipcRenderer || false

  if (
    !window.confirm(
      'EXTREME DANGER ZONE!\n\nThis will:\n' +
        "- Clear main app's Zustand persisted state (localStorage).\n" +
        "- Clear Deck's localStorage.\n" +
        "- Clear PlaySound module's IndexedDB audio cache.\n" +
        '- Request main process to clear electron-store.\n\n' +
        'The app will then attempt to reload. Are you ABSOLUTELY sure?'
    )
  ) {
    return
  }

  console.warn('[DEV NUKE] Initiating full data reset...')

  // 1. Clear PlaySound Module's IndexedDB (Renderer-side)
  try {
    // We need access to clearAllAudioFromDB, so either import it or make it global for dev
    // For simplicity here, let's assume it's available or PlaySound module handles an event
    if (window.IO_DEV_TOOLS && typeof window.IO_DEV_TOOLS.clearPlaySoundCache === 'function') {
      await window.IO_DEV_TOOLS.clearPlaySoundCache()
      console.log('[DEV NUKE] PlaySound IndexedDB cache cleared.')
    } else {
      console.warn(
        '[DEV NUKE] IO_DEV_TOOLS.clearPlaySoundCache not found. Skipping IndexedDB clear.'
      )
      alert(
        'PlaySound IndexedDB clear function not found. Manual clear might be needed via DevTools > Application.'
      )
    }
  } catch (e) {
    console.error('[DEV NUKE] Error clearing PlaySound IndexedDB:', e)
  }

  // 2. Clear Main App's Zustand Persisted State (localStorage)
  // The key is 'io-v2-storage' from mainStore.ts persist config
  localStorage.removeItem('io-v2-storage')
  console.log('[DEV NUKE] Main app (io-v2-storage) localStorage cleared.')

  // 3. Clear Deck's LocalStorage
  // The key is 'io-deck-v1-storage' from deckStore.ts persist config
  localStorage.removeItem('io-deck-v1-storage')
  console.log('[DEV NUKE] Deck (io-deck-v1-storage) localStorage cleared.')

  // 4. Request Main Process to Clear electron-store
  if (ipcRenderer) {
    try {
      const success = await ipcRenderer.invoke('dev:clear-electron-store')
      if (success) {
        console.log('[DEV NUKE] electron-store cleared by main process.')
      } else {
        console.error('[DEV NUKE] Main process reported failure to clear electron-store.')
        alert('Failed to clear main process store. See main console.')
      }
    } catch (e) {
      console.error("[DEV NUKE] Error invoking 'dev:clear-electron-store':", e)
      alert('Error communicating with main process to clear its store.')
    }
  } else {
    console.warn('[DEV NUKE] ipcRenderer not available, cannot clear electron-store from main.')
  }

  // 5. Hard Reload the application
  alert('Nuke complete! App will now reload to a fresh state.')
  window.location.reload()
}

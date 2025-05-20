// src/renderer/src/store/deckStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Row, ProfileDefinition } from '@shared/types'

// Define the structure for how Deck stores layout and appearance per tile
export interface DeckTileLayout {
  id: string // Corresponds to row.id
  x: number // Pixel position
  y: number // Pixel position
  w: number // In GRID UNITS
  h: number // In GRID UNITS
  // Deck-specific appearance overrides
  buttonColor?: string
  icon?: string // Deck's override for the icon display
  label?: string // Deck's override for the label display
  fontFamily?: string
  iconColor?: string
  textColor?: string
  variant?: 'outlined' | 'text' | 'contained' // Match your Button variants
}
export type DeckProfileLayoutConfig = DeckTileLayout[]

export interface DeckState {
  // Data fetched from main IO app
  allProfiles: Record<string, ProfileDefinition>
  currentIoProfileId: string | null
  rowsForCurrentProfile: Record<string, Row>

  // Deck's own UI state & persisted data
  deckLayouts: Record<string, DeckProfileLayoutConfig> // profileId -> layout config
  showSettings: boolean // For Deck's layout edit mode
  magicNumber: number // Grid cell size (used for rendering, might not need to be in store if Deck.tsx manages it)

  // Actions
  initializeSse: () => void
  closeSse: () => void
  fetchAllProfiles: () => Promise<void>
  fetchRowsForProfile: (profileId: string | null) => Promise<void>
  fetchCurrentActiveIoProfile: () => Promise<void>
  setDeckShowSettings: (show: boolean) => void
  setMagicNumber: (num: number) => void // Action to update magicNumber if needed

  // Action for Rnd drag/resize to update local layout AND sync the tile's full state
  updateAndSyncDeckTileLayout: (
    profileId: string,
    rowId: string,
    layoutChanges: Partial<Pick<DeckTileLayout, 'x' | 'y' | 'w' | 'h'>> // x,y in px; w,h in grid units
  ) => void

  // Action for DeckButton dialog to save ONLY Deck-specific appearance AND sync the tile's full state
  saveAndSyncDeckButtonAppearance: (
    profileId: string,
    rowId: string,
    appearanceChanges: Partial<
      Omit<DeckTileLayout, 'id' | 'x' | 'y' | 'w' | 'h' | 'icon' | 'label'>
    >
    // Note: 'icon' and 'label' here are Deck's *display overrides*, not the ones that sync to main app's Row.output
  ) => void

  // Action for DeckButton to update main app's Row.output.settings (specifically for icon/label that should reflect in main app)
  updateMainAppRowDisplay: (
    rowId: string,
    mainAppDisplayUpdates: { icon?: string; label?: string }
  ) => Promise<void>

  activateIoProfile: (profileId: string | null) => Promise<void> // Tells main app to switch

  // Internal helper for syncing (not typically called directly from components)
  syncSingleDeckTileOverride: (
    profileId: string,
    rowId: string,
    tileData: DeckTileLayout
  ) => Promise<void>
}

let sseEventSource: EventSource | null = null

const DEFAULT_MAGIC_NUMBER = 120 // Default grid cell size

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      allProfiles: {},
      currentIoProfileId: null,
      rowsForCurrentProfile: {},
      deckLayouts: {},
      showSettings: false,
      magicNumber: DEFAULT_MAGIC_NUMBER,

      setMagicNumber: (num: number) => set({ magicNumber: num }),

      initializeSse: () => {
        if (
          sseEventSource &&
          (sseEventSource.readyState === EventSource.OPEN ||
            sseEventSource.readyState === EventSource.CONNECTING)
        ) {
          console.debug('DeckStore SSE: Already connected or connecting.')
          return
        }
        if (sseEventSource) sseEventSource.close()

        console.debug('DeckStore SSE: Attempting to connect to /api/events')
        sseEventSource = new EventSource(`http://${location.hostname}:1337/api/events`)

        sseEventSource.onopen = () => console.debug('DeckStore SSE: Connection opened!')
        sseEventSource.onerror = (error) => console.error('DeckStore SSE: Error occurred', error)

        sseEventSource.addEventListener('io-state-updated', (event) => {
          const eventData = JSON.parse((event as MessageEvent).data)
          console.debug("DeckStore SSE: Received 'io-state-updated' signal!", eventData)
          get().fetchCurrentActiveIoProfile()
          get().fetchAllProfiles()
        })
      },

      closeSse: () => {
        if (sseEventSource) {
          console.debug('DeckStore SSE: Closing SSE connection.')
          sseEventSource.close()
          sseEventSource = null
        }
      },

      fetchAllProfiles: async () => {
        try {
          const res = await fetch(`http://${location.hostname}:1337/api/profiles`)
          if (!res.ok) throw new Error('Failed to fetch profiles')
          const profilesArray: ProfileDefinition[] = await res.json()
          const profilesMap = profilesArray.reduce(
            (acc, p) => {
              acc[p.id] = p
              return acc
            },
            {} as Record<string, ProfileDefinition>
          )
          set({ allProfiles: profilesMap })
        } catch (error) {
          console.error('DeckStore: Failed to fetch profiles', error)
          set({ allProfiles: {} })
        }
      },

      fetchCurrentActiveIoProfile: async () => {
        try {
          const res = await fetch(`http://${location.hostname}:1337/api/active-profile`)
          if (!res.ok) throw new Error('Failed to fetch active profile')
          const data: { activeProfileId: string | null } = await res.json()
          set({ currentIoProfileId: data.activeProfileId })
          await get().fetchRowsForProfile(data.activeProfileId)
        } catch (error) {
          console.error('DeckStore: Failed to fetch active IO profile', error)
          set({ currentIoProfileId: null, rowsForCurrentProfile: {} })
        }
      },

      fetchRowsForProfile: async (profileId: string | null) => {
        const endpoint = profileId
          ? `http://${location.hostname}:1337/api/rows?profileId=${profileId}`
          : `http://${location.hostname}:1337/api/rows?profileId=none` // "none" for all enabled
        try {
          const res = await fetch(endpoint)
          if (!res.ok) throw new Error(`Failed to fetch rows for profile: ${profileId || 'none'}`)
          const rows: Record<string, Row> = await res.json()
          set({ rowsForCurrentProfile: rows })
          if (profileId === null) set({ currentIoProfileId: null }) // Ensure if fetching for "none", currentIoProfileId reflects that
        } catch (error) {
          console.error(
            `DeckStore: Failed to fetch rows for profile: ${profileId || 'none'}`,
            error
          )
          set({ rowsForCurrentProfile: {} })
        }
      },

      setDeckShowSettings: (show) => set({ showSettings: show }),

      // Called by Rnd onDragStop/onResizeStop
      updateAndSyncDeckTileLayout: (
        profileId: string,
        rowId: string,
        layoutChanges: Partial<Pick<DeckTileLayout, 'x' | 'y' | 'w' | 'h'>> // x,y in PX; w,h in GRID UNITS
      ) => {
        let finalTileState: DeckTileLayout | undefined = undefined
        set((state) => {
          const currentProfileLayout = state.deckLayouts[profileId] || []
          const tileIndex = currentProfileLayout.findIndex((tile) => tile.id === rowId)
          let newFullLayoutForProfile: DeckProfileLayoutConfig

          if (tileIndex > -1) {
            finalTileState = { ...currentProfileLayout[tileIndex], ...layoutChanges, id: rowId }
            newFullLayoutForProfile = currentProfileLayout.map(
              (t, i): DeckTileLayout => (i === tileIndex ? (finalTileState as DeckTileLayout) : t)
            )
          } else {
            // New tile being added to layout (e.g. first drag)
            // It should have default appearance from DeckButton if not already in deckLayouts
            // For now, let's assume it might need some basic defaults here if not already set.
            finalTileState = {
              id: rowId,
              x: layoutChanges.x ?? 0,
              y: layoutChanges.y ?? 0,
              w: layoutChanges.w ?? 1, // Default 1 grid unit width
              h: layoutChanges.h ?? 1 // Default 1 grid unit height
              // Default appearance if not set (DeckButton should initialize its own state from row first)
              // variant: 'outlined',
              // label: 'New Action', // This should come from the row
            }
            newFullLayoutForProfile = [...currentProfileLayout, finalTileState]
          }
          return {
            deckLayouts: { ...state.deckLayouts, [profileId]: newFullLayoutForProfile }
          }
        })

        if (finalTileState) {
          get().syncSingleDeckTileOverride(profileId, rowId, finalTileState)
        }
      },

      // Called by DeckButton settings dialog to save appearance changes
      saveAndSyncDeckButtonAppearance: (
        profileId: string,
        rowId: string,
        appearanceChanges: Partial<
          Omit<DeckTileLayout, 'id' | 'x' | 'y' | 'w' | 'h' | 'icon' | 'label'>
        >
      ) => {
        let finalTileState: DeckTileLayout | undefined = undefined
        set((state) => {
          const currentProfileLayout = state.deckLayouts[profileId] || []
          const tileIndex = currentProfileLayout.findIndex((tile) => tile.id === rowId)
          let newFullLayoutForProfile: DeckProfileLayoutConfig

          if (tileIndex > -1) {
            finalTileState = { ...currentProfileLayout[tileIndex], ...appearanceChanges, id: rowId }
            newFullLayoutForProfile = currentProfileLayout.map((t, i) =>
              i === tileIndex ? (finalTileState as DeckTileLayout) : t
            )
          } else {
            // This case means setting appearance for a tile not yet in layout (e.g. a new button before first drag)
            finalTileState = {
              id: rowId,
              x: 0,
              y: 0,
              w: 1,
              h: 1, // Default layout
              ...appearanceChanges
            } as DeckTileLayout
            newFullLayoutForProfile = [...currentProfileLayout, finalTileState]
          }
          return {
            deckLayouts: { ...state.deckLayouts, [profileId]: newFullLayoutForProfile }
          }
        })

        if (finalTileState) {
          get().syncSingleDeckTileOverride(profileId, rowId, finalTileState)
        }
      },

      // Internal helper to POST a single tile's full Deck override state (layout + appearance) to main app
      syncSingleDeckTileOverride: async (
        profileId: string,
        rowId: string,
        tileData: DeckTileLayout
      ) => {
        try {
          console.debug(`DeckStore: Syncing full tile override for ${profileId}/${rowId}`, tileData)
          const res = await fetch(`http://${location.hostname}:1337/api/deck/tile-override`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profileId,
              rowId,
              overrideData: tileData // Send the whole DeckTileLayout object
            })
          })
          if (!res.ok) throw new Error('Failed to sync Deck tile override')
          console.debug(`DeckStore: Full tile override synced for ${profileId}/${rowId}`)
        } catch (error) {
          console.error('DeckStore: Failed to sync Deck tile override', error)
        }
      },

      // Action to tell main IO app to update its Row.output.settings (icon/label)
      updateMainAppRowDisplay: async (
        rowId: string,
        mainAppDisplayUpdates: { icon?: string; label?: string }
      ) => {
        try {
          const res = await fetch(
            `http://${location.hostname}:1337/api/rows/${rowId}/update-display`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mainAppDisplayUpdates)
            }
          )
          if (!res.ok) throw new Error('Failed to update main app row display')
          console.debug(`DeckStore: Update request for main app row ${rowId} display sent.`)
        } catch (error) {
          console.error('DeckStore: Failed to update main app row display', error)
        }
      },

      activateIoProfile: async (profileId: string | null) => {
        try {
          const res = await fetch(`http://${location.hostname}:1337/api/profiles/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: profileId })
          })
          if (!res.ok) throw new Error('Failed to activate IO profile')
          set({ currentIoProfileId: profileId })
          await get().fetchRowsForProfile(profileId)
        } catch (error) {
          console.error('DeckStore: Failed to activate IO profile', error)
        }
      }
    }),
    {
      name: 'io-deck-v1-storage', // Changed name slightly to clear old storage if structure changed significantly
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        deckLayouts: state.deckLayouts
        // magicNumber: state.magicNumber // Optionally persist magicNumber if it's user-configurable or important
      })
      // merge: (persisted, current) => { ... } // Add custom merge if needed for schema migrations
    }
  )
)

// src/renderer/src/store/deckStore.ts (New file, assuming Deck is part of renderer build for now)
// Or if Deck is a truly separate app, it would have its own store file.
// For now, let's assume it's a route within the same renderer bundle.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Row, ProfileDefinition } from '@shared/types' // Import shared types

// Define the structure for how Deck stores layout per profile
export interface DeckTileLayout {
  id: string // Corresponds to row.id
  x: number
  y: number
  w: number // In grid units
  h: number // In grid units
  buttonColor?: string // Optional: Override for button color
  icon?: string // Optional: Override for icon
  label?: string // Optional: Override for label
  fontFamily?: string // Optional: Override for font family
  iconColor?: string // Optional: Override for icon color
  textColor?: string // Optional: Override for text color
  variant?: string // Optional: Variant for the button (e.g., 'primary', 'secondary')

  // Add any other DeckButton-specific appearance overrides here
  // like customIcon, customLabel, customColor for THIS Deck button under THIS profile
}
export type DeckProfileLayoutConfig = DeckTileLayout[]

export interface DeckState {
  // Data fetched from main IO app
  allProfiles: Record<string, ProfileDefinition> // All available IO profiles
  currentIoProfileId: string | null // The ID of the profile currently active in the MAIN IO app
  rowsForCurrentProfile: Record<string, Row> // Rows relevant to currentIoProfileId

  // Deck's own UI state
  deckLayouts: Record<string, DeckProfileLayoutConfig> // profileId -> layout config for that profile
  showSettings: boolean // For Deck's own edit mode
  // darkMode is still from mainStore if Deck is a route in the same app,
  // or Deck could have its own darkMode if it's a separate PWA.

  // Actions
  fetchAllProfiles: () => Promise<void>
  fetchRowsForProfile: (profileId: string | null) => Promise<void>
  fetchCurrentActiveIoProfile: () => Promise<void> // To know what the main app is on
  setDeckShowSettings: (show: boolean) => void
  updateDeckLayout: (profileId: string, rowId: string, layout: Partial<DeckTileLayout>) => void
  saveFullDeckLayoutForProfile: (profileId: string, layout: DeckProfileLayoutConfig) => void
  activateIoProfile: (profileId: string | null) => Promise<void> // Tells main app to switch
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      allProfiles: {},
      currentIoProfileId: null,
      rowsForCurrentProfile: {},
      deckLayouts: {}, // Persist this
      showSettings: false,

      fetchAllProfiles: async () => {
        try {
          const res = await fetch(`http://${location.hostname}:1337/api/profiles`) // API endpoint needed
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
          const res = await fetch(`http://${location.hostname}:1337/api/active-profile`) // API endpoint needed
          if (!res.ok) throw new Error('Failed to fetch active profile')
          const data: { activeProfileId: string | null } = await res.json()
          set({ currentIoProfileId: data.activeProfileId })
          await get().fetchRowsForProfile(data.activeProfileId) // Fetch rows for this profile
        } catch (error) {
          console.error('DeckStore: Failed to fetch active IO profile', error)
          set({ currentIoProfileId: null, rowsForCurrentProfile: {} })
        }
      },
      fetchRowsForProfile: async (profileId: string | null) => {
        if (profileId === null) {
          // "None" profile selected, what to show? All enabled?
          // For "None" profile, fetch all rows that are individually enabled in the main app.
          // This requires a new API endpoint or modification to /api/rows
          // GET /api/rows?filter=enabled (example)
          // For now, let's assume "None" means show no profile-specific rows, or we handle it differently.
          // Or, if "None" means all rows from the main app that are enabled:
          try {
            const res = await fetch(`http://${location.hostname}:1337/api/rows?profileId=none`) // Special query
            if (!res.ok) throw new Error('Failed to fetch all enabled rows')
            const rows: Record<string, Row> = await res.json()
            set({ rowsForCurrentProfile: rows, currentIoProfileId: null }) // Update currentIoProfileId to null
            return
          } catch (error) {
            console.error("DeckStore: Failed to fetch all enabled rows for 'None' profile", error)
            set({ rowsForCurrentProfile: {}, currentIoProfileId: null })
            return
          }
        }
        try {
          // API endpoint needs to filter rows based on profileId's includedRowIds
          const res = await fetch(
            `http://${location.hostname}:1337/api/rows?profileId=${profileId}`
          )
          if (!res.ok) throw new Error(`Failed to fetch rows for profile ${profileId}`)
          const rows: Record<string, Row> = await res.json()
          set({ rowsForCurrentProfile: rows })
        } catch (error) {
          console.error(`DeckStore: Failed to fetch rows for profile ${profileId}`, error)
          set({ rowsForCurrentProfile: {} })
        }
      },
      setDeckShowSettings: (show) => set({ showSettings: show }),
      saveFullDeckLayoutForProfile: (profileId: string, layout: DeckProfileLayoutConfig) => {
        set((state) => ({
          deckLayouts: {
            ...state.deckLayouts,
            [profileId]: layout
          }
        }))
        // Optional: POST this to main app to save centrally /api/deck-layout/<profileId>
      },
      updateDeckLayout: (
        profileId: string,
        rowId: string,
        newLayoutProps: Partial<Omit<DeckTileLayout, 'id'>>
      ) => {
        set((state) => {
          const profileLayouts = state.deckLayouts[profileId] || []
          const tileIndex = profileLayouts.findIndex((tile) => tile.id === rowId)
          let newProfileLayouts
          if (tileIndex > -1) {
            newProfileLayouts = profileLayouts.map(
              (tile, index) =>
                index === tileIndex ? { ...tile, ...newLayoutProps, id: rowId } : tile // Merge with existing
            )
          } else {
            // If adding for the first time (e.g., after drag of a new button)
            // We need default w/h if not provided.
            // For onDragStop, newLayoutProps only has x,y. For onResizeStop, it has x,y,w,h.
            const defaultSize = { w: 120, h: 120 }
            newProfileLayouts = [
              ...profileLayouts,
              { ...defaultSize, ...newLayoutProps, id: rowId } as DeckTileLayout
            ]
          }
          return {
            deckLayouts: { ...state.deckLayouts, [profileId]: newProfileLayouts }
          }
        })
      },

      activateIoProfile: async (profileId: string | null) => {
        try {
          const res = await fetch(`http://${location.hostname}:1337/api/profiles/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: profileId })
          })
          if (!res.ok) throw new Error('Failed to activate IO profile')
          // After successfully telling main app to switch, re-fetch current active profile
          // and its rows for the Deck to update its display.
          set({ currentIoProfileId: profileId }) // Optimistically set
          await get().fetchRowsForProfile(profileId)
        } catch (error) {
          console.error('DeckStore: Failed to activate IO profile', error)
          // Potentially re-fetch currentIoProfileId from main app to re-sync
        }
      }
    }),
    {
      name: 'io-deck-storage', // Persist deckLayouts primarily
      storage: createJSONStorage(() => localStorage), // Or sessionStorage
      partialize: (state) => ({ deckLayouts: state.deckLayouts })
    }
  )
)

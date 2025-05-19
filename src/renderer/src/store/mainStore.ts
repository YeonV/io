// src/renderer/src/store/mainStore.ts

import { produce } from 'immer'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Row, ModuleId, ModuleConfig, IOModule, ProfileDefinition } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
// Import the DEFAULT export from your modules.ts (which has full IOModule objects)
import modulesFromFile from '@/modules/modules' // Path to your modules.ts

// UI Slice (from its current location)
import { storeUI, storeUIActions } from './storeUI' // Adjust path if moved
import { log } from '@/utils'
const ipcRenderer = window.electron?.ipcRenderer || false

// --- Create Initial Modules State DYNAMICALLY ---
// This object will hold the ModuleConfig for every registered module.
// ModuleConfig contains static definitions (menuLabel, inputs array, etc.)
// AND the dynamic runtime 'config' object (enabled, midiActive, etc.)
const initialModulesState = {} as Record<ModuleId, ModuleConfig<any>>
for (const moduleId in modulesFromFile) {
  if (Object.prototype.hasOwnProperty.call(modulesFromFile, moduleId)) {
    const fullModuleObject = modulesFromFile[moduleId as ModuleId] as IOModule
    if (fullModuleObject && fullModuleObject.moduleConfig) {
      initialModulesState[moduleId as ModuleId] = fullModuleObject.moduleConfig
    } else {
      console.warn(
        `Module with ID '${moduleId}' from modules.ts is missing or doesn't have moduleConfig.`
      )
    }
  }
}

// --- Zustand State Definition ---
type State = {
  modules: Record<ModuleId, ModuleConfig<any>> // Stores ONLY ModuleConfig objects
  rows: Record<string, Row>
  edit: boolean
  ui: ReturnType<typeof storeUI>
  profiles: Record<string, ProfileDefinition> // Profile ID -> Definition
  activeProfileId: string | null

  // Actions
  enableModule: (moduleId: ModuleId) => void
  disableModule: (moduleId: ModuleId) => void
  addRow: (row: Row) => void
  editRow: (rowId: string, updatedRowData: Partial<Row>) => void // More specific for what editRow changes
  deleteRow: (row: Row) => void
  setEdit: (edit: boolean) => void
  setDarkMode: ReturnType<typeof storeUIActions>['setDarkMode']
  setModuleConfigValue: (moduleId: ModuleId, key: string, value: any) => void

  // --- NEW PROFILE ACTIONS ---
  addProfile: (name: string, icon?: string, includedRowIds?: string[]) => string // Returns new profile ID
  updateProfile: (profileId: string, updates: Partial<Omit<ProfileDefinition, 'id'>>) => void
  deleteProfile: (profileId: string) => void
  setActiveProfile: (profileId: string | null) => void
  toggleRowEnabled: (rowId: string) => void
}

export const useMainStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        modules: initialModulesState,
        rows: {},
        edit: false,
        ui: storeUI(),
        profiles: {},
        activeProfileId: null,
        ...storeUIActions(set),

        enableModule: (moduleId: ModuleId) => {
          set(
            produce((state: State) => {
              if (state.modules[moduleId]?.config) {
                state.modules[moduleId].config.enabled = true
              }
            }),
            false,
            `enableModule/${moduleId}`
          )
        },
        disableModule: (moduleId: ModuleId) => {
          set(
            produce((state: State) => {
              if (state.modules[moduleId]?.config) {
                state.modules[moduleId].config.enabled = false
              }
            }),
            false,
            `disableModule/${moduleId}`
          )
        },
        setModuleConfigValue: (moduleId, key, value) => {
          set(
            produce((state: State) => {
              const targetConfig = state.modules[moduleId]?.config
              if (targetConfig) {
                // @ts-ignore - Allow assignment with string key.
                targetConfig[key as keyof typeof targetConfig] = value
              } else {
                console.warn(
                  `mainStore: Module config object not found for ${moduleId} when trying to set ${String(key)}`
                )
              }
            }),
            false,
            `setModuleConfig/${moduleId}/${String(key)}`
          )
        },
        // --- Row Actions ---
        addRow: (newRowData) => {
          // newRowData is what IoNewRow passes (without 'enabled')
          set(
            produce((state: State) => {
              state.rows[newRowData.id] = {
                ...newRowData,
                enabled: true // Default new rows to enabled
              }
            }),
            false,
            'addRow'
          )
        },
        toggleRowEnabled: (rowId: string) => {
          set(
            produce((state: State) => {
              if (state.rows[rowId]) {
                state.rows[rowId].enabled = !state.rows[rowId].enabled
              }
            }),
            false,
            `toggleRowEnabled/${rowId}`
          )
        },
        editRow: (rowId: string, updates: Partial<Row>) => {
          set(
            produce((state: State) => {
              const rowToUpdate = state.rows[rowId]
              if (rowToUpdate) {
                // Merge top-level updates
                Object.assign(rowToUpdate, updates)
                // If input or output objects are part of updates, deep merge their 'data' and 'settings'
                if (updates.input) {
                  rowToUpdate.input = { ...rowToUpdate.input, ...updates.input }
                  if (updates.input.data) {
                    rowToUpdate.input.data = {
                      ...(rowToUpdate.input.data || {}),
                      ...updates.input.data
                    }
                  }
                }
                if (updates.output) {
                  rowToUpdate.output = { ...rowToUpdate.output, ...updates.output }
                  if (updates.output.data) {
                    rowToUpdate.output.data = {
                      ...(rowToUpdate.output.data || {}),
                      ...updates.output.data
                    }
                  }
                  if (updates.output.settings) {
                    rowToUpdate.output.settings = {
                      ...(rowToUpdate.output.settings || {}),
                      ...updates.output.settings
                    }
                  }
                }
                // Ensure 'id' is not changed by updates, if it was accidentally included
                rowToUpdate.id = rowId
              }
            }),
            false,
            `editRow/${rowId}`
          )
        },

        setEdit: (editState: boolean) => {
          set({ edit: editState }, false, 'setEdit')
        },
        deleteRow: (rowToDelete: Row) => {
          // Param is full row object
          set(
            produce((state: State) => {
              delete state.rows[rowToDelete.id]
              // Also remove this rowId from all profiles' includedRowIds
              Object.values(state.profiles).forEach((profile) => {
                profile.includedRowIds = profile.includedRowIds.filter(
                  (id) => id !== rowToDelete.id
                )
              })
            }),
            false,
            'deleteRow'
          )
        }, // --- NEW PROFILE ACTIONS ---
        addProfile: (name: string, icon?: string, initialIncludedRowIds?: string[]) => {
          const newProfileId = uuidv4()
          const newProfile: ProfileDefinition = {
            id: newProfileId,
            name: name || `Profile ${Object.keys(get().profiles).length + 1}`,
            icon: icon || 'people',
            includedRowIds: initialIncludedRowIds || []
          }
          set(
            produce((state: State) => {
              state.profiles[newProfileId] = newProfile
            }),
            false,
            'addProfile'
          )
          // SYNC TO MAIN/ELECTRON-STORE
          if (ipcRenderer) ipcRenderer.send('set', ['profiles', get().profiles])
          log.info(`Profile added: ${newProfile.name} (ID: ${newProfileId})`)
          return newProfileId
        },
        updateProfile: (profileId: string, updates: Partial<Omit<ProfileDefinition, 'id'>>) => {
          set(
            produce((state: State) => {
              if (state.profiles[profileId]) {
                state.profiles[profileId] = { ...state.profiles[profileId], ...updates }
              }
            }),
            false,
            `updateProfile/${profileId}`
          )
          // SYNC TO MAIN/ELECTRON-STORE
          if (ipcRenderer) ipcRenderer.send('set', ['profiles', get().profiles])
        },
        deleteProfile: (profileId: string) => {
          set(
            produce((state: State) => {
              delete state.profiles[profileId]
              if (state.activeProfileId === profileId) {
                state.activeProfileId = null
              }
            }),
            false,
            `deleteProfile/${profileId}`
          )
          // SYNC TO MAIN/ELECTRON-STORE
          if (ipcRenderer) {
            ipcRenderer.send('set', ['profiles', get().profiles])
            // Also sync activeProfileId if it changed
            if (
              get().activeProfileId === null &&
              get().activeProfileId !== get().profiles[profileId]?.id
            ) {
              // check if active was deleted
              ipcRenderer.send('set', ['activeProfileId', null])
            }
          }
        },
        setActiveProfile: (profileId: string | null) => {
          const currentActiveId = get().activeProfileId
          // Optimization: Only proceed if the profileId is actually changing
          if (currentActiveId === profileId) {
            log.info(`setActiveProfile: Profile ${profileId} is already active.`)
            return
          }

          set({ activeProfileId: profileId }, false, `setActiveProfile/${profileId || 'none'}`)
          log.info(`Active profile set in Zustand to: ${profileId || 'None'}`)

          if (ipcRenderer) {
            // --- Sync this new activeProfileId to electron-store via main process ---
            log.info(`setActiveProfile: Sending 'set' IPC for activeProfileId: ${profileId}`)
            ipcRenderer.send('set', ['activeProfileId', profileId])
            // --- END SYNC ---

            // Send info for main-side modules that need to react immediately (like Keyboard)
            const newActiveProfile = profileId ? get().profiles[profileId] : null
            ipcRenderer.send('active-profile-changed-for-main', {
              activeProfileId: profileId,
              includedRowIds: newActiveProfile?.includedRowIds || null
            })

            // Optional: Re-send rows if main process modules need to re-evaluate based on
            // the combination of new profile AND existing rows immediately.
            // This is good practice as `notifyMainModulesOnRowsUpdate` in moduleLoader
            // passes both rows and the latest activeProfileInfo.
            // log.info("setActiveProfile: Re-sending rows to main process for re-evaluation with new profile.");
            // ipcRenderer.send('set', ['rows', get().rows]);
            // Actually, moduleLoader's listener for 'active-profile-changed-for-main' should
            // trigger a re-evaluation of rows itself. Let's ensure that.
          }
        }
      }),

      {
        name: 'io-v2-storage',
        partialize: (state: State) => ({
          rows: state.rows,
          ui: state.ui,
          moduleStoredConfigs: Object.fromEntries(
            Object.entries(state.modules).map(([id, moduleFullConfig]) => [
              id,
              moduleFullConfig.config
            ])
          ),
          profiles: state.profiles,
          activeProfileId: state.activeProfileId
        }),
        merge: (persistedState: any, currentState: State): State => {
          // Start with the current state (which includes fresh initialModulesState and default profiles/activeProfileId)
          const mergedState = { ...currentState }

          // Merge rows, ui (these are simple enough that direct spread from persisted is often okay if structure matches)
          if (persistedState.rows) mergedState.rows = persistedState.rows
          if (persistedState.ui) mergedState.ui = { ...currentState.ui, ...persistedState.ui } // Deep merge ui a bit

          // Rehydrate moduleStoredConfigs
          if (persistedState.moduleStoredConfigs) {
            const rehydratedModules = { ...initialModulesState } as Record<
              ModuleId,
              ModuleConfig<any>
            >
            for (const moduleId in persistedState.moduleStoredConfigs) {
              if (
                Object.prototype.hasOwnProperty.call(persistedState.moduleStoredConfigs, moduleId)
              ) {
                if (rehydratedModules[moduleId as ModuleId]) {
                  rehydratedModules[moduleId as ModuleId].config = {
                    ...rehydratedModules[moduleId as ModuleId].config,
                    ...persistedState.moduleStoredConfigs[moduleId]
                  }
                }
              }
            }
            mergedState.modules = rehydratedModules
          }

          // --- MERGE PROFILES AND ACTIVEPROFILEID ---
          if (persistedState.profiles) {
            mergedState.profiles = persistedState.profiles
            // Optional: Data integrity check for profiles if structure might change
            for (const pid in mergedState.profiles) {
              if (Object.prototype.hasOwnProperty.call(mergedState.profiles, pid)) {
                if (!Array.isArray(mergedState.profiles[pid].includedRowIds)) {
                  mergedState.profiles[pid].includedRowIds = []
                }
                if (mergedState.profiles[pid].icon === undefined) {
                  // Example: ensure new fields have defaults
                  mergedState.profiles[pid].icon = 'people'
                }
              }
            }
          } else {
            // If no profiles in persisted state, ensure it's an empty object from initial state
            mergedState.profiles = currentState.profiles || {}
          }

          if (persistedState.activeProfileId !== undefined) {
            // Allow null to be a valid persisted value
            mergedState.activeProfileId = persistedState.activeProfileId
          } else {
            mergedState.activeProfileId = currentState.activeProfileId || null
          }
          // --- END MERGE PROFILES ---

          // Clean up temporary key if it was differently named in partialize (it's not here)
          // if (Object.prototype.hasOwnProperty.call(mergedState, 'moduleStoredConfigs')) {
          //    delete mergedState.moduleStoredConfigs; // Not needed if key matches
          // }

          return mergedState
        }
      }
    ),
    { name: 'IO APP (Main Store)' }
  )
)

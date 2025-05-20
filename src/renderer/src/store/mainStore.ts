// src/renderer/src/store/mainStore.ts

import { produce } from 'immer'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Row, ModuleId, ModuleConfig, IOModule, ProfileDefinition } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import modulesFromFile from '@/modules/modules'
import { storeUI, storeUIActions } from './storeUI'

const ipcRenderer = window.electron?.ipcRenderer || false

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
  modules: Record<ModuleId, ModuleConfig<any>>
  rows: Record<string, Row>
  edit: boolean
  ui: ReturnType<typeof storeUI>
  profiles: Record<string, ProfileDefinition>
  activeProfileId: string | null
  globalAudioCommandTimestamp: string | null // NEW STATE for global audio commands

  // Actions
  enableModule: (moduleId: ModuleId) => void
  disableModule: (moduleId: ModuleId) => void
  addRow: (row: Row) => void
  editRow: (rowId: string, updatedRowData: Partial<Row>) => void
  deleteRow: (row: Row) => void
  setEdit: (edit: boolean) => void
  setDarkMode: ReturnType<typeof storeUIActions>['setDarkMode']
  setModuleConfigValue: (moduleId: ModuleId, key: string, value: any) => void
  addProfile: (name: string, icon?: string, includedRowIds?: string[]) => string
  updateProfile: (profileId: string, updates: Partial<Omit<ProfileDefinition, 'id'>>) => void
  deleteProfile: (profileId: string) => void
  setActiveProfile: (profileId: string | null) => void
  toggleRowEnabled: (rowId: string) => void
  setGlobalAudioCommandTimestamp: () => void // NEW ACTION
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
        globalAudioCommandTimestamp: null, // Initialize new state
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
                ;(targetConfig as any)[key] = value // Keep as any for flexibility
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
        addRow: (newRowData) => {
          set(
            produce((state: State) => {
              state.rows[newRowData.id] = {
                ...newRowData,
                enabled: true
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
                Object.assign(rowToUpdate, updates)
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
          set(
            produce((state: State) => {
              delete state.rows[rowToDelete.id]
              Object.values(state.profiles).forEach((profile) => {
                profile.includedRowIds = profile.includedRowIds.filter(
                  (id) => id !== rowToDelete.id
                )
              })
            }),
            false,
            'deleteRow'
          )
        },
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
          if (ipcRenderer) ipcRenderer.send('set', ['profiles', get().profiles])
          console.log(`Profile added: ${newProfile.name} (ID: ${newProfileId})`) // Using console.log as per your utils
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
          if (ipcRenderer) {
            ipcRenderer.send('set', ['profiles', get().profiles])
            if (
              get().activeProfileId === null &&
              get().activeProfileId !== get().profiles[profileId]?.id
            ) {
              ipcRenderer.send('set', ['activeProfileId', null])
            }
          }
        },
        setActiveProfile: (profileId: string | null) => {
          const currentActiveId = get().activeProfileId
          if (currentActiveId === profileId) {
            console.log(`setActiveProfile: Profile ${profileId} is already active.`) // Using console.log
            return
          }
          set({ activeProfileId: profileId }, false, `setActiveProfile/${profileId || 'none'}`)
          console.log(`Active profile set in Zustand to: ${profileId || 'None'}`) // Using console.log
          if (ipcRenderer) {
            console.log(`setActiveProfile: Sending 'set' IPC for activeProfileId: ${profileId}`) // Using console.log
            ipcRenderer.send('set', ['activeProfileId', profileId])
            const newActiveProfile = profileId ? get().profiles[profileId] : null
            ipcRenderer.send('active-profile-changed-for-main', {
              activeProfileId: profileId,
              includedRowIds: newActiveProfile?.includedRowIds || null
            })
          }
        },
        // NEW ACTION IMPLEMENTATION
        setGlobalAudioCommandTimestamp: () => {
          const newTimestamp = new Date().toISOString()
          console.log(`[mainStore] Setting globalAudioCommandTimestamp to: ${newTimestamp}`)
          set(
            { globalAudioCommandTimestamp: newTimestamp },
            false,
            'setGlobalAudioCommandTimestamp'
          )
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
          activeProfileId: state.activeProfileId,
          globalAudioCommandTimestamp: state.globalAudioCommandTimestamp // Persist this new state
        }),
        merge: (persistedState: any, currentState: State): State => {
          const mergedState = { ...currentState }
          if (persistedState.rows) mergedState.rows = persistedState.rows
          if (persistedState.ui) mergedState.ui = { ...currentState.ui, ...persistedState.ui }
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
            mergedState.profiles = currentState.profiles || {}
          }
          if (persistedState.activeProfileId !== undefined) {
            mergedState.activeProfileId = persistedState.activeProfileId
          } else {
            mergedState.activeProfileId = currentState.activeProfileId || null
          }

          // Merge the new state
          if (persistedState.globalAudioCommandTimestamp !== undefined) {
            mergedState.globalAudioCommandTimestamp = persistedState.globalAudioCommandTimestamp
          } else {
            mergedState.globalAudioCommandTimestamp =
              currentState.globalAudioCommandTimestamp || null
          }
          return mergedState
        }
      }
    ),
    { name: 'IO APP (Main Store)' }
  )
)

// src/renderer/src/store/mainStore.ts

import { produce } from 'immer'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Row, ModuleId, ModuleConfig, IOModule, ProfileDefinition } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import modulesFromFile from '@/modules/modules'
import { uiStore, uiStoreActions } from './uiStore'
import { BlueprintDefinition } from '@/modules/Rest/Rest.types'
import { LogEntry } from '@/components/LogViewer/LogViewer.types'
import { integrationsStore, integrationsStoreActions } from './integrationsStore'

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
  ui: ReturnType<typeof uiStore>
  integrations: ReturnType<typeof integrationsStore>
  profiles: Record<string, ProfileDefinition>
  activeProfileId: string | null
  globalAudioCommandTimestamp: string | null
  isWindowBeingDraggedOver: boolean
  dropMessage: string | null
  blueprintToRunFromDrop: BlueprintDefinition | null
  rowHistory: LogEntry[]

  // Actions
  enableModule: (moduleId: ModuleId) => void
  disableModule: (moduleId: ModuleId) => void
  addRow: (row: Row) => void
  editRow: (rowId: string, updatedRowData: Partial<Row>) => void
  deleteRow: (row: Row) => void
  setEdit: (edit: boolean) => void
  setThemeChoice: ReturnType<typeof uiStoreActions>['setThemeChoice']
  setModuleConfigValue: (moduleId: ModuleId, key: string, value: any) => void
  addProfile: (name: string, icon?: string, includedRowIds?: string[]) => string
  updateProfile: (profileId: string, updates: Partial<Omit<ProfileDefinition, 'id'>>) => void
  deleteProfile: (profileId: string) => void
  setActiveProfile: (profileId: string | null) => void
  toggleRowEnabled: (rowId: string) => void
  setGlobalAudioCommandTimestamp: () => void
  setIsWindowBeingDraggedOver: (isDragging: boolean) => void
  setDropMessage: (message: string | null) => void
  setBlueprintToRunFromDrop: (blueprint: BlueprintDefinition | null) => void
  addRowHistoryEntry: (entryData: Omit<LogEntry, 'id' | 'timestamp'>) => void
  setHomeWidgets: (newHomeWidgets: Record<ModuleId, boolean>) => void
  setThemeColors: (key: string, color: string) => void
  setHomeAssistantConfig: ReturnType<typeof integrationsStoreActions>['setHomeAssistantConfig']
}

const MAX_HISTORY_ENTRIES = 200

export const useMainStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        modules: initialModulesState,
        rows: {},
        edit: false,
        ui: uiStore(),
        integrations: integrationsStore(),
        profiles: {},
        activeProfileId: null,
        globalAudioCommandTimestamp: null,
        isWindowBeingDraggedOver: false,
        dropMessage: 'Drop .ioProfile file',
        blueprintToRunFromDrop: null,
        rowHistory: [],
        ...uiStoreActions(set),
        ...integrationsStoreActions(set),

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
          // console.log(`Profile added: ${newProfile.name} (ID: ${newProfileId})`)
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
            // console.log(`setActiveProfile: Profile ${profileId} is already active.`)
            return
          }
          set({ activeProfileId: profileId }, false, `setActiveProfile/${profileId || 'none'}`)
          // console.log(`Active profile set in Zustand to: ${profileId || 'None'}`)
          if (ipcRenderer) {
            // console.log(`setActiveProfile: Sending 'set' IPC for activeProfileId: ${profileId}`)
            ipcRenderer.send('set', ['activeProfileId', profileId])
            const newActiveProfile = profileId ? get().profiles[profileId] : null
            ipcRenderer.send('active-profile-changed-for-main', {
              activeProfileId: profileId,
              includedRowIds: newActiveProfile?.includedRowIds || null
            })
          }
        },
        setGlobalAudioCommandTimestamp: () => {
          const newTimestamp = new Date().toISOString()
          // console.log(`[mainStore] Setting globalAudioCommandTimestamp to: ${newTimestamp}`)
          set(
            { globalAudioCommandTimestamp: newTimestamp },
            false,
            'setGlobalAudioCommandTimestamp'
          )
        },
        setIsWindowBeingDraggedOver: (isDragging: boolean) => {
          // console.debug(`[mainStore] Setting isWindowBeingDraggedOver to: ${isDragging}`); // Optional: can be spammy
          set({ isWindowBeingDraggedOver: isDragging }, false, 'setIsWindowBeingDraggedOver')
        },
        setDropMessage: (message: string | null) => {
          // console.debug(`[mainStore] Setting dropMessage to: ${message}`); // Optional: can be spammy
          set({ dropMessage: message }, false, 'setDropMessage')
        },
        setBlueprintToRunFromDrop: (blueprint) =>
          set(
            produce((state: State) => {
              state.blueprintToRunFromDrop = blueprint
            }),
            false,
            'setBlueprintToRunFromDrop'
          ),
        addRowHistoryEntry: (entryData) => {
          set(
            produce((state: State) => {
              const newEntry: LogEntry = {
                id: uuidv4(),
                timestamp: Date.now(),
                ...entryData
              }
              state.rowHistory.unshift(newEntry)
              if (state.rowHistory.length > MAX_HISTORY_ENTRIES) {
                state.rowHistory.pop()
              }
            }),
            false,
            'addRowHistoryEntry'
          )
        }
      }),
      {
        name: 'io-v2-storage',
        partialize: (state: State) => ({
          rows: state.rows,
          ui: {
            themeChoice: state.ui.themeChoice,
            homeWidgets: state.ui.homeWidgets
          },
          moduleStoredConfigs: Object.fromEntries(
            Object.entries(state.modules).map(([id, moduleFullConfig]) => [
              id,
              moduleFullConfig.config
            ])
          ),
          profiles: state.profiles,
          activeProfileId: state.activeProfileId,
          globalAudioCommandTimestamp: state.globalAudioCommandTimestamp,
          // Persist Home Assistant config
          integrationsHomeAssistantConfig: state.integrations?.homeAssistant?.config
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
            for (const pid in mergedState.profiles) {
              if (Object.prototype.hasOwnProperty.call(mergedState.profiles, pid)) {
                if (!Array.isArray(mergedState.profiles[pid].includedRowIds)) {
                  mergedState.profiles[pid].includedRowIds = []
                }
                if (mergedState.profiles[pid].icon === undefined) {
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
          if (persistedState.ui) {
            if (persistedState.ui.themeChoice) {
              mergedState.ui.themeChoice = persistedState.ui.themeChoice
            }
            if (persistedState.ui.homeWidgets) {
              mergedState.ui.homeWidgets = {
                ...(currentState.ui.homeWidgets || {}),
                ...persistedState.ui.homeWidgets
              }
            }
          }
          if (persistedState.globalAudioCommandTimestamp !== undefined) {
            mergedState.globalAudioCommandTimestamp = persistedState.globalAudioCommandTimestamp
          } else {
            mergedState.globalAudioCommandTimestamp =
              currentState.globalAudioCommandTimestamp || null
          }

          // Merge Home Assistant config
          if (persistedState.integrationsHomeAssistantConfig) {
            mergedState.integrations.homeAssistant.config = {
              ...currentState.integrations.homeAssistant.config, // Start with current defaults/structure
              ...persistedState.integrationsHomeAssistantConfig // Override with persisted values
            }
          }
          // Ensure ioInstanceId is generated if it's missing after merge
          if (!mergedState.integrations.homeAssistant.config.ioInstanceId) {
            mergedState.integrations.homeAssistant.config.ioInstanceId = uuidv4()
            console.log(
              '[mainStore] Generated new ioInstanceId for Home Assistant:',
              mergedState.integrations.homeAssistant.config.ioInstanceId
            )
          }

          return mergedState
        }
      }
    ),
    { name: 'IO APP (Main Store)' }
  )
)

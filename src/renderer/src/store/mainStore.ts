// src/renderer/src/store/mainStore.ts

import { produce } from 'immer'
import { create } from 'zustand'
import { omit } from 'lodash-es'
import { devtools, persist } from 'zustand/middleware'
import type { Row, ModuleId, ModuleConfig, IOModule } from '@shared/types'

// Import the DEFAULT export from your modules.ts (which has full IOModule objects)
import modulesFromFile from '@/modules/modules' // Path to your modules.ts

// UI Slice (from its current location)
import { storeUI, storeUIActions } from './OLD/storeUI' // Adjust path if moved

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

  // Actions
  enableModule: (moduleId: ModuleId) => void
  disableModule: (moduleId: ModuleId) => void
  addRow: (row: Row) => void
  editRow: (rowId: string, updates: Partial<Pick<Row, 'input' | 'output'>>) => void // More specific for what editRow changes
  deleteRow: (row: Row) => void
  setEdit: (edit: boolean) => void
  setDarkMode: ReturnType<typeof storeUIActions>['setDarkMode']
  setModuleConfigValue: (moduleId: ModuleId, key: string, value: any) => void
}

export const useMainStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        modules: initialModulesState,
        rows: {},
        edit: false,
        ui: storeUI(),

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
        addRow: (row: Row) => {
          set(
            produce((state: State) => {
              state.rows[row.id] = row
            }),
            false,
            'addRow'
          )
        },
        editRow: (rowId: string, updates: Partial<Pick<Row, 'input' | 'output'>>) => {
          set(
            produce((state: State) => {
              const row = state.rows[rowId]
              if (row) {
                if (updates.input) {
                  row.input = {
                    ...row.input,
                    ...updates.input,
                    data: { ...row.input.data, ...updates.input.data }
                  }
                }
                if (updates.output) {
                  row.output = {
                    ...row.output,
                    ...updates.output,
                    data: { ...row.output.data, ...updates.output.data }
                  }
                }
                // This specifically handles the payload from Deck for output settings
                // If 'updates' contains a 'settings' key for Deck, it gets merged into output.
                // This was based on previous editRow structure. Re-evaluate if this is still the desired merge.
                // For now, assuming 'updates' could be like { output: { settings: { ... } } }
                // or { output: { label: 'new', icon: 'new', settings: { ... } } }
              }
            }),
            false,
            'editRow'
          )
        },
        deleteRow: (row: Row) => {
          set(
            produce((state: State) => {
              delete state.rows[row.id]
            }), // Simpler with Immer
            // (state) => ({ ...state, rows: omit(state.rows, [row.id]) }), // Old way
            false,
            'deleteRow'
          )
        },
        setEdit: (editState: boolean) => {
          set({ edit: editState }, false, 'setEdit')
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
          )
        }),
        merge: (persistedState: any, currentState: State): State => {
          const mergedState = { ...currentState, ...persistedState }
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
          if (Object.prototype.hasOwnProperty.call(mergedState, 'moduleStoredConfigs')) {
            delete mergedState.moduleStoredConfigs
          }
          return mergedState
        }
      }
    ),
    { name: 'IO APP (Main Store)' }
  )
)

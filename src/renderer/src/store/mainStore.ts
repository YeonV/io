import type { IOModule, ModuleId, Row } from '../../../shared/types.js'
import { produce } from 'immer'
import { create } from 'zustand'
import { omit } from 'lodash-es'
import { devtools, persist } from 'zustand/middleware'
import modules from '@/modules/modules.js'
import { storeUI, storeUIActions } from './OLD/storeUI.js'

type State = {
  modules: Record<ModuleId, IOModule>
  enableModule: (moduleId: ModuleId) => void
  disableModule: (moduleId: ModuleId) => void
  rows: Record<string, Row>
  addRow: (row: Row) => void
  editRow: (rowId: string, settings: Record<string, any>) => void
  deleteRow: (row: Row) => void
  edit: boolean
  setEdit: (edit: boolean) => void
  ui: ReturnType<typeof storeUI>
  setDarkMode: ReturnType<typeof storeUIActions>['setDarkMode']
}

export const useMainStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        // MODULES
        modules: modules,
        enableModule: (moduleId: ModuleId) => {
          set(
            produce((state) => {
              state.modules[moduleId].moduleConfig.config.enabled = true
            }),
            false,
            'enable module'
          )
        },
        disableModule: (moduleId: ModuleId) => {
          set(
            produce((state) => {
              state.modules[moduleId].moduleConfig.config.enabled = false
            }),
            false,
            'disable module'
          )
        },
        // ROWS
        rows: {},
        addRow: (row: Row) => {
          // console.log('add row', row)
          set(
            (state) => {
              // console.log('state', state)
              return {
                ...state,
                rows: {
                  ...state.rows,
                  [row.id]: row
                }
              }
            },
            false,
            'add row'
          )
        },
        editRow: (rowId: string, settings: Record<string, any>) => {
          const row = get().rows[rowId]
          set(
            (state) => {
              return {
                ...state,
                rows: {
                  ...state.rows,
                  [row.id]: {
                    id: row.id,
                    input: row.input,
                    inputModule: row.inputModule,
                    outputModule: row.outputModule,
                    output: {
                      ...row.output,
                      ...settings
                    }
                  }
                }
              }
            },
            false,
            'edit row'
          )
        },
        deleteRow: (row: Row) => {
          // console.log('add row', row)
          set(
            (state) => {
              // console.log('state', state)
              return {
                ...state,
                rows: omit(state.rows, [row.id])
              }
            },
            false,
            'remove row'
          )
        },
        // UI
        edit: false,
        setEdit: (edit: boolean) => {
          set(
            (state) => {
              // console.log('state', state)
              return {
                ...state,
                edit: edit
              }
            },
            false,
            'set edit'
          )
        },
        ui: { ...storeUI() },
        ...storeUIActions(set)
      }),

      // Persist Settings
      {
        name: 'io-v2-storage',
        partialize: (state) =>
          Object.fromEntries(Object.entries(state).filter(([key]) => ['rows'].includes(key)))
      }
    ),
    { name: 'IO APP' }
  )
)

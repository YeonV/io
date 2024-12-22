import { produce } from 'immer'
import { FC } from 'react'
import { create } from 'zustand'
import omit from 'lodash-es/omit'

import { devtools, persist } from 'zustand/middleware'
import modules from '@/modules/modules'

export type Input = {
  name: string
  icon: string
}

export type InputData = Input & { data: Record<string, any> }

export type Output = {
  name: string
  icon: string
}

export type OutputData = Output & {
  icon?: string
  label?: string
  data: Record<string, any>
  settings?: Record<string, any>
}

export type IOModule = {
  id: ModuleId
  moduleConfig: ModuleConfig
  InputEdit?: FC<{
    input: InputData
    onChange: (data: Record<string, any>) => void
  }>
  OutputEdit?: FC<{
    output: OutputData
    onChange: (data: Record<string, any>) => void
  }>
  InputDisplay?: FC<{
    input: InputData
  }>
  OutputDisplay?: FC<{
    output: OutputData
  }>
  Settings?: FC<any>
  useInputActions?: (row: Row) => void
  useOutputActions?: (row: Row) => void
  useGlobalActions?: () => void
}

type ModuleDefaultConfig = {
  enabled: boolean
}

export type ModuleConfig<T = {}> = {
  menuLabel: string
  inputs: Input[]
  outputs: Output[]
  config: ModuleDefaultConfig & T
}

export type Row = {
  id: string
  input: InputData
  inputModule: ModuleId
  output: OutputData
  outputModule: ModuleId
}

export type ModuleId = keyof typeof modules

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
        }
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

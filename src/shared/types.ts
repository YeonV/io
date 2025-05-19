import type { FC } from 'react'
import type { ModuleId } from './module-ids'

export type { ModuleId }

export type Input = {
  name: string
  icon: string
  editable?: boolean
}
export type InputData = Input & { data: Record<string, any> }

export type Output = {
  name: string
  icon: string
  editable?: boolean
}

export type OutputData = Output & {
  icon?: string
  label?: string
  data: Record<string, any>
  settings?: Record<string, any>
}

export type IOModule = {
  id: ModuleId
  moduleConfig: ModuleConfig<any>
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

export type ModuleDefaultConfig = {
  enabled: boolean
}

// T now represents ONLY the custom fields
export type ModuleConfig<T = {}> = {
  menuLabel: string
  inputs: Input[]
  outputs: Output[]
  // The final config type is an intersection of ModuleDefaultConfig and T
  config: ModuleDefaultConfig & T
}

export type Row = {
  id: string
  input: InputData
  inputModule: ModuleId
  output: OutputData
  outputModule: ModuleId
  enabled: boolean
}

export interface ProfileDefinition {
  id: string
  name: string
  icon?: string // For your point #2
  // Stores only the IDs of rows that are part of this profile's "set"
  includedRowIds: string[]
}

export interface IOMainModulePart {
  moduleId: string // Should match the id from the renderer module's IOModule export
  initialize?: (deps: {
    ipcMain: typeof Electron.ipcMain
    getMainWindow: () => Electron.BrowserWindow | null
    getStore: () => any // Consider a more specific store type if possible
    activeProfileInfo: {
      id: string | null
      includedRowIds: string[] | null
    }
  }) => void | Promise<void>
  onRowsUpdated?: (
    rows: Record<string, Row>, // Use the specific Row type
    deps: {
      ipcMain: typeof Electron.ipcMain
      getMainWindow: () => Electron.BrowserWindow | null
      getStore: () => any
      activeProfileInfo: {
        id: string | null
        includedRowIds: string[] | null
      }
    }
  ) => void | Promise<void>
  cleanup?: () => void | Promise<void>
  // Add any other lifecycle methods main module parts might need
}

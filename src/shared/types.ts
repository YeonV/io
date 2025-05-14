import type { FC } from 'react'
import modules from '../renderer/src/modules/modules.js'

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
}

export type ModuleId = keyof typeof modules

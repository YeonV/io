// src/renderer/src/modules/moduleRegistry.ts

import modulesObjectFromFile from './modules' // Default export from your modules.ts
import type { IOModule, ModuleId } from '@shared/types'

// Define the shape of the functional parts we want to extract
type ModuleFunctionalParts = Pick<
  IOModule,
  | 'InputEdit'
  | 'InputDisplay'
  | 'OutputEdit'
  | 'OutputDisplay'
  | 'Settings'
  | 'useInputActions'
  | 'useOutputActions'
  | 'useGlobalActions'
>

// Type for the final registry
export type ModuleImplementationMap = {
  [KModuleId in ModuleId]: Partial<ModuleFunctionalParts>
}

const implementations: Partial<ModuleImplementationMap> = {}

for (const moduleId in modulesObjectFromFile) {
  if (Object.prototype.hasOwnProperty.call(modulesObjectFromFile, moduleId)) {
    const moduleFile = modulesObjectFromFile[moduleId as ModuleId] as IOModule // Cast to IOModule
    const functionalParts: Partial<ModuleFunctionalParts> = {}

    if (moduleFile.InputEdit) functionalParts.InputEdit = moduleFile.InputEdit
    if (moduleFile.InputDisplay) functionalParts.InputDisplay = moduleFile.InputDisplay
    if (moduleFile.OutputEdit) functionalParts.OutputEdit = moduleFile.OutputEdit
    if (moduleFile.OutputDisplay) functionalParts.OutputDisplay = moduleFile.OutputDisplay
    if (moduleFile.Settings) functionalParts.Settings = moduleFile.Settings
    if (moduleFile.useInputActions) functionalParts.useInputActions = moduleFile.useInputActions
    if (moduleFile.useOutputActions) functionalParts.useOutputActions = moduleFile.useOutputActions
    if (moduleFile.useGlobalActions) functionalParts.useGlobalActions = moduleFile.useGlobalActions

    implementations[moduleId as ModuleId] = functionalParts
  }
}

export const moduleImplementations = implementations as ModuleImplementationMap

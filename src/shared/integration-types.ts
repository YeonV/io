// src/shared/integration-types.ts
import type React from 'react'
import type { IntegrationId as GeneratedIntegrationId } from './integration-ids' // Generated file
// Assume MainIntegrationDeps is defined in integrationLoader.ts or a shared main types file
// For this example, let's assume it's importable or defined.
// import type { MainIntegrationDeps } from '../../main/integrationLoader';

export type IntegrationId = GeneratedIntegrationId

export interface IntegrationConfig {
  id: IntegrationId // Must be unique and typically matches derived kebab-case folder name
  name: string // User-friendly name for display
  description: string
  icon: string // MDI icon name or path
  // No 'settingsComponent' here; the script will associate the default export of *.settings.tsx
  // Or, if we want to be explicit:
  // settingsComponentModulePath?: string; // For dynamic import, or script handles it

  // Optional: If integrations have their own specific config beyond enable/disable
  // We can make this generic or define specific ones later
  customConfig?: Record<string, any>
}

// This will be the structure used in the generated integrations.ts (renderer)
export interface FullIntegrationDefinition extends IntegrationConfig {
  SettingsComponent: React.FC<any> // The actual React component for settings
}

// For main process parts of integrations
export interface IOMainIntegrationPart {
  integrationId: IntegrationId
  initialize: (deps: any /* MainIntegrationDeps */) => Promise<void> | void // Use 'any' for now if MainIntegrationDeps is tricky to import here
  cleanup?: () => Promise<void> | void
  // onConfigUpdated?: (newConfig: IntegrationConfig['customConfig'], deps: MainIntegrationDeps) => void;
}

export interface RestPresetDefinition {
  id: string // uuid
  name: string
  icon?: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'
  headers?: Record<string, string>
  bodyTemplate?: string // Stored as string, might contain placeholders
  description?: string
}

export interface RestRequestArgs {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  headers?: Record<string, string>
  body?: string // Body is expected to be a string (e.g., stringified JSON)
}

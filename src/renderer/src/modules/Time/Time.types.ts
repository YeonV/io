// src/renderer/src/modules/Time/Time.types.ts

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface TimeInputData {
  recurring: boolean // True for daily/weekly, false for one-shot

  // Fields for RECURRING triggers
  triggerTime?: string // HH:MM format, e.g., "14:30" (also used by one-shot if only time matters that day)
  daysOfWeek?: DayOfWeek[] // Array of days, e.g., ["Mon", "Wed", "Fri"]

  // Field for ONE-SHOT triggers
  oneShotDateTime?: string // ISO string for specific date and time, e.g., "2024-07-15T14:30:00.000Z"
}

export interface TimeModuleCustomConfig {}

export const dayMap: Record<DayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
}

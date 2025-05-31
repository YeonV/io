// src/renderer/src/hooks/useRowActivation.ts
import { useMemo, useEffect } from 'react'
import { useMainStore } from '@/store/mainStore'
import type { Row, ProfileDefinition } from '@shared/types'
import { log } from '@/utils' // Your log utility

export interface RowActivationStatus {
  /** Is this row's individual toggle switch ON? */
  isEnabled: boolean
  /** If a profile is active, is this row included in it?
   *  True if included, False if not included. Null if no profile is active. */
  isInProfile: boolean | null
  /** The name of the currently active profile, or null if no profile is active. */
  profile: string | null
  /** Is this row ultimately considered active right now and should run its actions? */
  isActive: boolean
  /** The reason it might be inactive (for logging/debugging), or null if active. */
  inactiveReason: string | null
}

export function useRowActivation(row: Row | undefined | null): RowActivationStatus {
  // Safely destructure, providing defaults if row is null/undefined
  const rowId = row?.id
  const rowName = row?.output?.name || row?.id // Use row.output.name or fallback to row.id for logging
  const rowIndividuallyEnabled = row?.enabled // This is the row.enabled property

  const activeProfileDefinition = useMainStore<ProfileDefinition | null>((state) => {
    if (!state.activeProfileId) return null
    return state.profiles[state.activeProfileId] || null
  })

  const activationStatus = useMemo((): RowActivationStatus => {
    if (!row || !rowId) {
      return {
        isEnabled: false,
        isInProfile: null,
        profile: activeProfileDefinition?.name || null,
        isActive: false,
        inactiveReason: 'Row data is undefined'
      }
    }

    const isActuallyEnabled = rowIndividuallyEnabled === undefined ? true : rowIndividuallyEnabled

    let isActuallyInProfile: boolean | null = null
    let profileNameString: string | null = null
    let calculatedIsActive = isActuallyEnabled // Start with the row's own enabled state
    let reasonForInactivity: string | null = null

    if (!isActuallyEnabled) {
      reasonForInactivity = `Row '${rowName}' is individually disabled`
    }

    if (activeProfileDefinition) {
      profileNameString = activeProfileDefinition.name
      isActuallyInProfile = activeProfileDefinition.includedRowIds.includes(rowId)

      if (!isActuallyInProfile) {
        // If a profile is active AND this row is NOT in it, it's inactive,
        // regardless of its individual 'enabled' state for profile purposes.
        calculatedIsActive = false
        reasonForInactivity = `Row '${rowName}' not in active profile '${profileNameString}'`
      }
      // If it IS in the profile, its activity still depends on its individual 'isActuallyEnabled' status.
      // So, if isActuallyEnabled was false, calculatedIsActive is already false.
      // If isActuallyEnabled was true AND it's in the profile, calculatedIsActive remains true.
    } else {
      // No profile is active. isActuallyInProfile remains null.
      // calculatedIsActive is already determined by isActuallyEnabled.
      // If it's disabled, reasonForInactivity is already set.
    }

    // Final check: if it's individually disabled, that's the primary reason for inactivity
    // unless a profile also excludes it.
    if (!isActuallyEnabled) {
      calculatedIsActive = false // Ensure it's marked inactive
      // The reason "individually disabled" takes precedence if no profile is active,
      // or if it IS in the profile but individually disabled.
      if (!activeProfileDefinition || (activeProfileDefinition && isActuallyInProfile)) {
        reasonForInactivity = `Row '${rowName}' is individually disabled`
      }
    }

    // If after all checks it's active, there's no inactive reason.
    if (calculatedIsActive) {
      reasonForInactivity = null
    }

    return {
      isEnabled: isActuallyEnabled,
      isInProfile: isActuallyInProfile,
      profile: profileNameString,
      isActive: calculatedIsActive,
      inactiveReason: reasonForInactivity
    }
  }, [rowId, rowName, rowIndividuallyEnabled, activeProfileDefinition])

  // Optional comprehensive logging
  // useEffect(() => {
  //   if (!rowId) return
  //   if (activationStatus.isActive) {
  //     log.info(
  //       `RowActivation '${rowName}': Now ACTIVE. Profile: '${activationStatus.profile || 'None'}'. IndividuallyEnabled: ${activationStatus.isEnabled}. InProfile: ${activationStatus.isInProfile === null ? 'N/A (No Profile)' : activationStatus.isInProfile}.`
  //     )
  //   } else {
  //     log.info2(
  //       `RowActivation '${rowName}': Now INACTIVE. Reason: ${activationStatus.inactiveReason}. Profile: '${activationStatus.profile || 'None'}'. IndividuallyEnabled: ${activationStatus.isEnabled}. InProfile: ${activationStatus.isInProfile === null ? 'N/A (No Profile)' : activationStatus.isInProfile}.`
  //     )
  //   }
  // }, [rowId, rowName, activationStatus])

  return activationStatus
}

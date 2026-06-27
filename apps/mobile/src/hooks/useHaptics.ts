import { useCallback } from 'react'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

interface UseHapticsResult {
  impactLight: () => Promise<void>
  impactMedium: () => Promise<void>
  impactHeavy: () => Promise<void>
  notificationSuccess: () => Promise<void>
  notificationWarning: () => Promise<void>
  notificationError: () => Promise<void>
  vibrate: (duration?: number) => Promise<void>
}

export function useHaptics(): UseHapticsResult {
  const impactLight = useCallback(async () => {
    await Haptics.impact({ style: ImpactStyle.Light })
  }, [])

  const impactMedium = useCallback(async () => {
    await Haptics.impact({ style: ImpactStyle.Medium })
  }, [])

  const impactHeavy = useCallback(async () => {
    await Haptics.impact({ style: ImpactStyle.Heavy })
  }, [])

  const notificationSuccess = useCallback(async () => {
    await Haptics.notification({ type: NotificationType.Success })
  }, [])

  const notificationWarning = useCallback(async () => {
    await Haptics.notification({ type: NotificationType.Warning })
  }, [])

  const notificationError = useCallback(async () => {
    await Haptics.notification({ type: NotificationType.Error })
  }, [])

  const vibrate = useCallback(async (duration = 300) => {
    await Haptics.vibrate({ duration })
  }, [])

  return {
    impactLight,
    impactMedium,
    impactHeavy,
    notificationSuccess,
    notificationWarning,
    notificationError,
    vibrate,
  }
}

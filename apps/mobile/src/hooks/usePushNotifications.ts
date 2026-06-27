import { useEffect, useCallback } from 'react'
import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'

interface UsePushNotificationsResult {
  register: () => Promise<void>
  sendLocal: (title: string, body: string) => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsResult {
  useEffect(() => {
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title: notification.title ?? 'STAT Alert',
          body: notification.body ?? 'New notification',
          schedule: { at: new Date(Date.now() + 1000) },
        }],
      })
    })
  }, [])

  const register = useCallback(async () => {
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive === 'granted') {
      await PushNotifications.register()
    }
  }, [])

  const sendLocal = useCallback(async (title: string, body: string) => {
    await LocalNotifications.schedule({
      notifications: [{
        id: Date.now(),
        title,
        body,
        schedule: { at: new Date(Date.now() + 1000) },
      }],
    })
  }, [])

  return { register, sendLocal }
}

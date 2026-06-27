# Phase 4: Native Polish + Ship

## Goal

Push notifications, camera (body cam), offline queue, haptic patterns, Android build.

## Deliverables

- [x] Push notifications hook (FCM via Capacitor)
- [x] Camera hook (body cam capture in SecurityTactical)
- [x] Offline queue (Capacitor Preferences, retry on reconnect)
- [x] Haptic patterns (SOS press, dispatch accepted)
- [ ] Android build + sign (manual step)

## Native hooks

- `usePushNotifications`: register FCM, bridge to local notifications
- `useCamera`: Capacitor Camera plugin → data URL
- `useOfflineQueue`: enqueue mutations to Preferences, replay on reconnect

## Unresolved

- FCM/APNs credentials needed for production push
- Android signing key needed for Play Store
- iOS platform not yet added (deferred)

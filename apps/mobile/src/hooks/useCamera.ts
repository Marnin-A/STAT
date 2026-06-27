import { useCallback } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

interface UseCameraResult {
  takePhoto: () => Promise<string | null>
}

export function useCamera(): UseCameraResult {
  const takePhoto = useCallback(async (): Promise<string | null> => {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      })
      return photo.dataUrl ?? null
    } catch {
      return null
    }
  }, [])

  return { takePhoto }
}

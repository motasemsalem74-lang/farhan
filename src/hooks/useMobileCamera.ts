import { useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseMobileCameraOptions {
  preferredFacingMode?: 'user' | 'environment'
  onSuccess?: (stream: MediaStream) => void
  onError?: (error: Error) => void
}

interface CameraCapabilities {
  hasMultipleCameras: boolean
  supportsFacingMode: boolean
  devices: MediaDeviceInfo[]
}

export function useMobileCamera(options: UseMobileCameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    options.preferredFacingMode || 'environment'
  )
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    hasMultipleCameras: false,
    supportsFacingMode: false,
    devices: []
  })

  // Get available camera devices
  const getDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      setCapabilities({
        hasMultipleCameras: videoDevices.length > 1,
        supportsFacingMode: videoDevices.some(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('front') ||
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('user')
        ),
        devices: videoDevices
      })
      
      return videoDevices
    } catch (error) {
      console.error('Error getting devices:', error)
      return []
    }
  }, [])

  // Enhanced camera start with multiple fallback strategies
  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'الكاميرا غير مدعومة في هذا المتصفح'
      setError(errorMsg)
      options.onError?.(new Error(errorMsg))
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Get available devices first
      await getDevices()

      // Define constraint strategies in order of preference
      const constraintStrategies: MediaStreamConstraints[] = [
        // Strategy 1: Full HD with exact facing mode
        {
          video: {
            facingMode: { exact: facingMode },
            width: { ideal: 1920, max: 1920, min: 640 },
            height: { ideal: 1080, max: 1080, min: 480 },
            aspectRatio: { ideal: 16/9 },
            frameRate: { ideal: 30, max: 30 }
          }
        },
        // Strategy 2: HD with ideal facing mode
        {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30 }
          }
        },
        // Strategy 3: Opposite facing mode
        {
          video: {
            facingMode: { ideal: facingMode === 'environment' ? 'user' : 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        // Strategy 4: Any camera with reduced constraints
        {
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        // Strategy 5: Basic video only (last resort)
        {
          video: true
        }
      ]

      let stream: MediaStream | null = null
      let lastError: Error | null = null

      // Try each strategy
      for (let i = 0; i < constraintStrategies.length; i++) {
        try {
          console.log(`🎥 Camera attempt ${i + 1}:`, constraintStrategies[i])
          
          stream = await navigator.mediaDevices.getUserMedia(constraintStrategies[i])
          
          if (stream && stream.getVideoTracks().length > 0) {
            console.log(`✅ Camera started successfully on attempt ${i + 1}`)
            break
          }
        } catch (attemptError) {
          lastError = attemptError as Error
          console.log(`❌ Camera attempt ${i + 1} failed:`, attemptError)
          
          // Continue to next strategy unless it's the last one
          if (i < constraintStrategies.length - 1) {
            continue
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('فشل في الحصول على تدفق الكاميرا')
      }

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('عنصر الفيديو غير موجود'))
            return
          }

          const video = videoRef.current
          let resolved = false

          const onLoadedMetadata = () => {
            if (resolved) return
            resolved = true
            
            cleanup()
            
            // Ensure video dimensions are valid
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              reject(new Error('أبعاد الفيديو غير صالحة'))
              return
            }

            // Start playing
            video.play()
              .then(() => {
                setIsStreaming(true)
                options.onSuccess?.(stream!)
                resolve()
              })
              .catch(reject)
          }

          const onError = (e: Event) => {
            if (resolved) return
            resolved = true
            
            cleanup()
            reject(new Error('فشل في تحميل الفيديو'))
          }

          const onTimeout = () => {
            if (resolved) return
            resolved = true
            
            cleanup()
            reject(new Error('انتهت مهلة انتظار تحميل الكاميرا'))
          }

          const cleanup = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            clearTimeout(timeoutId)
          }

          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)
          
          // 10 second timeout
          const timeoutId = setTimeout(onTimeout, 10000)
        })

        toast.success('تم تشغيل الكاميرا بنجاح')
        return true
      }

      throw new Error('عنصر الفيديو غير متاح')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      console.error('Camera error:', error)
      
      setError(`فشل في تشغيل الكاميرا: ${errorMessage}`)
      setIsStreaming(false)
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      options.onError?.(error instanceof Error ? error : new Error(errorMessage))
      toast.error('فشل في تشغيل الكاميرا. يرجى المحاولة مرة أخرى أو استخدام رفع الملف')
      
      return false
    } finally {
      setIsLoading(false)
    }
  }, [facingMode, options, getDevices])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('🛑 Camera track stopped:', track.kind)
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsStreaming(false)
    setError(null)
  }, [])

  // Switch camera (if multiple cameras available)
  const switchCamera = useCallback(() => {
    if (!capabilities.hasMultipleCameras) {
      toast.info('لا توجد كاميرات أخرى متاحة')
      return
    }

    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacingMode)
    
    // Restart camera with new facing mode
    if (isStreaming) {
      stopCamera()
      // Small delay to ensure cleanup
      setTimeout(() => {
        startCamera()
      }, 100)
    }
  }, [facingMode, capabilities.hasMultipleCameras, isStreaming, stopCamera, startCamera])

  // Capture image from video
  const captureImage = useCallback((quality: number = 0.8): string | null => {
    if (!videoRef.current || !isStreaming) {
      toast.error('الكاميرا غير جاهزة للتصوير')
      return null
    }

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('لا يمكن إنشاء سياق الرسم')
      }

      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth || video.clientWidth
      canvas.height = video.videoHeight || video.clientHeight

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('أبعاد الفيديو غير صالحة')
      }

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      
      if (dataUrl === 'data:,' || dataUrl.length < 100) {
        throw new Error('فشل في التقاط بيانات الصورة')
      }

      console.log('📸 Image captured successfully:', {
        width: canvas.width,
        height: canvas.height,
        size: Math.round(dataUrl.length / 1024) + 'KB'
      })

      return dataUrl
    } catch (error) {
      console.error('Capture error:', error)
      toast.error('فشل في التقاط الصورة')
      return null
    }
  }, [isStreaming])

  // Get camera info
  const getCameraInfo = useCallback(() => {
    if (!streamRef.current) return null

    const videoTrack = streamRef.current.getVideoTracks()[0]
    if (!videoTrack) return null

    const settings = videoTrack.getSettings()
    return {
      deviceId: settings.deviceId,
      facingMode: settings.facingMode,
      width: settings.width,
      height: settings.height,
      frameRate: settings.frameRate,
      aspectRatio: settings.aspectRatio
    }
  }, [])

  return {
    // Refs
    videoRef,
    
    // State
    isStreaming,
    isLoading,
    error,
    facingMode,
    capabilities,
    
    // Actions
    startCamera,
    stopCamera,
    switchCamera,
    captureImage,
    getCameraInfo,
    getDevices
  }
}

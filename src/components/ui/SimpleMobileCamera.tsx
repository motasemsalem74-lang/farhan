import { useRef, useState, useCallback } from 'react'
import { Camera, Upload, X, RotateCcw } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'

interface SimpleMobileCameraProps {
  onCapture: (imageDataUrl: string) => void
  onCancel: () => void
  title?: string
  preferredFacingMode?: 'user' | 'environment'
}

export function SimpleMobileCamera({ 
  onCapture, 
  onCancel, 
  title = "التقاط صورة",
  preferredFacingMode = 'environment'
}: SimpleMobileCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(preferredFacingMode)

  // Start camera with simple approach
  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Simple constraints - no complex overlay requirements
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      }

      let stream: MediaStream

      try {
        // Try with specified facing mode
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (error) {
        console.log('Failed with specified facing mode, trying opposite')
        // Try with opposite facing mode
        const oppositeFacing = facingMode === 'environment' ? 'user' : 'environment'
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: oppositeFacing,
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        })
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
            setIsStreaming(true)
            setIsLoading(false)
            toast.success('تم تشغيل الكاميرا بنجاح')
          }
        }
      }
    } catch (error) {
      console.error('Camera error:', error)
      setError('فشل في تشغيل الكاميرا')
      setIsLoading(false)
      toast.error('فشل في تشغيل الكاميرا. يرجى استخدام رفع الملف')
    }
  }, [facingMode])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }, [])

  // Capture image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !isStreaming) {
      toast.error('الكاميرا غير جاهزة')
      return
    }

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Canvas context not available')
      }

      // Set canvas size to video size
      canvas.width = video.videoWidth || video.clientWidth
      canvas.height = video.videoHeight || video.clientHeight

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      
      if (imageDataUrl === 'data:,') {
        throw new Error('Failed to capture image data')
      }

      // Stop camera and return image
      stopCamera()
      onCapture(imageDataUrl)
      toast.success('تم التقاط الصورة بنجاح')
    } catch (error) {
      console.error('Capture error:', error)
      toast.error('فشل في التقاط الصورة')
    }
  }, [isStreaming, onCapture, stopCamera])

  // Switch camera
  const switchCamera = useCallback(() => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacingMode)
    
    if (isStreaming) {
      stopCamera()
      setTimeout(() => {
        startCamera()
      }, 100)
    }
  }, [facingMode, isStreaming, stopCamera, startCamera])

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        onCapture(result)
        toast.success('تم رفع الصورة بنجاح')
      }
    }
    reader.onerror = () => {
      toast.error('فشل في قراءة الملف')
    }
    reader.readAsDataURL(file)
  }, [onCapture])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center arabic-text">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View - Simple without overlay */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {isStreaming ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              {isLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-gray-300 arabic-text">جاري تحميل الكاميرا...</p>
                </div>
              ) : error ? (
                <div className="text-center p-4">
                  <p className="text-red-400 mb-2 arabic-text">خطأ في الكاميرا</p>
                  <p className="text-sm text-gray-300 arabic-text">{error}</p>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-300 arabic-text">اضغط لتشغيل الكاميرا</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {isStreaming ? (
            <>
              <Button onClick={captureImage} className="flex-1">
                <Camera className="ml-2 h-4 w-4" />
                التقاط
              </Button>
              
              <Button onClick={switchCamera} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={startCamera} className="flex-1" disabled={isLoading}>
              <Camera className="ml-2 h-4 w-4" />
              {isLoading ? 'جاري التحميل...' : 'تشغيل الكاميرا'}
            </Button>
          )}
        </div>

        {/* File Upload Alternative */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2 arabic-text">أو</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full"
          >
            <Upload className="ml-2 h-4 w-4" />
            رفع صورة من الجهاز
          </Button>
        </div>

        {/* Cancel Button */}
        <Button onClick={onCancel} variant="ghost" className="w-full">
          <X className="ml-2 h-4 w-4" />
          إلغاء
        </Button>
      </CardContent>
    </Card>
  )
}

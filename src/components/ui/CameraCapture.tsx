import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { 
  Camera as CameraIcon, 
  RotateCcw, 
  Check, 
  X, 
  Loader2,
  SwitchCamera
} from 'lucide-react'

import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void
  onCancel: () => void
  title: string
  className?: string
  overlayText?: string
}

type CameraStatus = 'idle' | 'ready' | 'capturing' | 'captured'

export function CameraCapture({ 
  onCapture, 
  onCancel, 
  title, 
  className,
  overlayText = "ضع الهدف داخل الإطار المحدد"
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)

  // Initialize camera
  useEffect(() => {
    initializeCamera()
    checkCameraDevices()
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode])

  const checkCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setHasMultipleCameras(videoDevices.length > 1)
    } catch (error) {
      console.error('Error checking camera devices:', error)
    }
  }

  const initializeCamera = async () => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      setStatus('idle')

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('الكاميرا غير مدعومة على هذا الجهاز أو المتصفح')
        return
      }

      // Try different camera configurations for mobile compatibility
      let mediaStream: MediaStream | null = null
      
      // First try: Specific facing mode with ideal settings
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        }
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (facingError) {
        console.log(`${facingMode} camera failed, trying opposite:`, facingError)
        
        // Second try: Opposite facing mode
        try {
          const oppositeFacing = facingMode === 'environment' ? 'user' : 'environment'
          const constraints: MediaStreamConstraints = {
            video: {
              facingMode: oppositeFacing,
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 }
            }
          }
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (oppositeError) {
          console.log('Opposite camera failed, trying basic video:', oppositeError)
          
          // Third try: Basic video without specific facing mode
          const constraints: MediaStreamConstraints = {
            video: {
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 }
            }
          }
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        }
      }

      if (!mediaStream) {
        throw new Error('Failed to get media stream')
      }
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        // Add multiple event listeners for better compatibility
        const handleCanPlay = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setStatus('ready')
            }).catch(err => {
              console.error('Error playing video:', err)
              toast.error('فشل في تشغيل الكاميرا')
            })
          }
        }

        videoRef.current.addEventListener('canplay', handleCanPlay)
        videoRef.current.addEventListener('loadedmetadata', handleCanPlay)
        
        // Fallback for mobile devices
        setTimeout(() => {
          if (videoRef.current && status === 'idle') {
            videoRef.current.play().then(() => {
              setStatus('ready')
            }).catch(console.error)
          }
        }, 500)
      }
    } catch (err: any) {
      console.error('Error starting camera:', err)
      let errorMessage = 'فشل في تشغيل الكاميرا'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'تم رفض الإذن للوصول للكاميرا. يرجى السماح بالوصول للكاميرا في إعدادات المتصفح.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'لم يتم العثور على كاميرا. تأكد من وجود كاميرا متصلة بالجهاز.'
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'الكاميرا غير مدعومة على هذا الجهاز أو المتصفح.'
      }
      
      toast.error(errorMessage)
      setStatus('idle')
    }
  }

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || status !== 'ready') return

    try {
      setStatus('capturing')
      
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (!context) {
        throw new Error('Cannot get canvas context')
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Get image data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imageDataUrl)
      setStatus('captured')
      
      toast.success('تم التقاط الصورة بنجاح')
    } catch (error) {
      console.error('Error capturing image:', error)
      toast.error('فشل في التقاط الصورة')
      setStatus('ready')
    }
  }, [status])

  const retakePhoto = () => {
    setCapturedImage(null)
    setStatus('ready')
  }

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage)
    }
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    onCancel()
  }

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CameraIcon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Camera View */}
        {(status === 'idle' || status === 'ready') && (
          <div className="relative">
            <div className="camera-container rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              
              {/* Overlay Guide */}
              <div className="camera-overlay absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-dashed border-white/80 rounded-lg flex items-center justify-center">
                  <p className="bg-black/50 text-white px-3 py-1 rounded text-sm arabic-text">
                    {overlayText}
                  </p>
                </div>
              </div>

              {/* Loading indicator */}
              {status === 'idle' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-sm font-medium arabic-text">
                      جاري تحضير الكاميرا...
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Camera Controls */}
            <div className="flex justify-center gap-4 mt-4">
              <Button 
                onClick={captureImage} 
                size="lg"
                disabled={status !== 'ready'}
              >
                <CameraIcon className="ml-2 h-5 w-5" />
                التقط الصورة
              </Button>
              
              {hasMultipleCameras && (
                <Button 
                  variant="outline" 
                  onClick={switchCamera}
                  disabled={status !== 'ready'}
                >
                  <SwitchCamera className="ml-2 h-4 w-4" />
                  تبديل الكاميرا
                </Button>
              )}
              
              <Button variant="outline" onClick={handleCancel}>
                <X className="ml-2 h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {/* Captured Image Review */}
        {status === 'captured' && capturedImage && (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full rounded-lg border"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button onClick={confirmCapture}>
                <Check className="ml-2 h-4 w-4" />
                تأكيد الصورة
              </Button>
              <Button variant="outline" onClick={retakePhoto}>
                <RotateCcw className="ml-2 h-4 w-4" />
                إعادة التصوير
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="ml-2 h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {status === 'ready' && (
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2 arabic-text">
              نصائح للحصول على أفضل النتائج:
            </h4>
            <ul className="text-xs text-blue-700 space-y-1 arabic-text">
              <li>• تأكد من وضوح الإضاءة</li>
              <li>• ضع الكاميرا بشكل مستقيم</li>
              <li>• تأكد من أن الهدف داخل الإطار المحدد</li>
              <li>• تجنب الاهتزاز أثناء التصوير</li>
            </ul>
          </div>
        )}

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}

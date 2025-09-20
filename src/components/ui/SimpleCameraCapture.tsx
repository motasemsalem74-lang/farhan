import React, { useState } from 'react'
import { SimpleMobileCamera } from './SimpleMobileCamera'
import { extractMotorFingerprintTrained, extractChassisNumberTrained } from '@/lib/trainedOCR'
import { toast } from 'sonner'
import { Button } from './Button'
import { Input } from './Input'

interface SimpleCameraCaptureProps {
  onImageCaptured: (text: string, imageUrl: string) => void
  onCancel: () => void
  title: string
  placeholder: string
  className?: string
  ocrType?: 'motor' | 'chassis' | 'general'
  defaultCapturedImage?: string
}

type CaptureStatus = 'idle' | 'captured' | 'editing'

export function SimpleCameraCapture({ 
  onImageCaptured, 
  onCancel, 
  title, 
  placeholder,
  className,
  ocrType = 'general',
  defaultCapturedImage
}: SimpleCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(defaultCapturedImage || null)
  const [extractedText, setExtractedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      let mediaStream: MediaStream | null = null
      
      // Enhanced mobile camera support with multiple fallbacks
      const attempts = [
        // Attempt 1: Environment camera with full constraints
        {
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1920, max: 1920, min: 640 },
            height: { ideal: 1080, max: 1080, min: 480 },
            aspectRatio: { ideal: 16/9 },
            frameRate: { ideal: 30, max: 30 }
          }
        },
        // Attempt 2: Environment camera with ideal constraints
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        // Attempt 3: User camera
        {
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        // Attempt 4: Any camera with reduced constraints
        {
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        // Attempt 5: Basic video only
        { video: true }
      ]

      for (let i = 0; i < attempts.length; i++) {
        try {
          console.log(`Camera attempt ${i + 1}:`, attempts[i])
          mediaStream = await navigator.mediaDevices.getUserMedia(attempts[i])
          if (mediaStream) {
            console.log(`✅ Camera started successfully on attempt ${i + 1}`)
            break
          }
        } catch (attemptError) {
          console.log(`❌ Camera attempt ${i + 1} failed:`, attemptError)
          if (i === attempts.length - 1) {
            throw attemptError
          }
        }
      }
      
      if (mediaStream && videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        
        // Wait for video to load
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'))
            return
          }
          
          const video = videoRef.current
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            video.play().then(resolve).catch(reject)
          }
          
          const onError = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Video loading failed'))
          }
          
          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)
        })
        
        toast.success('تم تشغيل الكاميرا بنجاح')
      }
    } catch (error) {
      console.error('Camera error:', error)
      toast.error('فشل في تشغيل الكاميرا. يرجى استخدام رفع الملف بدلاً من ذلك')
    }
  }, [stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const performOCR = useCallback(async (imageDataUrl: string) => {
    if (!imageDataUrl || imageDataUrl.length < 100) {
      console.warn('Invalid image data for OCR')
      setIsEditing(true)
      return
    }

    setIsProcessingOCR(true)
    
    // Use requestAnimationFrame to avoid blocking the main thread
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    try {
      toast.loading('جاري استخراج النص من الصورة...')
      
      let result
      if (ocrType === 'motor') {
        result = await extractMotorFingerprintTrained(imageDataUrl)
      } else if (ocrType === 'chassis') {
        result = await extractChassisNumberTrained(imageDataUrl)
      } else {
        // For general OCR, we'll use motor fingerprint extraction as default
        result = await extractMotorFingerprintTrained(imageDataUrl)
      }
      
      // Use requestAnimationFrame for UI updates
      requestAnimationFrame(() => {
        toast.dismiss()
        
        if (result.success && result.text && result.text.trim().length > 0) {
          setExtractedText(result.text.trim())
          toast.success('تم استخراج النص بنجاح!')
        } else {
          const errorMsg = result.error || 'فشل في استخراج النص تلقائياً. يرجى إدخال النص يدوياً'
          toast.warning(errorMsg)
          setIsEditing(true) // Enable manual editing
        }
      })
      
    } catch (error) {
      console.error('OCR error:', error)
      
      // Use requestAnimationFrame for error handling UI updates
      requestAnimationFrame(() => {
        toast.dismiss()
        
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
        if (errorMessage.includes('Image file is empty') || errorMessage.includes('Invalid image')) {
          toast.error('الصورة فارغة أو غير صالحة. يرجى المحاولة مرة أخرى')
        } else if (errorMessage.includes('انتهت مهلة')) {
          toast.error('انتهت مهلة استخراج النص. يرجى المحاولة مرة أخرى')
        } else {
          toast.error('حدث خطأ أثناء استخراج النص. يرجى إدخال النص يدوياً')
        }
        
        setIsEditing(true) // Enable manual editing
      })
      
    } finally {
      // Use requestAnimationFrame for final state updates
      requestAnimationFrame(() => {
        setIsProcessingOCR(false)
      })
    }
  }, [ocrType])

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('الكاميرا غير جاهزة')
      return
    }

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Canvas context not available')
      }

      // Check if video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast.error('الكاميرا لم تكتمل التحميل بعد')
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      
      // Validate the captured image
      if (!imageDataUrl || imageDataUrl === 'data:,') {
        throw new Error('فشل في التقاط الصورة - الصورة فارغة')
      }

      console.log('Captured image size:', imageDataUrl.length, 'characters')
      
      setCapturedImage(imageDataUrl)
      setStatus('captured')
      stopCamera()
      
      toast.success('تم التقاط الصورة بنجاح')
      
      // Automatically extract text using OCR
      await performOCR(imageDataUrl)
    } catch (error) {
      console.error('Capture error:', error)
      toast.error('فشل في التقاط الصورة: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'))
    }
  }, [stopCamera, ocrType, performOCR])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صحيح')
      return
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت')
      return
    }

    if (file.size === 0) {
      toast.error('الملف فارغ')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string
      
      // Validate the image data
      if (!imageDataUrl || imageDataUrl === 'data:,' || imageDataUrl.length < 100) {
        toast.error('فشل في قراءة الصورة')
        return
      }

      console.log('File uploaded, image data length:', imageDataUrl.length)
      
      setCapturedImage(imageDataUrl)
      setStatus('captured')
      toast.success('تم رفع الصورة بنجاح')
      
      // Automatically extract text using OCR
      await performOCR(imageDataUrl)
    }
    
    reader.onerror = () => {
      toast.error('فشل في قراءة الملف')
    }
    
    reader.readAsDataURL(file)
  }, [performOCR])

  const retakePhoto = useCallback(() => {
    setStatus('idle')
    setCapturedImage(null)
    setExtractedText('')
    setIsEditing(false)
    startCamera()
  }, [startCamera])

  const confirmImage = useCallback(() => {
    if (!extractedText.trim()) {
      toast.error('يرجى إدخال النص المطلوب')
      return
    }
    
    onImageCaptured(extractedText.trim(), capturedImage!)
  }, [extractedText, capturedImage, onImageCaptured])

  const toggleEdit = () => {
    setIsEditing(!isEditing)
  }

  // Start camera when component mounts
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CameraIcon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Camera/Upload View */}
        {status === 'idle' && (
          <div className="space-y-4">
            {/* Camera Preview */}
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-black"
                style={{ aspectRatio: '4/3' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Overlay Guide */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-dashed border-white/80 rounded-lg flex items-center justify-center">
                  <p className="bg-black/50 text-white px-3 py-1 rounded text-sm arabic-text">
                    ضع النص داخل الإطار المحدد
                  </p>
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-center gap-4">
                <Button onClick={captureImage} size="lg">
                  <CameraIcon className="ml-2 h-5 w-5" />
                  التقط الصورة
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  <X className="ml-2 h-4 w-4" />
                  إلغاء
                </Button>
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
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="ml-2 h-4 w-4" />
                  رفع صورة من الجهاز
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Image Review and Text Input */}
        {status === 'captured' && capturedImage && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2 arabic-text">الصورة الملتقطة</h4>
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-full rounded-lg border"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium arabic-text">النص المستخرج</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleEdit}
                    className="arabic-text"
                  >
                    {isEditing ? (
                      <>
                        <Save className="ml-1 h-3 w-3" />
                        حفظ
                      </>
                    ) : (
                      <>
                        <Edit className="ml-1 h-3 w-3" />
                        تعديل
                      </>
                    )}
                  </Button>
                </div>
                
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="extracted-text">أدخل النص يدوياً</Label>
                    <textarea
                      id="extracted-text"
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      placeholder={placeholder}
                      className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-al-farhan-500 focus:border-transparent arabic-text input-rtl"
                      rows={4}
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border rounded-lg">
                    <p className="text-sm arabic-text whitespace-pre-wrap">
                      {extractedText || 'اضغط تعديل لإدخال النص يدوياً'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button 
                onClick={confirmImage} 
                disabled={!extractedText.trim() || isProcessingOCR}
              >
                <Check className="ml-2 h-4 w-4" />
                تأكيد النص
              </Button>
              <Button variant="outline" onClick={retakePhoto} disabled={isProcessingOCR}>
                <RotateCcw className="ml-2 h-4 w-4" />
                إعادة التصوير
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={isProcessingOCR}>
                <X className="ml-2 h-4 w-4" />
                إلغاء
              </Button>
            </div>
            
            {/* OCR Processing Indicator */}
            {isProcessingOCR && (
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-800 arabic-text">جاري استخراج النص...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {status === 'idle' && (
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2 arabic-text">
              نصائح للحصول على أفضل النتائج:
            </h4>
            <ul className="text-xs text-blue-700 space-y-1 arabic-text">
              <li>• تأكد من وضوح الإضاءة</li>
              <li>• ضع الكاميرا بشكل مستقيم على النص</li>
              <li>• تأكد من أن النص داخل الإطار المحدد</li>
              <li>• يمكنك رفع صورة من الجهاز إذا لم تعمل الكاميرا</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

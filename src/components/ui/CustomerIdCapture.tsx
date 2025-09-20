import React, { useState, useRef, useCallback } from 'react'
import { SimpleMobileCamera } from './SimpleMobileCamera'
import { Button } from './Button'
import { Input } from './Input'
import { toast } from 'sonner'
import { extractEgyptianIdCard } from '@/lib/trainedOCR'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Edit, Check, Camera, Upload, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card'

interface CustomerData {
  name: string
  nationalId: string
  address: string
  phone?: string
  birthDate?: string
  gender?: string
}

interface CustomerIdCaptureProps {
  onDataExtracted: (data: CustomerData) => void
  onImageCaptured?: (imageUrl: string) => void
}

export function CustomerIdCapture({ onDataExtracted, onImageCaptured }: CustomerIdCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<CustomerData | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      // Try different camera configurations for mobile compatibility
      let stream: MediaStream | null = null
      
      // First try: Environment camera with ideal settings
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        })
      } catch (envError) {
        console.log('Environment camera failed, trying user camera:', envError)
        
        // Second try: User camera (front camera)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 }
            }
          })
        } catch (userError) {
          console.log('User camera failed, trying basic video:', userError)
          
          // Third try: Basic video without specific facing mode
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 }
            }
          })
        }
      }
      
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCapturing(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast.error('لا يمكن الوصول إلى الكاميرا. يرجى استخدام رفع الملف بدلاً من ذلك')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageDataUrl)
    stopCamera()
    
    if (onImageCaptured) {
      onImageCaptured(imageDataUrl)
    }
  }, [stopCamera, onImageCaptured])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string
      setCapturedImage(imageDataUrl)
      
      if (onImageCaptured) {
        onImageCaptured(imageDataUrl)
      }
    }
    reader.readAsDataURL(file)
  }, [onImageCaptured])

  const extractDataFromImage = useCallback(async () => {
    if (!capturedImage) return

    setIsProcessing(true)
    try {
      toast.loading('جاري استخراج البيانات ورفع الصورة...')
      
      // First, upload the image to Cloudinary
      let uploadedImageUrl = ''
      try {
        // Convert data URL to blob
        const response = await fetch(capturedImage)
        const blob = await response.blob()
        
        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(blob, {
          folder: 'customer-ids',
          tags: ['customer', 'national-id']
        })
        
        uploadedImageUrl = uploadResult.secure_url
        console.log('✅ Image uploaded to Cloudinary:', uploadedImageUrl)
        
        // Pass the uploaded URL to parent component
        if (onImageCaptured) {
          onImageCaptured(uploadedImageUrl)
        }
      } catch (uploadError) {
        console.error('❌ Failed to upload image:', uploadError)
        toast.warning('فشل في رفع الصورة، لكن سيتم المتابعة بالاستخراج')
      }
      
      // Use enhanced OCR to extract ID card data
      const result = await extractEgyptianIdCard(capturedImage)
      
      toast.dismiss()
      
      if (result.success && result.data) {
        setExtractedData(result.data)
        onDataExtracted(result.data)
        toast.success('تم استخراج البيانات ورفع الصورة بنجاح!')
      } else {
        toast.warning(result.error || 'فشل في استخراج البيانات تلقائياً. يرجى إدخال البيانات يدوياً')
        const manualData: CustomerData = {
          name: '',
          nationalId: '',
          address: '',
          phone: ''
        }
        setExtractedData(manualData)
      }
    } catch (error) {
      console.error('Error extracting data:', error)
      toast.dismiss()
      toast.error('حدث خطأ أثناء استخراج البيانات')
      const manualData: CustomerData = {
        name: '',
        nationalId: '',
        address: '',
        phone: ''
      }
      setExtractedData(manualData)
    } finally {
      setIsProcessing(false)
    }
  }, [capturedImage, onDataExtracted, onImageCaptured])

  const resetCapture = useCallback(() => {
    setCapturedImage(null)
    setExtractedData(null)
    stopCamera()
  }, [stopCamera])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          تصوير بطاقة الرقم القومي
        </CardTitle>
        <CardDescription>
          قم بتصوير أو رفع صورة بطاقة الرقم القومي لاستخراج البيانات تلقائياً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!capturedImage && !isCapturing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={startCamera} className="w-full">
              <Camera className="ml-2 h-4 w-4" />
              تصوير بالكاميرا
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="ml-2 h-4 w-4" />
              رفع صورة
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {isCapturing && (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border"
                style={{ maxHeight: '400px' }}
              />
              <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 right-4 text-center">
                  <p className="text-sm text-white bg-black bg-opacity-50 px-2 py-1 rounded arabic-text">
                    ضع بطاقة الرقم القومي داخل الإطار
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="ml-2 h-4 w-4" />
                التقاط الصورة
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                <X className="ml-2 h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedImage}
                alt="بطاقة الرقم القومي"
                className="w-full rounded-lg border max-h-96 object-contain"
              />
              {extractedData && (
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 text-white p-1 rounded-full">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>

            {!extractedData && (
              <div className="flex gap-2">
                <Button 
                  onClick={extractDataFromImage} 
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                  {isProcessing ? 'جاري استخراج البيانات...' : 'استخراج البيانات'}
                </Button>
                <Button variant="outline" onClick={resetCapture}>
                  <X className="ml-2 h-4 w-4" />
                  إعادة التصوير
                </Button>
              </div>
            )}

            {extractedData && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 arabic-text mb-2">
                  تم استخراج البيانات بنجاح ✅
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">الاسم:</span> {extractedData.name}
                  </div>
                  <div>
                    <span className="font-medium">الرقم القومي:</span> {extractedData.nationalId}
                  </div>
                  {extractedData.birthDate && (
                    <div>
                      <span className="font-medium">تاريخ الميلاد:</span> {extractedData.birthDate}
                    </div>
                  )}
                  {extractedData.gender && (
                    <div>
                      <span className="font-medium">النوع:</span> {extractedData.gender}
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <span className="font-medium">العنوان:</span> {extractedData.address}
                  </div>
                  {extractedData.phone && (
                    <div>
                      <span className="font-medium">الهاتف:</span> {extractedData.phone}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={resetCapture}>
                    تصوير بطاقة أخرى
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}

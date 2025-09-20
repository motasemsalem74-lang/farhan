import React, { useState } from 'react'
import { SimpleMobileCamera } from './SimpleMobileCamera'
import { extractMotorFingerprintTrained, extractChassisNumberTrained } from '@/lib/trainedOCR'
import { toast } from 'sonner'
import { Button } from './Button'
import { Input } from './Input'
import { Edit, Check } from 'lucide-react'

interface SimpleCameraCaptureProps {
  onImageCaptured: (text: string, imageUrl: string) => void
  onCancel: () => void
  title: string
  placeholder: string
  className?: string
  ocrType?: 'motor' | 'chassis' | 'general'
}

export function NewSimpleCameraCapture({ 
  onImageCaptured, 
  onCancel, 
  title, 
  placeholder,
  ocrType = 'general'
}: SimpleCameraCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)

  // Handle image capture from camera
  const handleImageCapture = async (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl)
    setIsProcessingOCR(true)
    
    try {
      let text = ''
      
      // Perform OCR based on type
      if (ocrType === 'motor') {
        text = await extractMotorFingerprintTrained(imageDataUrl)
      } else if (ocrType === 'chassis') {
        text = await extractChassisNumberTrained(imageDataUrl)
      }
      
      setExtractedText(text)
      toast.success('تم استخراج النص بنجاح')
    } catch (error) {
      console.error('OCR Error:', error)
      toast.error('فشل في استخراج النص من الصورة')
    } finally {
      setIsProcessingOCR(false)
    }
  }

  // Handle text editing
  const handleTextChange = (value: string) => {
    setExtractedText(value)
  }

  // Confirm and submit
  const handleConfirm = () => {
    if (capturedImage && extractedText.trim()) {
      onImageCaptured(extractedText.trim(), capturedImage)
    } else {
      toast.error('يرجى التأكد من وجود صورة ونص مستخرج')
    }
  }

  // Reset and retake
  const handleRetake = () => {
    setCapturedImage(null)
    setExtractedText('')
    setIsEditing(false)
  }

  // Show camera if no image captured
  if (!capturedImage) {
    return (
      <SimpleMobileCamera
        title={title}
        onCapture={handleImageCapture}
        onCancel={onCancel}
        preferredFacingMode="environment"
      />
    )
  }

  // Show captured image and text editing
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-center mb-4 arabic-text">{title}</h3>
      
      {/* Captured Image */}
      <div className="mb-4">
        <img 
          src={capturedImage} 
          alt="Captured" 
          className="w-full rounded-lg border"
        />
      </div>

      {/* Extracted Text */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
          النص المستخرج:
        </label>
        
        {isProcessingOCR ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 arabic-text">جاري استخراج النص...</span>
          </div>
        ) : (
          <div className="relative">
            <Input
              value={extractedText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={placeholder}
              className="w-full pr-10"
              readOnly={!isEditing}
            />
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2"
            >
              {isEditing ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleRetake} variant="outline" className="flex-1">
          إعادة التقاط
        </Button>
        <Button 
          onClick={handleConfirm} 
          className="flex-1"
          disabled={!extractedText.trim() || isProcessingOCR}
        >
          تأكيد
        </Button>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { NativeCameraCapture } from './NativeCameraCapture'
import { Button } from './Button'
import { Input } from './Input'
import { Label } from './Label'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'
import { extractTextFromImage } from '@/lib/ocr'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Edit, Check, Package, Loader2, RotateCcw } from 'lucide-react'

interface ProductImageCaptureProps {
  type: 'motorFingerprint' | 'chassisNumber'
  onDataExtracted: (text: string, imageUrl?: string) => void
  onCancel: () => void
  title?: string
  initialValue?: string
}

export function ProductImageCapture({
  type,
  onDataExtracted,
  onCancel,
  title,
  initialValue = ''
}: ProductImageCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [extractedText, setExtractedText] = useState(initialValue)
  const [isEditing, setIsEditing] = useState(false)

  const getTitle = () => {
    if (title) return title
    return type === 'motorFingerprint' ? 'تصوير بصمة الموتور' : 'تصوير رقم الشاسيه'
  }

  const getPlaceholder = () => {
    return type === 'motorFingerprint' 
      ? 'مثال: HJ162FM2SB806363' 
      : 'مثال: XL5DPCK1AASA10648'
  }

  const getFolder = () => {
    return type === 'motorFingerprint' ? 'motor-fingerprints' : 'chassis-numbers'
  }

  const handleImageCapture = useCallback(async (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl)
    setIsProcessingOCR(true)
    
    try {
      // استخراج النص من الصورة باستخدام OCR
      const ocrResult = await extractTextFromImage(imageDataUrl)
      
      if (ocrResult && ocrResult.text && ocrResult.text.trim()) {
        // تنظيف النص المستخرج
        const cleanedText = ocrResult.text.trim().replace(/\s+/g, '').toUpperCase()
        setExtractedText(cleanedText)
        toast.success(`تم استخراج ${type === 'motorFingerprint' ? 'بصمة الموتور' : 'رقم الشاسيه'} بنجاح`)
      } else {
        toast.warning('لم يتم العثور على نص واضح في الصورة. يرجى إدخال النص يدوياً')
        setIsEditing(true)
      }
    } catch (error) {
      console.error('OCR Error:', error)
      toast.error('فشل في استخراج النص من الصورة. يرجى إدخال النص يدوياً')
      setIsEditing(true)
    } finally {
      setIsProcessingOCR(false)
    }
  }, [type])

  const handleConfirm = useCallback(async () => {
    if (!extractedText.trim()) {
      toast.error(`يرجى إدخال ${type === 'motorFingerprint' ? 'بصمة الموتور' : 'رقم الشاسيه'}`)
      return
    }

    try {
      let imageUrl: string | undefined

      if (capturedImage) {
        setIsUploading(true)
        try {
          const response = await fetch(capturedImage)
          const blob = await response.blob()
          
          const uploadResult = await uploadToCloudinary(blob, {
            folder: getFolder(),
            tags: ['inventory', type, `${type}-${extractedText}`]
          })
          
          imageUrl = uploadResult.secure_url
          toast.success('تم رفع الصورة بنجاح')
        } catch (uploadError) {
          console.error('Upload error:', uploadError)
          toast.warning('فشل في رفع الصورة، لكن سيتم حفظ النص')
        } finally {
          setIsUploading(false)
        }
      }

      onDataExtracted(extractedText, imageUrl)
      
    } catch (error) {
      console.error('Error confirming data:', error)
      toast.error('حدث خطأ أثناء معالجة البيانات')
    }
  }, [extractedText, capturedImage, onDataExtracted, type])

  const handleRetake = () => {
    setCapturedImage(null)
    setIsProcessingOCR(false)
    setIsUploading(false)
    setIsEditing(false)
  }

  const handleManualEntry = () => {
    onDataExtracted(extractedText)
  }

  // إذا لم يتم التقاط صورة بعد، اعرض واجهة الكاميرا
  if (!capturedImage) {
    return (
      <div className="space-y-4">
        <NativeCameraCapture
          title={getTitle()}
          onCapture={handleImageCapture}
          onCancel={onCancel}
          captureMode="both"
        />
        
        {/* خيار الإدخال اليدوي */}
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Label className="arabic-text">أو أدخل النص يدوياً:</Label>
              <Input
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder={getPlaceholder()}
                className="text-center"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleManualEntry}
                  disabled={!extractedText.trim()}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 ml-1" />
                  تأكيد
                </Button>
                <Button onClick={onCancel} variant="outline" className="flex-1">
                  إلغاء
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // عرض الصورة المُلتقطة مع النص المستخرج
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 arabic-text">
          <Package className="h-5 w-5" />
          {isProcessingOCR ? 'جاري استخراج النص...' : `مراجعة ${type === 'motorFingerprint' ? 'بصمة الموتور' : 'رقم الشاسيه'}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* عرض الصورة المُلتقطة */}
        <div className="text-center">
          <img 
            src={capturedImage} 
            alt={type === 'motorFingerprint' ? 'بصمة الموتور' : 'رقم الشاسيه'} 
            className="max-w-full h-48 object-contain mx-auto rounded-lg border shadow-sm"
          />
          <Button 
            onClick={handleRetake} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            <RotateCcw className="h-4 w-4 ml-1" />
            إعادة التصوير
          </Button>
        </div>

        {/* حالة معالجة OCR */}
        {isProcessingOCR && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="arabic-text">جاري استخراج النص من الصورة...</span>
          </div>
        )}

        {/* النص المستخرج */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold arabic-text">
              {type === 'motorFingerprint' ? 'بصمة الموتور' : 'رقم الشاسيه'}
            </Label>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              size="sm"
            >
              <Edit className="h-4 w-4 ml-1" />
              {isEditing ? 'إنهاء التعديل' : 'تعديل'}
            </Button>
          </div>

          {isEditing ? (
            <Input
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder={getPlaceholder()}
              className="text-center text-lg font-mono"
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-center text-lg font-mono">
                {extractedText || 'لم يتم استخراج نص'}
              </p>
            </div>
          )}
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-3 justify-end">
          <Button onClick={onCancel} variant="outline">
            إلغاء
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isProcessingOCR || isUploading || !extractedText.trim()}
            className="min-w-[120px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 ml-1" />
                تأكيد النص
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

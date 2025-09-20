import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, Edit } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'
import { extractTextFromImage } from '@/lib/ocr'

interface SimpleCameraOCRProps {
  onTextExtracted: (text: string, imageUrl: string) => void
  onCancel: () => void
  extractionType?: 'motorFingerprint' | 'chassisNumber' | 'general'
  title?: string
}

export function SimpleCameraOCR({
  onTextExtracted,
  onCancel,
  extractionType = 'general',
  title
}: SimpleCameraOCRProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const getTitle = () => {
    if (title) return title
    switch (extractionType) {
      case 'motorFingerprint': return 'تصوير بصمة الموتور'
      case 'chassisNumber': return 'تصوير رقم الشاسيه'
      default: return 'التقاط صورة واستخراج النص'
    }
  }

  const getPlaceholder = () => {
    switch (extractionType) {
      case 'motorFingerprint': return 'مثال: HJ162FM2SB806363'
      case 'chassisNumber': return 'مثال: XL5DPCK1AASA10648'
      default: return 'النص المستخرج'
    }
  }

  const handleImageCapture = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً. يرجى اختيار صورة أصغر من 10 ميجا')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string
      if (imageDataUrl) {
        setCapturedImage(imageDataUrl)
        await processOCR(imageDataUrl)
      }
    }
    reader.onerror = () => {
      toast.error('فشل في قراءة الصورة')
    }
    reader.readAsDataURL(file)
  }, [])

  const processOCR = async (imageDataUrl: string) => {
    setIsProcessing(true)
    try {
      const ocrResult = await extractTextFromImage(imageDataUrl)
      
      if (ocrResult && ocrResult.text && ocrResult.text.trim()) {
        const cleanedText = ocrResult.text.trim().replace(/\s+/g, '').toUpperCase()
        setExtractedText(cleanedText)
        toast.success('تم استخراج النص بنجاح')
      } else {
        toast.warning('لم يتم العثور على نص واضح في الصورة. يرجى إدخال النص يدوياً')
        setIsEditing(true)
      }
    } catch (error) {
      console.error('OCR Error:', error)
      toast.error('فشل في استخراج النص من الصورة. يرجى إدخال النص يدوياً')
      setIsEditing(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = () => {
    if (!extractedText.trim()) {
      toast.error('يرجى إدخال النص')
      return
    }
    onTextExtracted(extractedText, capturedImage || '')
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setExtractedText('')
    setIsEditing(false)
    setIsProcessing(false)
  }

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  const openFileSelector = () => {
    fileInputRef.current?.click()
  }

  // إذا لم يتم التقاط صورة بعد
  if (!capturedImage) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center arabic-text">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
              <Camera className="h-16 w-16 text-gray-400" />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700 arabic-text">
                📱 على الموبايل: سيتم فتح الكاميرا مباشرة
                <br />
                💻 على الكمبيوتر: يمكنك اختيار صورة من الملفات
              </p>
            </div>
            
            <div className="space-y-2">
              <Button onClick={openCamera} className="w-full">
                <Camera className="ml-2 h-4 w-4" />
                فتح الكاميرا
              </Button>
              
              <Button onClick={openFileSelector} variant="outline" className="w-full">
                <Upload className="ml-2 h-4 w-4" />
                اختيار من الملفات
              </Button>
              
              <Button onClick={onCancel} variant="outline" className="w-full">
                <X className="ml-2 h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </div>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageCapture}
            className="hidden"
          />
        </CardContent>
      </Card>
    )
  }

  // عرض الصورة المُلتقطة مع النص المستخرج
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 arabic-text">
          <Camera className="h-5 w-5" />
          {isProcessing ? 'جاري استخراج النص...' : 'مراجعة النص المستخرج'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* عرض الصورة */}
        <div className="text-center">
          <img 
            src={capturedImage} 
            alt="الصورة المُلتقطة" 
            className="max-w-full h-48 object-contain mx-auto rounded-lg border shadow-sm"
          />
          <Button 
            onClick={handleRetake} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            إعادة التصوير
          </Button>
        </div>

        {/* حالة المعالجة */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="arabic-text">جاري استخراج النص من الصورة...</span>
          </div>
        )}

        {/* النص المستخرج */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-lg font-semibold arabic-text">النص المستخرج</label>
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
            disabled={isProcessing || !extractedText.trim()}
          >
            <Check className="h-4 w-4 ml-1" />
            تأكيد النص
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

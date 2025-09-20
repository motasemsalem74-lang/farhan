import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, Edit, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { Label } from './Label'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'
import { 
  extractEgyptianIdCardEnhanced, 
  extractMotorFingerprintEnhanced, 
  extractChassisNumberEnhanced 
} from '@/lib/enhancedOCR'

interface ImprovedCameraOCRProps {
  onTextExtracted: (text: string, imageUrl: string, extractedData?: any) => void
  onCancel: () => void
  title: string
  placeholder: string
  className?: string
  extractionType?: 'motorFingerprint' | 'chassisNumber' | 'general' | 'egyptianId'
}

export function ImprovedCameraOCR({
  onTextExtracted,
  onCancel,
  title,
  placeholder,
  className,
  extractionType = 'general'
}: ImprovedCameraOCRProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [editedText, setEditedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const getInstructions = () => {
    switch (extractionType) {
      case 'motorFingerprint':
        return 'ضع بصمة الموتور في وسط الصورة بوضوح'
      case 'chassisNumber':
        return 'ضع رقم الشاسيه في وسط الصورة بوضوح'
      case 'egyptianId':
        return 'ضع بطاقة الهوية المصرية في وسط الصورة بوضوح'
      default:
        return 'ضع النص في وسط الصورة بوضوح'
    }
  }

  const handleImageCapture = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset input value to allow selecting the same file again
    event.target.value = ''

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
    const startTime = Date.now()
    
    try {
      let ocrResult
      
      // Use specialized extraction based on type
      switch (extractionType) {
        case 'motorFingerprint':
          toast.info('🏍️ جاري استخراج بصمة الموتور...')
          ocrResult = await extractMotorFingerprintEnhanced(imageDataUrl)
          break
          
        case 'chassisNumber':
          toast.info('🚗 جاري استخراج رقم الشاسيه...')
          ocrResult = await extractChassisNumberEnhanced(imageDataUrl)
          break
          
        case 'egyptianId':
          toast.info('🆔 جاري استخراج بيانات بطاقة الهوية المصرية...')
          ocrResult = await extractEgyptianIdCardEnhanced(imageDataUrl)
          break
          
        case 'general':
        default:
          toast.info('🆔 جاري استخراج البيانات...')
          ocrResult = await extractEgyptianIdCardEnhanced(imageDataUrl)
          break
      }
      
      const processingTime = Date.now() - startTime
      console.log(`⚡ OCR completed in ${processingTime}ms`)
      
      if (ocrResult && ocrResult.success && ocrResult.text && ocrResult.text.trim()) {
        const ocrExtractedData = ocrResult.extractedData
        let cleanedText = ocrResult.text.trim()
        
        // Save extracted data for later use
        setExtractedData(ocrExtractedData)
        
        // For ID cards, use extracted structured data if available
        if ((extractionType === 'general' || extractionType === 'egyptianId') && ocrExtractedData) {
          if (ocrExtractedData.name && ocrExtractedData.nationalId) {
            cleanedText = `الاسم: ${ocrExtractedData.name}\nالرقم القومي: ${ocrExtractedData.nationalId}`
            if (ocrExtractedData.address) {
              cleanedText += `\nالعنوان: ${ocrExtractedData.address}`
            }
            if (ocrExtractedData.phone) {
              cleanedText += `\nالهاتف: ${ocrExtractedData.phone}`
            }
            if (ocrExtractedData.birthDate) {
              cleanedText += `\nتاريخ الميلاد: ${ocrExtractedData.birthDate}`
            }
            if (ocrExtractedData.gender) {
              cleanedText += `\nالنوع: ${ocrExtractedData.gender}`
            }
          }
        }
        
        setExtractedText(cleanedText)
        setEditedText(cleanedText)
        
        toast.success(`✅ تم استخراج النص بنجاح في ${processingTime}ms`)
      } else {
        console.warn('OCR failed or returned empty result:', ocrResult)
        toast.warning('⚠️ لم يتم العثور على نص واضح في الصورة. يرجى إدخال النص يدوياً')
        setIsEditing(true)
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error('❌ OCR Error after', processingTime, 'ms:', error)
      toast.error('❌ فشل في استخراج النص من الصورة. يرجى إدخال النص يدوياً')
      setIsEditing(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = async () => {
    if (!editedText.trim()) {
      toast.error('يرجى إدخال النص')
      return
    }

    // إرسال الصورة المحلية (data URL) بدون رفع إلى Cloudinary
    // سيتم الرفع لاحقاً عند إتمام البيع
    onTextExtracted(editedText.trim(), capturedImage || '', extractedData)
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setExtractedText('')
    setEditedText('')
    setIsEditing(false)
    setIsProcessing(false)
    setExtractedData(null)
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
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-center arabic-text">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
              <Camera className="h-16 w-16 text-gray-400" />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700 arabic-text">
                {getInstructions()}
              </p>
            </div>
            
            <div className="space-y-2">
              <Button type="button" onClick={openCamera} className="w-full">
                <Camera className="ml-2 h-4 w-4" />
                فتح الكاميرا
              </Button>
              
              <Button type="button" onClick={openFileSelector} variant="outline" className="w-full">
                <Upload className="ml-2 h-4 w-4" />
                اختيار من الملفات
              </Button>
              
              <Button type="button" onClick={onCancel} variant="outline" className="w-full">
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
    <Card className={className}>
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
            type="button"
            onClick={handleRetake} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            <RotateCcw className="ml-1 h-3 w-3" />
            إعادة التصوير
          </Button>
        </div>

        {/* حالة المعالجة */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="arabic-text">جاري استخراج النص من الصورة...</span>
          </div>
        )}

        {/* النص المستخرج */}
        {!isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold arabic-text">النص المستخرج</Label>
              <Button
                type="button"
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
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder={placeholder}
                className="text-center text-lg font-mono"
              />
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-center text-lg font-mono">
                  {editedText || 'لم يتم استخراج نص'}
                </p>
              </div>
            )}

            {/* النص الأصلي للمرجع */}
            {extractedText && extractedText !== editedText && (
              <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded arabic-text">
                <strong>النص الأصلي المستخرج:</strong> {extractedText}
              </div>
            )}
          </div>
        )}

        {/* أزرار التحكم */}
        {!isProcessing && (
          <div className="flex gap-3 justify-end">
            <Button type="button" onClick={onCancel} variant="outline">
              إلغاء
            </Button>
            <Button 
              type="button"
              onClick={handleConfirm} 
              disabled={!editedText.trim()}
            >
              <Check className="h-4 w-4 ml-1" />
              تأكيد النص
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

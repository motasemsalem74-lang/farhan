import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, Edit, RotateCcw } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'

interface ReliableCameraCaptureProps {
  onCapture: (imageDataUrl: string) => void
  onCancel: () => void
  title?: string
  showRetake?: boolean
  allowManualInput?: boolean
  placeholder?: string
}

export function ReliableCameraCapture({
  onCapture,
  onCancel,
  title = "التقاط صورة",
  showRetake = true,
  allowManualInput = false,
  placeholder = "أدخل النص يدوياً"
}: ReliableCameraCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [manualText, setManualText] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string
      if (imageDataUrl) {
        setCapturedImage(imageDataUrl)
        onCapture(imageDataUrl)
        toast.success('تم التقاط الصورة بنجاح')
      }
    }
    reader.onerror = () => {
      toast.error('فشل في قراءة الصورة')
    }
    reader.readAsDataURL(file)
  }, [onCapture])

  const handleRetake = () => {
    setCapturedImage(null)
    setManualText('')
    setShowManualInput(false)
  }

  const handleManualSubmit = () => {
    if (!manualText.trim()) {
      toast.error('يرجى إدخال النص')
      return
    }
    
    // Create a simple text image data URL for consistency
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 400
    canvas.height = 200
    
    if (ctx) {
      ctx.fillStyle = '#f8f9fa'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#333'
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(manualText, canvas.width / 2, canvas.height / 2)
    }
    
    const imageDataUrl = canvas.toDataURL('image/png')
    setCapturedImage(imageDataUrl)
    onCapture(imageDataUrl)
    toast.success('تم إدخال النص بنجاح')
  }

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  const openFileSelector = () => {
    fileInputRef.current?.click()
  }

  // إذا تم التقاط صورة وتريد إظهار خيار إعادة التصوير
  if (capturedImage && showRetake) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center arabic-text">معاينة الصورة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <img 
              src={capturedImage} 
              alt="الصورة المُلتقطة" 
              className="max-w-full h-48 object-contain mx-auto rounded-lg border shadow-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleRetake} variant="outline" className="flex-1">
              <RotateCcw className="h-4 w-4 ml-1" />
              إعادة التصوير
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex-1">
              <Check className="h-4 w-4 ml-1" />
              تأكيد
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // واجهة الإدخال اليدوي
  if (showManualInput && allowManualInput) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center arabic-text">إدخال يدوي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Input
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={placeholder}
              className="text-center"
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowManualInput(false)} 
                variant="outline" 
                className="flex-1"
              >
                العودة للكاميرا
              </Button>
              <Button 
                onClick={handleManualSubmit}
                disabled={!manualText.trim()}
                className="flex-1"
              >
                <Check className="h-4 w-4 ml-1" />
                تأكيد
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // الواجهة الرئيسية
  return (
    <Card className="w-full max-w-md mx-auto">
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
            
            {allowManualInput && (
              <Button 
                onClick={() => setShowManualInput(true)} 
                variant="outline" 
                className="w-full"
              >
                <Edit className="ml-2 h-4 w-4" />
                إدخال يدوي
              </Button>
            )}
            
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

// مكون مخصص للاستخدامات المختلفة
export function MotorFingerprintCapture({ onCapture, onCancel }: { onCapture: (imageDataUrl: string) => void, onCancel: () => void }) {
  return (
    <ReliableCameraCapture
      onCapture={onCapture}
      onCancel={onCancel}
      title="تصوير بصمة الموتور"
      allowManualInput={true}
      placeholder="أدخل بصمة الموتور يدوياً"
    />
  )
}

export function ChassisNumberCapture({ onCapture, onCancel }: { onCapture: (imageDataUrl: string) => void, onCancel: () => void }) {
  return (
    <ReliableCameraCapture
      onCapture={onCapture}
      onCancel={onCancel}
      title="تصوير رقم الشاسيه"
      allowManualInput={true}
      placeholder="أدخل رقم الشاسيه يدوياً"
    />
  )
}

export function IdCardCapture({ onCapture, onCancel }: { onCapture: (imageDataUrl: string) => void, onCancel: () => void }) {
  return (
    <ReliableCameraCapture
      onCapture={onCapture}
      onCancel={onCancel}
      title="تصوير بطاقة الهوية"
      showRetake={true}
    />
  )
}

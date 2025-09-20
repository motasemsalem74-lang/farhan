import { useRef, useCallback } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'

interface NativeCameraCaptureProps {
  onCapture: (imageDataUrl: string) => void
  onCancel: () => void
  title?: string
  captureMode?: 'camera' | 'file' | 'both' // camera = كاميرا فقط, file = ملف فقط, both = الاثنين
}

export function NativeCameraCapture({ 
  onCapture, 
  onCancel, 
  title = "التقاط صورة",
  captureMode = 'both'
}: NativeCameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح')
      return
    }

    // التحقق من حجم الملف (أقل من 10 ميجا)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً. يرجى اختيار صورة أصغر من 10 ميجا')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        onCapture(result)
        toast.success('تم التقاط الصورة بنجاح')
      }
    }
    reader.onerror = () => {
      toast.error('فشل في قراءة الصورة')
    }
    reader.readAsDataURL(file)
  }, [onCapture])

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  const openFileSelector = () => {
    fileInputRef.current?.click()
  }

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
          
          <div className="space-y-2">
            {(captureMode === 'camera' || captureMode === 'both') && (
              <Button onClick={openCamera} className="w-full">
                <Camera className="ml-2 h-4 w-4" />
                فتح الكاميرا
              </Button>
            )}
            
            {(captureMode === 'file' || captureMode === 'both') && (
              <Button onClick={openFileSelector} variant="outline" className="w-full">
                <Upload className="ml-2 h-4 w-4" />
                اختيار من الملفات
              </Button>
            )}
            
            <Button onClick={onCancel} variant="outline" className="w-full">
              <X className="ml-2 h-4 w-4" />
              إلغاء
            </Button>
          </div>
        </div>

        {/* Hidden camera input - يفتح الكاميرا مباشرة على الموبايل */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment" // كاميرا خلفية (أفضل للوثائق)
          onChange={handleImageCapture}
          className="hidden"
        />

        {/* Hidden file input - لاختيار من المعرض */}
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

// مكون خاص لبطاقة الهوية مع كاميرا أمامية
export function IdCardCameraCapture({ 
  onCapture, 
  onCancel, 
  title = "تصوير بطاقة الهوية"
}: Omit<NativeCameraCaptureProps, 'captureMode'>) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        onCapture(result)
        toast.success('تم تصوير بطاقة الهوية بنجاح')
      }
    }
    reader.onerror = () => {
      toast.error('فشل في قراءة الصورة')
    }
    reader.readAsDataURL(file)
  }, [onCapture])

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  const openFileSelector = () => {
    fileInputRef.current?.click()
  }

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
              تصوير بالكاميرا
            </Button>
            
            <Button onClick={openFileSelector} variant="outline" className="w-full">
              <Upload className="ml-2 h-4 w-4" />
              اختيار من المعرض
            </Button>
            
            <Button onClick={onCancel} variant="outline" className="w-full">
              <X className="ml-2 h-4 w-4" />
              إلغاء
            </Button>
          </div>
        </div>

        {/* Camera input - كاميرا خلفية للوثائق */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageCapture}
          className="hidden"
        />

        {/* File input */}
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

// مكون خاص للسيلفي مع كاميرا أمامية
export function SelfieCamera({ 
  onCapture, 
  onCancel, 
  title = "التقاط سيلفي"
}: Omit<NativeCameraCaptureProps, 'captureMode'>) {
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleImageCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
        toast.success('تم التقاط السيلفي بنجاح')
      }
    }
    reader.readAsDataURL(file)
  }, [onCapture])

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

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
          
          <div className="space-y-2">
            <Button onClick={openCamera} className="w-full">
              <Camera className="ml-2 h-4 w-4" />
              التقاط سيلفي
            </Button>
            
            <Button onClick={onCancel} variant="outline" className="w-full">
              <X className="ml-2 h-4 w-4" />
              إلغاء
            </Button>
          </div>
        </div>

        {/* Camera input - كاميرا أمامية للسيلفي */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user" // كاميرا أمامية
          onChange={handleImageCapture}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}

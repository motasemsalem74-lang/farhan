import { useState } from 'react'
import { SafeImageDisplay } from './SafeImageDisplay'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Image, RefreshCw, AlertTriangle } from 'lucide-react'
import { createCompositeImage } from '@/lib/imageComposer'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { toast } from 'sonner'

interface CompositeImageDisplayProps {
  compositeImageUrl?: string | null
  customerIdImage?: string | null
  motorFingerprintImage?: string | null
  chassisNumberImage?: string | null
  customerName?: string
  saleDate?: Date
  onCompositeImageCreated?: (imageUrl: string) => void
  showRegenerateButton?: boolean
}

export function CompositeImageDisplay({
  compositeImageUrl,
  customerIdImage,
  motorFingerprintImage,
  chassisNumberImage,
  customerName = 'عميل',
  saleDate = new Date(),
  onCompositeImageCreated,
  showRegenerateButton = false
}: CompositeImageDisplayProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate composite image
  const generateCompositeImage = async () => {
    if (!customerIdImage && !motorFingerprintImage && !chassisNumberImage) {
      toast.error('لا توجد صور متاحة لإنشاء الصورة المجمعة')
      return
    }

    setIsGenerating(true)
    
    try {
      // Create composite image
      const compositeImageDataUrl = await createCompositeImage({
        customerIdImage: customerIdImage || undefined,
        motorFingerprintImage: motorFingerprintImage || undefined,
        chassisNumberImage: chassisNumberImage || undefined,
        customerName,
        saleDate: saleDate.toISOString()
      })

      // Upload to Cloudinary
      const response = await fetch(compositeImageDataUrl)
      const blob = await response.blob()
      
      const uploadResult = await uploadToCloudinary(blob, {
        folder: 'composite-documents',
        tags: ['composite', 'document-package', `customer-${customerName}`, `date-${new Date(saleDate).toISOString().split('T')[0]}`]
      })

      const newCompositeUrl = uploadResult.secure_url
      
      if (onCompositeImageCreated) {
        onCompositeImageCreated(newCompositeUrl)
      }
      
      toast.success('تم إنشاء الصورة المجمعة بنجاح')
    } catch (error) {
      console.error('Error generating composite image:', error)
      toast.error('فشل في إنشاء الصورة المجمعة')
    } finally {
      setIsGenerating(false)
    }
  }

  // Check if we have source images
  const hasSourceImages = customerIdImage || motorFingerprintImage || chassisNumberImage
  const sourceImageCount = [customerIdImage, motorFingerprintImage, chassisNumberImage].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Composite Image */}
      {compositeImageUrl ? (
        <SafeImageDisplay
          imageUrl={compositeImageUrl}
          alt="الصورة المجمعة للوثائق"
          title="الصورة المجمعة للوثائق"
          className="w-full"
        />
      ) : (
        <Card className="border-dashed border-gray-300">
          <CardContent className="p-6 text-center">
            <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 arabic-text mb-2">لا توجد صورة مجمعة</p>
            
            {hasSourceImages ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 arabic-text">
                  يمكن إنشاء صورة مجمعة من {sourceImageCount} صور متاحة
                </p>
                <Button
                  onClick={generateCompositeImage}
                  disabled={isGenerating}
                  size="sm"
                >
                  <Image className="ml-2 h-4 w-4" />
                  {isGenerating ? 'جاري الإنشاء...' : 'إنشاء الصورة المجمعة'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center text-amber-600">
                <AlertTriangle className="h-4 w-4 ml-2" />
                <p className="text-sm arabic-text">لا توجد صور متاحة للدمج</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regenerate Button */}
      {compositeImageUrl && showRegenerateButton && hasSourceImages && (
        <div className="flex justify-center">
          <Button
            onClick={generateCompositeImage}
            disabled={isGenerating}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            {isGenerating ? 'جاري إعادة الإنشاء...' : 'إعادة إنشاء الصورة المجمعة'}
          </Button>
        </div>
      )}

      {/* Source Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SafeImageDisplay
          imageUrl={customerIdImage}
          alt="بطاقة الهوية"
          title="بطاقة الهوية"
          showControls={false}
        />
        
        <SafeImageDisplay
          imageUrl={motorFingerprintImage}
          alt="بصمة الموتور"
          title="بصمة الموتور"
          showControls={false}
        />
        
        <SafeImageDisplay
          imageUrl={chassisNumberImage}
          alt="رقم الشاسيه"
          title="رقم الشاسيه"
          showControls={false}
        />
      </div>

      {/* Image Status */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">حالة الصور</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">الصور المتاحة:</span>
              <span className="ml-2">{sourceImageCount} من 3</span>
            </div>
            <div>
              <span className="font-medium">الصورة المجمعة:</span>
              <span className={`ml-2 ${compositeImageUrl ? 'text-green-600' : 'text-gray-500'}`}>
                {compositeImageUrl ? 'متوفرة' : 'غير متوفرة'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

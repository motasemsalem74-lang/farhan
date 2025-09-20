import { useState, useCallback } from 'react'
import { IdCardCameraCapture } from './NativeCameraCapture'
import { Button } from './Button'
import { Input } from './Input'
import { Label } from './Label'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'
import { extractEgyptianIdCard } from '@/lib/trainedOCR'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Edit, Check, User, CreditCard, Loader2 } from 'lucide-react'

interface CustomerData {
  name: string
  nationalId: string
  address: string
  phone?: string
  birthDate?: string
  gender?: string
}

interface SmartIdCardCaptureProps {
  onDataExtracted: (data: CustomerData, imageUrl?: string) => void
  onCancel: () => void
  title?: string
  initialData?: Partial<CustomerData>
}

export function SmartIdCardCapture({
  onDataExtracted,
  onCancel,
  title = "تصوير بطاقة الهوية",
  initialData = {}
}: SmartIdCardCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: initialData.name || '',
    nationalId: initialData.nationalId || '',
    address: initialData.address || '',
    phone: initialData.phone || '',
    birthDate: initialData.birthDate || '',
    gender: initialData.gender || ''
  })
  const [isEditing, setIsEditing] = useState(false)

  const handleImageCapture = useCallback(async (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl)
    setIsProcessingOCR(true)
    
    try {
      // استخراج البيانات باستخدام OCR
      const extractedData = await extractEgyptianIdCard(imageDataUrl)
      
      if (extractedData.success && extractedData.data) {
        setCustomerData(prev => ({
          ...prev,
          ...extractedData.data,
          // الاحتفاظ بالبيانات الموجودة إذا لم يتم استخراج بديل
          phone: extractedData.data.phone || prev.phone,
          address: extractedData.data.address || prev.address
        }))
        toast.success(`تم استخراج بيانات البطاقة بنجاح (دقة: ${Math.round((extractedData.confidence || 0) * 100)}%)`)
      } else {
        toast.warning('لم يتم العثور على بيانات واضحة في البطاقة. يرجى إدخال البيانات يدوياً')
        setIsEditing(true)
      }
    } catch (error) {
      console.error('OCR Error:', error)
      toast.error('فشل في استخراج البيانات من البطاقة. يرجى إدخال البيانات يدوياً')
      setIsEditing(true)
    } finally {
      setIsProcessingOCR(false)
    }
  }, [])

  const handleConfirm = useCallback(async () => {
    // التحقق من البيانات المطلوبة
    if (!customerData.name.trim()) {
      toast.error('يرجى إدخال اسم العميل')
      return
    }
    
    if (!customerData.nationalId.trim()) {
      toast.error('يرجى إدخال الرقم القومي')
      return
    }

    try {
      let imageUrl: string | undefined

      // رفع الصورة إلى Cloudinary إذا كانت موجودة
      if (capturedImage) {
        setIsUploading(true)
        try {
          const response = await fetch(capturedImage)
          const blob = await response.blob()
          
          const uploadResult = await uploadToCloudinary(blob, {
            folder: 'customer-ids',
            tags: ['customer', 'id-card', `customer-${customerData.name}`, `id-${customerData.nationalId}`]
          })
          
          imageUrl = uploadResult.secure_url
          toast.success('تم رفع صورة البطاقة بنجاح')
        } catch (uploadError) {
          console.error('Upload error:', uploadError)
          toast.warning('فشل في رفع الصورة، لكن سيتم حفظ البيانات')
        } finally {
          setIsUploading(false)
        }
      }

      // إرسال البيانات للمكون الأب
      onDataExtracted(customerData, imageUrl)
      
    } catch (error) {
      console.error('Error confirming data:', error)
      toast.error('حدث خطأ أثناء معالجة البيانات')
    }
  }, [customerData, capturedImage, onDataExtracted])

  const handleRetake = () => {
    setCapturedImage(null)
    setIsProcessingOCR(false)
    setIsUploading(false)
    setIsEditing(false)
  }

  // إذا لم يتم التقاط صورة بعد، اعرض واجهة الكاميرا
  if (!capturedImage) {
    return (
      <IdCardCameraCapture
        title={title}
        onCapture={handleImageCapture}
        onCancel={onCancel}
      />
    )
  }

  // عرض الصورة المُلتقطة مع البيانات المستخرجة
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 arabic-text">
          <CreditCard className="h-5 w-5" />
          {isProcessingOCR ? 'جاري استخراج البيانات...' : 'مراجعة بيانات البطاقة'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* عرض الصورة المُلتقطة */}
        <div className="text-center">
          <img 
            src={capturedImage} 
            alt="بطاقة الهوية" 
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

        {/* حالة معالجة OCR */}
        {isProcessingOCR && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="arabic-text">جاري استخراج البيانات من البطاقة...</span>
          </div>
        )}

        {/* نموذج البيانات */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold arabic-text">بيانات العميل</h3>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              size="sm"
            >
              <Edit className="h-4 w-4 ml-1" />
              {isEditing ? 'إنهاء التعديل' : 'تعديل البيانات'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="arabic-text">الاسم الكامل</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={customerData.name}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل الاسم الكامل"
                  className="arabic-text"
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded border arabic-text">{customerData.name || 'غير محدد'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="nationalId" className="arabic-text">الرقم القومي</Label>
              {isEditing ? (
                <Input
                  id="nationalId"
                  value={customerData.nationalId}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, nationalId: e.target.value }))}
                  placeholder="أدخل الرقم القومي (14 رقم)"
                  maxLength={14}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded border">{customerData.nationalId || 'غير محدد'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address" className="arabic-text">العنوان</Label>
              {isEditing ? (
                <Input
                  id="address"
                  value={customerData.address}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="أدخل العنوان"
                  className="arabic-text"
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded border arabic-text">{customerData.address || 'غير محدد'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="arabic-text">رقم الهاتف</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={customerData.phone || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="أدخل رقم الهاتف"
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded border">{customerData.phone || 'غير محدد'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="birthDate" className="arabic-text">تاريخ الميلاد</Label>
              {isEditing ? (
                <Input
                  id="birthDate"
                  type="date"
                  value={customerData.birthDate || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, birthDate: e.target.value }))}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded border">{customerData.birthDate || 'غير محدد'}</p>
              )}
            </div>

            {customerData.gender && (
              <div className="md:col-span-2">
                <Label className="arabic-text">النوع</Label>
                <p className="p-2 bg-gray-50 rounded border arabic-text">
                  {customerData.gender === 'male' ? 'ذكر' : customerData.gender === 'female' ? 'أنثى' : customerData.gender}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-3 justify-end">
          <Button onClick={onCancel} variant="outline">
            إلغاء
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isProcessingOCR || isUploading}
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
                تأكيد البيانات
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

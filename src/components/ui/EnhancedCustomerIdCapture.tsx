import { useState } from 'react'
import { SimpleMobileCamera } from './SimpleMobileCamera'
import { Button } from './Button'
import { Input } from './Input'
import { Label } from './Label'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'
import { extractEgyptianIdCard } from '@/lib/trainedOCR'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Edit, Check, User, CreditCard } from 'lucide-react'

interface CustomerData {
  name: string
  nationalId: string
  address: string
  phone?: string
  birthDate?: string
  gender?: string
}

interface EnhancedCustomerIdCaptureProps {
  onDataExtracted: (data: CustomerData, imageUrl?: string) => void
  onCancel: () => void
  initialData?: Partial<CustomerData>
}

export function EnhancedCustomerIdCapture({ 
  onDataExtracted, 
  onCancel,
  initialData = {}
}: EnhancedCustomerIdCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: initialData.name || '',
    nationalId: initialData.nationalId || '',
    address: initialData.address || '',
    phone: initialData.phone || '',
    birthDate: initialData.birthDate || '',
    gender: initialData.gender || ''
  })
  const [isEditing, setIsEditing] = useState(false)

  // Handle image capture from camera
  const handleImageCapture = async (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl)
    setIsProcessingOCR(true)
    
    try {
      // Extract data using OCR
      const extractedData = await extractEgyptianIdCard(imageDataUrl)
      
      if (extractedData) {
        setCustomerData(prev => ({
          ...prev,
          ...extractedData.data,
          // Keep existing data if OCR didn't extract it
          phone: extractedData.data?.phone || prev.phone,
          address: extractedData.data?.address || prev.address
        }))
        toast.success('تم استخراج بيانات البطاقة بنجاح')
      } else {
        toast.warning('لم يتم العثور على بيانات واضحة في البطاقة. يرجى إدخال البيانات يدوياً')
      }
    } catch (error) {
      console.error('OCR Error:', error)
      toast.error('فشل في استخراج البيانات من البطاقة')
    } finally {
      setIsProcessingOCR(false)
    }
  }

  // Upload image to Cloudinary
  const uploadImage = async (imageDataUrl: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true)
      
      // Convert data URL to blob
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      const file = new File([blob], `customer-id-${customerData.nationalId}-${Date.now()}.jpg`, { 
        type: 'image/jpeg' 
      })
      
      const result = await uploadToCloudinary(file, {
        folder: 'customer-ids',
        tags: ['customer', 'id-card', 'agent-sale']
      })
      
      return result.secure_url
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('فشل في رفع صورة البطاقة')
      return null
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Handle field changes
  const handleFieldChange = (field: keyof CustomerData, value: string) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Validate required fields
  const validateData = (): boolean => {
    if (!customerData.name.trim()) {
      toast.error('اسم العميل مطلوب')
      return false
    }
    
    if (!customerData.nationalId.trim()) {
      toast.error('الرقم القومي مطلوب')
      return false
    }
    
    if (customerData.nationalId.length !== 14) {
      toast.error('الرقم القومي يجب أن يكون 14 رقم')
      return false
    }
    
    return true
  }

  // Confirm and submit
  const handleConfirm = async () => {
    if (!validateData()) return
    
    let imageUrl: string | undefined
    
    // Upload image if captured
    if (capturedImage) {
      imageUrl = await uploadImage(capturedImage) || undefined
    }
    
    onDataExtracted(customerData, imageUrl)
  }

  // Reset and retake
  const handleRetake = () => {
    setCapturedImage(null)
    setIsProcessingOCR(false)
  }

  // Show camera if no image captured
  if (!capturedImage) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <CreditCard className="h-5 w-5" />
            تصوير بطاقة الهوية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleMobileCamera
            title="تصوير بطاقة الهوية"
            onCapture={handleImageCapture}
            onCancel={onCancel}
            preferredFacingMode="environment"
          />
        </CardContent>
      </Card>
    )
  }

  // Show captured image and data editing
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 arabic-text">
          <User className="h-5 w-5" />
          بيانات العميل
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Captured Image */}
        <div className="flex justify-center">
          <div className="relative">
            <img 
              src={capturedImage} 
              alt="بطاقة الهوية" 
              className="w-64 h-40 object-cover rounded-lg border"
            />
            <Button
              onClick={handleRetake}
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
            >
              إعادة التقاط
            </Button>
          </div>
        </div>

        {/* OCR Processing */}
        {isProcessingOCR && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 arabic-text">جاري استخراج البيانات...</span>
          </div>
        )}

        {/* Customer Data Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم العميل *</Label>
            <Input
              id="name"
              value={customerData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="الاسم الكامل"
              readOnly={!isEditing}
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationalId">الرقم القومي *</Label>
            <Input
              id="nationalId"
              value={customerData.nationalId}
              onChange={(e) => handleFieldChange('nationalId', e.target.value)}
              placeholder="14 رقم"
              maxLength={14}
              readOnly={!isEditing}
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">العنوان</Label>
            <Input
              id="address"
              value={customerData.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="عنوان العميل"
              readOnly={!isEditing}
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              value={customerData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="رقم الهاتف"
              readOnly={!isEditing}
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>

          {customerData.birthDate && (
            <div className="space-y-2">
              <Label htmlFor="birthDate">تاريخ الميلاد</Label>
              <Input
                id="birthDate"
                value={customerData.birthDate}
                onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                placeholder="تاريخ الميلاد"
                readOnly={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
          )}

          {customerData.gender && (
            <div className="space-y-2">
              <Label htmlFor="gender">النوع</Label>
              <Input
                id="gender"
                value={customerData.gender}
                onChange={(e) => handleFieldChange('gender', e.target.value)}
                placeholder="ذكر/أنثى"
                readOnly={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
          )}
        </div>

        {/* Edit Toggle */}
        <div className="flex justify-center">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            size="sm"
          >
            {isEditing ? (
              <>
                <Check className="ml-2 h-4 w-4" />
                حفظ التعديلات
              </>
            ) : (
              <>
                <Edit className="ml-2 h-4 w-4" />
                تعديل البيانات
              </>
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            إلغاء
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1"
            disabled={isUploadingImage}
            loading={isUploadingImage}
          >
            {isUploadingImage ? 'جاري الرفع...' : 'تأكيد'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

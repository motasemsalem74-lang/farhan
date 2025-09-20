import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { 
  Package, 
  ArrowLeft,
  Save,
  Edit,
  Camera
} from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ImprovedCameraOCR } from '@/components/ui/ImprovedCameraOCR'
import { useUserData } from '@/hooks/useUserData'
import { InventoryItem } from '@/types'
import { uploadToCloudinary } from '@/lib/cloudinary'

interface EditInventoryFormData {
  model: string
  color: string
  brand: string
  manufacturingYear: number
  purchasePrice: number
  salePrice: number
  motorFingerprint: string
  chassisNumber: string
  motorFingerprintImageUrl: string
  chassisNumberImageUrl: string
}

type OCRStep = 'none' | 'motor-fingerprint' | 'chassis-number'

export function EditInventoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // OCR state
  const [ocrStep, setOcrStep] = useState<OCRStep>('none')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<EditInventoryFormData>({
    defaultValues: {
      model: '',
      color: '',
      brand: '',
      manufacturingYear: new Date().getFullYear(),
      purchasePrice: 0,
      salePrice: 0,
      motorFingerprint: '',
      chassisNumber: '',
      motorFingerprintImageUrl: '',
      chassisNumberImageUrl: ''
    }
  })

  useEffect(() => {
    if (userData && id) {
      loadItemDetails()
    }
  }, [id, userData])

  const loadItemDetails = async () => {
    if (!id) return

    try {
      setLoading(true)
      
      const docRef = doc(db, 'inventory_items', id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        toast.error('المنتج غير موجود')
        navigate('/inventory')
        return
      }
      
      const itemData = { id: docSnap.id, ...docSnap.data() } as InventoryItem
      setItem(itemData)
      
      // تعبئة النموذج بالبيانات الحالية
      console.log('📋 تعبئة النموذج بالبيانات:', itemData)
      setValue('model', itemData.model || '')
      setValue('color', itemData.color || '')
      setValue('brand', itemData.brand || '')
      setValue('manufacturingYear', itemData.manufacturingYear || new Date().getFullYear())
      setValue('purchasePrice', itemData.purchasePrice || 0)
      setValue('salePrice', itemData.salePrice || 0)
      setValue('motorFingerprint', itemData.motorFingerprint || '')
      setValue('chassisNumber', itemData.chassisNumber || '')
      setValue('motorFingerprintImageUrl', itemData.motorFingerprintImageUrl || '')
      setValue('chassisNumberImageUrl', itemData.chassisNumberImageUrl || '')
      console.log('✅ تم تعبئة النموذج بنجاح')
      
    } catch (error) {
      console.error('Error loading item details:', error)
      toast.error('فشل في تحميل بيانات المنتج')
    } finally {
      setLoading(false)
    }
  }

  // Handle OCR results
  const handleMotorFingerprintOCR = async (text: string, imageUrl: string) => {
    try {
      setUploadingImage(true)
      console.log('📸 رفع صورة بصمة الموتور إلى Cloudinary...')
      
      // Check if it's a data URL (from camera) and needs upload
      if (imageUrl.startsWith('data:')) {
        const imageBlob = dataURLtoBlob(imageUrl)
        const uploadResponse = await uploadToCloudinary(imageBlob, {
          folder: 'inventory-updates',
          tags: [`inventory-${id}`, 'motor-fingerprint']
        })
        imageUrl = uploadResponse.secure_url
        console.log('✅ تم رفع صورة بصمة الموتور:', imageUrl)
      }
      
      setValue('motorFingerprint', text)
      setValue('motorFingerprintImageUrl', imageUrl)
      setOcrStep('none')
      toast.success('تم استخراج بصمة الموتور بنجاح')
    } catch (error) {
      console.error('❌ خطأ في رفع صورة بصمة الموتور:', error)
      toast.error('فشل في رفع صورة بصمة الموتور')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleChassisNumberOCR = async (text: string, imageUrl: string) => {
    try {
      setUploadingImage(true)
      console.log('📸 رفع صورة رقم الشاسيه إلى Cloudinary...')
      
      // Check if it's a data URL (from camera) and needs upload
      if (imageUrl.startsWith('data:')) {
        const imageBlob = dataURLtoBlob(imageUrl)
        const uploadResponse = await uploadToCloudinary(imageBlob, {
          folder: 'inventory-updates',
          tags: [`inventory-${id}`, 'chassis-number']
        })
        imageUrl = uploadResponse.secure_url
        console.log('✅ تم رفع صورة رقم الشاسيه:', imageUrl)
      }
      
      setValue('chassisNumber', text)
      setValue('chassisNumberImageUrl', imageUrl)
      setOcrStep('none')
      toast.success('تم استخراج رقم الشاسيه بنجاح')
    } catch (error) {
      console.error('❌ خطأ في رفع صورة رقم الشاسيه:', error)
      toast.error('فشل في رفع صورة رقم الشاسيه')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCancelOCR = () => {
    setOcrStep('none')
  }

  // Convert data URL to Blob for upload
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  const onSubmit = async (data: EditInventoryFormData) => {
    console.log('🔄 بدء عملية الحفظ...', { id, userData: !!userData, data })
    
    if (!id || !userData) {
      console.error('❌ معرف المنتج أو بيانات المستخدم مفقودة', { id, userData: !!userData })
      toast.error('خطأ: معرف المنتج أو بيانات المستخدم مفقودة')
      return
    }

    try {
      setSaving(true)
      console.log('📝 تحديث البيانات في Firebase...')
      
      // تحديث البيانات في Firebase
      const docRef = doc(db, 'inventory_items', id)
      const updateData = {
        model: data.model,
        color: data.color,
        brand: data.brand,
        manufacturingYear: data.manufacturingYear,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        motorFingerprint: data.motorFingerprint,
        chassisNumber: data.chassisNumber,
        motorFingerprintImageUrl: data.motorFingerprintImageUrl,
        chassisNumberImageUrl: data.chassisNumberImageUrl,
        updatedAt: new Date(),
        updatedBy: userData.id
      }
      
      console.log('📊 البيانات المرسلة:', updateData)
      await updateDoc(docRef, updateData)
      console.log('✅ تم تحديث البيانات بنجاح في Firebase')

      toast.success('تم تحديث بيانات المنتج بنجاح')
      setIsEditing(false)
      
      // إعادة تحميل البيانات المحدثة
      console.log('🔄 إعادة تحميل البيانات...')
      await loadItemDetails()
      console.log('✅ تم إعادة تحميل البيانات بنجاح')
      
    } catch (error) {
      console.error('❌ خطأ في تحديث بيانات المنتج:', error)
      toast.error(`فشل في تحديث بيانات المنتج: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    } finally {
      setSaving(false)
      console.log('🏁 انتهت عملية الحفظ')
    }
  }

  if (!userData) {
    return <LoadingSpinner />
  }

  if (loading) {
    return <LoadingSpinner text="جاري تحميل بيانات المنتج..." />
  }

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">المنتج غير موجود</h3>
          <p className="text-gray-500 mb-4">لم يتم العثور على المنتج المطلوب</p>
          <Button onClick={() => navigate('/inventory')}>
            العودة للمخزون
          </Button>
        </div>
      </div>
    )
  }

  // Show OCR interface
  if (ocrStep !== 'none') {
    return (
      <div className="max-w-4xl mx-auto py-6">
        {uploadingImage && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <LoadingSpinner />
              <span className="text-blue-700 arabic-text">جاري رفع الصورة إلى السيرفر...</span>
            </div>
          </div>
        )}
        <ImprovedCameraOCR
          title={ocrStep === 'motor-fingerprint' ? 'تصوير بصمة الموتور' : 'تصوير رقم الشاسيه'}
          placeholder={ocrStep === 'motor-fingerprint' ? 'بصمة الموتور' : 'رقم الشاسيه'}
          extractionType={ocrStep === 'motor-fingerprint' ? 'motorFingerprint' : 'chassisNumber'}
          onTextExtracted={ocrStep === 'motor-fingerprint' ? handleMotorFingerprintOCR : handleChassisNumberOCR}
          onCancel={handleCancelOCR}
          className="w-full max-w-2xl mx-auto"
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/inventory')}
            >
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للمخزون
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل البيانات
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="arabic-text">
            {isEditing ? 'تعديل بيانات المنتج' : 'تفاصيل المنتج'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="motorFingerprint" className="arabic-text">بصمة الموتور</Label>
                  <Input
                    id="motorFingerprint"
                    {...register('motorFingerprint', { required: 'بصمة الموتور مطلوبة' })}
                    className="arabic-text"
                  />
                  {errors.motorFingerprint && (
                    <p className="text-red-500 text-sm mt-1">{errors.motorFingerprint.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="chassisNumber" className="arabic-text">رقم الشاسيه</Label>
                  <Input
                    id="chassisNumber"
                    {...register('chassisNumber', { required: 'رقم الشاسيه مطلوب' })}
                    className="arabic-text"
                  />
                  {errors.chassisNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.chassisNumber.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="model" className="arabic-text">الموديل</Label>
                  <Input
                    id="model"
                    {...register('model', { required: 'الموديل مطلوب' })}
                    className="arabic-text"
                  />
                  {errors.model && (
                    <p className="text-red-500 text-sm mt-1">{errors.model.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="color" className="arabic-text">اللون</Label>
                  <Input
                    id="color"
                    {...register('color', { required: 'اللون مطلوب' })}
                    className="arabic-text"
                  />
                  {errors.color && (
                    <p className="text-red-500 text-sm mt-1">{errors.color.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="brand" className="arabic-text">الماركة</Label>
                  <Input
                    id="brand"
                    {...register('brand', { required: 'الماركة مطلوبة' })}
                    className="arabic-text"
                  />
                  {errors.brand && (
                    <p className="text-red-500 text-sm mt-1">{errors.brand.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="manufacturingYear" className="arabic-text">سنة الصنع</Label>
                  <Input
                    id="manufacturingYear"
                    type="number"
                    {...register('manufacturingYear', { 
                      required: 'سنة الصنع مطلوبة',
                      valueAsNumber: true,
                      min: { value: 1900, message: 'سنة الصنع يجب أن تكون أكبر من 1900' },
                      max: { value: new Date().getFullYear() + 1, message: 'سنة الصنع غير صالحة' }
                    })}
                    className="arabic-text"
                  />
                  {errors.manufacturingYear && (
                    <p className="text-red-500 text-sm mt-1">{errors.manufacturingYear.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="purchasePrice" className="arabic-text">سعر الشراء (جنيه)</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    {...register('purchasePrice', { 
                      required: 'سعر الشراء مطلوب',
                      valueAsNumber: true,
                      min: { value: 0, message: 'سعر الشراء يجب أن يكون أكبر من صفر' }
                    })}
                    className="arabic-text"
                  />
                  {errors.purchasePrice && (
                    <p className="text-red-500 text-sm mt-1">{errors.purchasePrice.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="salePrice" className="arabic-text">سعر البيع (جنيه)</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    {...register('salePrice', { 
                      required: 'سعر البيع مطلوب',
                      valueAsNumber: true,
                      min: { value: 0, message: 'سعر البيع يجب أن يكون أكبر من صفر' }
                    })}
                    className="arabic-text"
                  />
                  {errors.salePrice && (
                    <p className="text-red-500 text-sm mt-1">{errors.salePrice.message}</p>
                  )}
                </div>
              </div>
              
              {/* Images Section - Edit Mode */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-4 arabic-text">تعديل صور المنتج</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Motor Fingerprint Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                      صورة بصمة الموتور
                    </label>
                    <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Button
                        type="button"
                        onClick={() => setOcrStep('motor-fingerprint')}
                        disabled={uploadingImage}
                        className="flex flex-col items-center gap-2"
                      >
                        {uploadingImage ? (
                          <>
                            <LoadingSpinner />
                            <span className="arabic-text">جاري الرفع...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="h-8 w-8" />
                            <span className="arabic-text">تصوير بصمة الموتور</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Chassis Number Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                      صورة رقم الشاسيه
                    </label>
                    <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Button
                        type="button"
                        onClick={() => setOcrStep('chassis-number')}
                        disabled={uploadingImage}
                        className="flex flex-col items-center gap-2"
                      >
                        {uploadingImage ? (
                          <>
                            <LoadingSpinner />
                            <span className="arabic-text">جاري الرفع...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="h-8 w-8" />
                            <span className="arabic-text">تصوير رقم الشاسيه</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <LoadingSpinner />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-text">بصمة الموتور</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{item.motorFingerprint}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-text">رقم الشاسيه</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{item.chassisNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-text">الموديل</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{item.model}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-text">اللون</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{item.color}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-text">الماركة</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{item.brand}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-text">سنة الصنع</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{item.manufacturingYear}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-text">سعر الشراء</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{item.purchasePrice} جنيه</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 arabic-text">سعر البيع</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{item.salePrice} جنيه</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EditInventoryPage

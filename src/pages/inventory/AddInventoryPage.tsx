import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  Camera, 
  Save, 
  ArrowLeft
} from 'lucide-react'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { uploadToCloudinary, validateImageFile, compressImage } from '@/lib/cloudinary'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ImprovedCameraOCR } from '@/components/ui/ImprovedCameraOCR'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { CreateInventoryItemForm, Warehouse } from '@/types'
import { vehicleTypeTranslations, generateTransactionId } from '@/lib/utils'

interface FormData extends CreateInventoryItemForm {
  motorFingerprintImage?: string
  chassisNumberImage?: string
  salePrice: number
}

type OCRStep = 'none' | 'motor-fingerprint' | 'chassis-number'

export function AddInventoryPage() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [ocrStep, setOcrStep] = useState<OCRStep>('none')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<FormData>({
    defaultValues: {
      type: 'motorcycle',
      manufacturingYear: new Date().getFullYear(),
      countryOfOrigin: 'اليابان'
    }
  })

  const motorFingerprintImage = watch('motorFingerprintImage')
  const chassisNumberImage = watch('chassisNumberImage')
  const motorFingerprint = watch('motorFingerprint')
  const chassisNumber = watch('chassisNumber')

  useEffect(() => {
    loadWarehouses()
  }, [])

  const loadWarehouses = async () => {
    try {
      // Load only main warehouse for new inventory items
      const warehousesQuery = query(
        collection(db, 'warehouses'),
        where('isActive', '==', true),
        where('type', '==', 'main') // Only main warehouse
      )
      
      const warehousesSnapshot = await getDocs(warehousesQuery)
      let warehousesData = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Warehouse[]
      
      // If no main warehouse found, look for any warehouse with "رئيسي" in name
      if (warehousesData.length === 0) {
        const allWarehousesQuery = query(
          collection(db, 'warehouses'),
          where('isActive', '==', true)
        )
        const allWarehousesSnapshot = await getDocs(allWarehousesQuery)
        const allWarehouses = allWarehousesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Warehouse[]
        
        // Find main warehouse by name
        warehousesData = allWarehouses.filter(w => 
          w.name?.includes('رئيسي') || w.name?.includes('الرئيسي') || w.name?.includes('main')
        )
        
        // If still no main warehouse, use first available
        if (warehousesData.length === 0 && allWarehouses.length > 0) {
          warehousesData = [allWarehouses[0]]
          console.warn('No main warehouse found, using first available warehouse')
        }
      }
      
      setWarehouses(warehousesData)
      
      // Set default warehouse (should be main warehouse)
      if (warehousesData.length > 0) {
        setValue('warehouseId', warehousesData[0].id)
        console.log('✅ New items will be added to main warehouse:', warehousesData[0].name)
      }
    } catch (error) {
      console.error('Error loading warehouses:', error)
      toast.error('خطأ في تحميل المخازن')
    }
  }

  const uploadImageToCloudinary = async (imageDataUrl: string, filename: string): Promise<string> => {
    const maxRetries = 3
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/${maxRetries} for:`, filename)
        
        // Validate image data URL
        if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
          throw new Error('Invalid image data URL format')
        }
        
        // Check if it's not an empty data URL
        if (imageDataUrl === 'data:,' || imageDataUrl.length < 100) {
          throw new Error('Image data URL is empty or too small')
        }
        
        console.log(`Image data URL length: ${imageDataUrl.length} characters`)
        
        // Convert data URL to blob
        const response = await fetch(imageDataUrl)
        if (!response.ok) {
          throw new Error('Failed to process image data')
        }
        
        const blob = await response.blob()
        if (blob.size === 0) {
          throw new Error('Empty image file after conversion')
        }
        
        console.log(`Image blob size: ${blob.size} bytes for ${filename}`)
        
        // Create a File object for validation
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
        
        // Validate the file
        const validation = validateImageFile(file)
        if (!validation.valid) {
          throw new Error(validation.error)
        }
        
        // Compress the image
        const compressedBlob = await compressImage(file, 0.8)
        
        // Upload to Cloudinary
        console.log('Starting upload to Cloudinary for:', filename)
        const result = await uploadToCloudinary(compressedBlob, {
          folder: 'inventory',
          tags: ['inventory', 'motor-parts']
          // Note: quality and format removed for unsigned upload
        })
        
        console.log('Upload completed for:', filename)
        return result.secure_url
        
      } catch (error) {
        console.error(`Upload attempt ${attempt} failed for ${filename}:`, error)
        
        if (attempt === maxRetries) {
          const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
          throw new Error(`فشل في رفع الصورة ${filename}: ${errorMessage}`)
        }
        
        // Wait before retry using requestAnimationFrame to avoid setTimeout violations
        await new Promise(resolve => {
          let count = 0
          const maxCount = attempt * 100 // roughly 2 seconds per attempt
          const frame = () => {
            count++
            if (count >= maxCount) {
              resolve(undefined)
            } else {
              requestAnimationFrame(frame)
            }
          }
          requestAnimationFrame(frame)
        })
      }
    }
    
    throw new Error(`فشل في رفع الصورة ${filename}`)
  }

  const onSubmit = async (data: FormData) => {
    if (!userData) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    try {
      setLoading(true)
      console.log('Starting inventory item submission...')
      console.log('Form data:', data)

      // Validate required basic data
      if (!data.brand || !data.model || !data.purchasePrice) {
        toast.error('يرجى إدخال الماركة والموديل وسعر الشراء')
        setLoading(false)
        return
      }

      // Upload images to Firebase Storage (optional)
      let motorFingerprintImageUrl = ''
      let chassisNumberImageUrl = ''
      
      // Only upload images if they exist
      if (data.motorFingerprintImage || data.chassisNumberImage) {
        try {
          if (data.motorFingerprintImage) {
            toast.loading('جاري رفع صورة بصمة الموتور إلى Cloudinary...')
            motorFingerprintImageUrl = await uploadImageToCloudinary(
              data.motorFingerprintImage,
              `motor-${data.motorFingerprint || 'unknown'}-${Date.now()}.jpg`
            )
            console.log('Motor fingerprint image uploaded successfully to Cloudinary')
          }
          
          if (data.chassisNumberImage) {
            toast.loading('جاري رفع صورة رقم الشاسيه إلى Cloudinary...')
            chassisNumberImageUrl = await uploadImageToCloudinary(
              data.chassisNumberImage,
              `chassis-${data.chassisNumber || 'unknown'}-${Date.now()}.jpg`
            )
            console.log('Chassis number image uploaded successfully to Cloudinary')
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError)
          toast.dismiss()
          
          // Show specific error message
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'خطأ غير معروف في رفع الصور'
          toast.error(`فشل في رفع الصور: ${errorMessage}`)
          
          // Ask user if they want to continue without images
          const continueWithoutImages = window.confirm(
            'فشل في رفع الصور. هل تريد المتابعة وحفظ الصنف بدون صور؟'
          )
          
          if (!continueWithoutImages) {
            toast.error('تم إلغاء عملية الحفظ')
            setLoading(false)
            return
          }
          
          toast.warning('سيتم حفظ الصنف بدون صور')
        }
      }
      
      toast.loading('جاري حفظ بيانات الصنف في قاعدة البيانات...')

      // Generate transaction ID for entry
      const entryTransactionId = generateTransactionId('warehouse_entry')

      // Create inventory item
      const inventoryItem = {
        motorFingerprint: data.motorFingerprint || '',
        chassisNumber: data.chassisNumber || '',
        motorFingerprintImageUrl,
        chassisNumberImageUrl,
        type: data.type,
        model: data.model,
        color: data.color,
        brand: data.brand,
        countryOfOrigin: data.countryOfOrigin,
        manufacturingYear: data.manufacturingYear,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        currentWarehouseId: data.warehouseId,
        status: 'available',
        entryTransactionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userData.id
      }

      // Add to Firestore with timeout and retry
      let docRef
      try {
        console.log('Adding inventory item to Firestore...')
        
        // Add timeout to Firestore operation
        const firestorePromise = addDoc(collection(db, 'inventory_items'), inventoryItem)
        const firestoreTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firestore timeout')), 15000)
        )
        
        docRef = await Promise.race([firestorePromise, firestoreTimeout]) as any
        console.log('Inventory item added with ID:', docRef.id)
      } catch (firestoreError) {
        console.error('Firestore add failed:', firestoreError)
        toast.dismiss()
        
        if (firestoreError instanceof Error && firestoreError.message.includes('timeout')) {
          toast.error('انتهت مهلة الحفظ. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى')
        } else {
          toast.error('فشل في حفظ بيانات الصنف. يرجى المحاولة مرة أخرى')
        }
        return
      }

      // Create entry transaction
      try {
        const entryTransaction = {
          id: entryTransactionId,
          type: 'warehouse_entry',
          date: serverTimestamp(),
          userId: userData.id,
          referenceNumber: entryTransactionId,
          items: [{
            inventoryItemId: docRef.id,
            motorFingerprint: data.motorFingerprint || '',
            chassisNumber: data.chassisNumber || ''
          }],
          totalAmount: data.purchasePrice,
          toWarehouseId: data.warehouseId,
          details: {
            notes: `إضافة صنف جديد: ${data.brand} ${data.model}`
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }

        console.log('Adding transaction to Firestore...')
        await addDoc(collection(db, 'transactions'), entryTransaction)
        console.log('Transaction added successfully')
      } catch (transactionError) {
        console.error('Transaction add failed:', transactionError)
        // Don't return here, the item was already saved
        toast.warning('تم حفظ الصنط ولكن فشل في حفظ معاملة الدخول')
      }

      toast.dismiss() // Clear any loading toasts
      toast.success('تم إضافة الصنف بنجاح! سيتم توجيهك إلى صفحة المخزون...')
      
      // Small delay before navigation to show success message
      setTimeout(() => {
        navigate('/inventory')
      }, 1500)
    } catch (error) {
      console.error('Error adding inventory item:', error)
      toast.dismiss() // Clear any loading toasts
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          toast.error('لا تملك صلاحية لإضافة الأصناف')
        } else if (error.message.includes('network')) {
          toast.error('مشكلة في الاتصال. يرجى التأكد من الإنترنت')
        } else {
          toast.error(`خطأ في حفظ الصنف: ${error.message}`)
        }
      } else {
        toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMotorFingerprintOCR = (text: string, imageUrl: string) => {
    setValue('motorFingerprint', text)
    setValue('motorFingerprintImage', imageUrl)
    setOcrStep('none')
    toast.success('تم استخراج بصمة الموتور بنجاح')
  }

  const handleChassisNumberOCR = (text: string, imageUrl: string) => {
    setValue('chassisNumber', text)
    setValue('chassisNumberImage', imageUrl)
    setOcrStep('none')
    toast.success('تم استخراج رقم الشاسيه بنجاح')
  }

  const handleCancelOCR = () => {
    setOcrStep('none')
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  // Show OCR interface
  if (ocrStep !== 'none') {
    return (
      <div className="max-w-4xl mx-auto py-6">
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
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">إضافة صنف جديد</h1>
          <p className="text-gray-600 arabic-text">إضافة صنف جديد إلى المخزون</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للمخزون
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* OCR Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              التعرف الضوئي على الأرقام
            </CardTitle>
            <CardDescription>
              استخدم الكاميرا لالتقاط صور بصمة الموتور ورقم الشاسيه واستخراج الأرقام تلقائياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Motor Fingerprint OCR */}
              <div className="space-y-3">
                <Label className="text-base font-medium">بصمة الموتور</Label>
                
                {motorFingerprintImage ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img 
                        src={motorFingerprintImage} 
                        alt="Motor Fingerprint" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <div className="absolute top-2 right-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setOcrStep('motor-fingerprint')}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={motorFingerprint || ''}
                      onChange={(e) => setValue('motorFingerprint', e.target.value)}
                      placeholder="بصمة الموتور"
                      className="font-mono"
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 flex-col gap-2"
                    onClick={() => setOcrStep('motor-fingerprint')}
                  >
                    <Camera className="h-8 w-8" />
                    <span>تصوير بصمة الموتور</span>
                  </Button>
                )}
              </div>

              {/* Chassis Number OCR */}
              <div className="space-y-3">
                <Label className="text-base font-medium">رقم الشاسيه</Label>
                
                {chassisNumberImage ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img 
                        src={chassisNumberImage} 
                        alt="Chassis Number" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <div className="absolute top-2 right-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setOcrStep('chassis-number')}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={chassisNumber || ''}
                      onChange={(e) => setValue('chassisNumber', e.target.value)}
                      placeholder="رقم الشاسيه"
                      className="font-mono"
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 flex-col gap-2"
                    onClick={() => setOcrStep('chassis-number')}
                  >
                    <Camera className="h-8 w-8" />
                    <span>تصوير رقم الشاسيه</span>
                  </Button>
                )}
              </div>
            </div>

            {(!motorFingerprint || !chassisNumber) && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 arabic-text">
                  <strong>مطلوب:</strong> يجب تصوير بصمة الموتور ورقم الشاسيه قبل المتابعة
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Item Details */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الصنف</CardTitle>
            <CardDescription>معلومات أساسية عن الصنف</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vehicle Type */}
              <div className="space-y-2">
                <Label htmlFor="type" required>نوع المركبة</Label>
                <select
                  {...register('type', { required: 'نوع المركبة مطلوب' })}
                  className="form-input w-full input-rtl arabic-text"
                  id="type"
                >
                  {Object.entries(vehicleTypeTranslations).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
                {errors.type && (
                  <p className="text-sm text-destructive arabic-text">{errors.type.message}</p>
                )}
              </div>

              {/* Brand */}
              <div className="space-y-2">
                <Label htmlFor="brand" required>الماركة</Label>
                <Input
                  id="brand"
                  {...register('brand', { required: 'الماركة مطلوبة' })}
                  placeholder="مثال: هوندا، ياماها"
                  error={errors.brand?.message}
                />
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model" required>الموديل</Label>
                <Input
                  id="model"
                  {...register('model', { required: 'الموديل مطلوب' })}
                  placeholder="مثال: CBR 150، YBR 125"
                  error={errors.model?.message}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label htmlFor="color" required>اللون</Label>
                <Input
                  id="color"
                  {...register('color', { required: 'اللون مطلوب' })}
                  placeholder="مثال: أحمر، أزرق"
                  error={errors.color?.message}
                />
              </div>

              {/* Country of Origin */}
              <div className="space-y-2">
                <Label htmlFor="countryOfOrigin" required>بلد المنشأ</Label>
                <Input
                  id="countryOfOrigin"
                  {...register('countryOfOrigin', { required: 'بلد المنشأ مطلوب' })}
                  placeholder="مثال: اليابان، الصين"
                  error={errors.countryOfOrigin?.message}
                />
              </div>

              {/* Manufacturing Year */}
              <div className="space-y-2">
                <Label htmlFor="manufacturingYear" required>سنة الصنع</Label>
                <Input
                  id="manufacturingYear"
                  type="number"
                  min="2000"
                  max="2030"
                  {...register('manufacturingYear', { 
                    required: 'سنة الصنع مطلوبة',
                    min: { value: 2000, message: 'سنة الصنع يجب أن تكون 2000 أو أحدث' },
                    max: { value: 2030, message: 'سنة الصنع لا يمكن أن تكون في المستقبل' }
                  })}
                  error={errors.manufacturingYear?.message}
                />
              </div>

              {/* Purchase Price */}
              <div className="space-y-2">
                <Label htmlFor="purchasePrice" required>سعر الشراء (جنيه)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('purchasePrice', { 
                    required: 'سعر الشراء مطلوب',
                    min: { value: 0, message: 'السعر يجب أن يكون أكبر من صفر' }
                  })}
                  placeholder="مثال: 15000.00"
                  error={errors.purchasePrice?.message}
                />
              </div>

              {/* Sale Price */}
              <div className="space-y-2">
                <Label htmlFor="salePrice" required>سعر البيع المقترح (جنيه)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('salePrice', { 
                    required: 'سعر البيع مطلوب',
                    min: { value: 0, message: 'السعر يجب أن يكون أكبر من صفر' }
                  })}
                  placeholder="مثال: 18000.00"
                  error={errors.salePrice?.message}
                />
              </div>

              {/* Warehouse - Read only, always main warehouse */}
              <div className="space-y-2">
                <Label htmlFor="warehouseId">المخزن</Label>
                <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 arabic-text">
                  <span className="text-gray-700">
                    {warehouses.length > 0 ? warehouses[0].name : 'المخزن الرئيسي'}
                  </span>
                  <span className="text-sm text-gray-500 mr-2">(تلقائي)</span>
                </div>
                <p className="text-xs text-gray-500 arabic-text">
                  📦 جميع المنتجات الجديدة تُضاف للمخزن الرئيسي تلقائياً
                </p>
                {/* Hidden input to maintain form functionality */}
                <input
                  type="hidden"
                  {...register('warehouseId', { required: 'المخزن مطلوب' })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/inventory')}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={isSubmitting}
          >
            <Save className="ml-2 h-4 w-4" />
            إضافة الصنف
          </Button>
        </div>
      </form>
    </div>
  )
}
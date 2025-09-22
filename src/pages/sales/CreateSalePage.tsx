import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { 
  Camera, 
  Save, 
  ArrowLeft,
  User,
  CreditCard,
  Package,
  Plus,
  Trash2
} from 'lucide-react'
import { addDoc, collection, serverTimestamp, doc, updateDoc, query, where, getDocs, setDoc } from 'firebase/firestore'
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
import { useAuth } from '@/hooks/useAuth'
import { CreateSaleForm, InventoryItem, Warehouse } from '@/types'
import { generateTransactionId, getErrorMessage, formatCurrency } from '@/lib/utils'
import { createCompositeImage } from '@/lib/imageComposer'
import { extractEgyptianIdCardEnhanced } from '@/lib/enhancedOCR'

interface FormData extends CreateSaleForm {
  idCardImage?: string
}

interface ExtractedCustomerData {
  name?: string
  nationalId?: string
  address?: string
  phone?: string
  birthDate?: string
  gender?: string
}

type OCRStep = 'none' | 'id-card'

interface SaleItem {
  inventoryItem: InventoryItem
  salePrice: number
  commissionPercentage?: number
}

export default function CreateSalePage() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const { userData: authUserData } = useAuth()
  
  // التحقق من الصلاحيات - الوكلاء لا يمكنهم الوصول لهذه الشاشة
  useEffect(() => {
    if (authUserData && authUserData.role === 'agent') {
      toast.error('الوكلاء لا يمكنهم الوصول لشاشة البيع العامة. يرجى استخدام شاشة البيع الخاصة بالوكيل')
      navigate('/agents')
      return
    }
  }, [authUserData, navigate])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all')
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [ocrStep, setOcrStep] = useState<OCRStep>('none')
  const [extractedCustomerData, setExtractedCustomerData] = useState<ExtractedCustomerData>({})

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    defaultValues: {
      customer: {
        name: '',
        phone: '',
        address: '',
        nationalId: ''
      }
    }
  })

  const idCardImage = watch('idCardImage')
  const customerData = watch('customer')

  useEffect(() => {
    if (userData) {
      loadWarehouses()
      loadAvailableItems()
    }
  }, [userData])

  // Reload items when warehouse selection changes
  useEffect(() => {
    if (userData && warehouses.length > 0) {
      loadAvailableItems()
    }
  }, [selectedWarehouseId])

  const loadWarehouses = async () => {
    try {
      console.log('🔄 [WAREHOUSE FIX] Loading warehouses from Firebase...')
      console.log('🔄 [WAREHOUSE FIX] Current timestamp:', new Date().toISOString())
      
      // First, try to load ALL warehouses to see what's in the database
      console.log('🔍 Loading ALL warehouses first for debugging...')
      const allWarehousesQuery = query(collection(db, 'warehouses'))
      const allWarehousesSnapshot = await getDocs(allWarehousesQuery)
      const allWarehouses = allWarehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log('📋 ALL warehouses in database:', {
        total: allWarehouses.length,
        warehouses: allWarehouses.map(w => ({ 
          id: w.id, 
          name: w.name, 
          type: w.type, 
          isActive: w.isActive 
        }))
      })
      
      // Now load only active warehouses
      const warehousesQuery = query(
        collection(db, 'warehouses'),
        where('isActive', '==', true)
      )
      
      const warehousesSnapshot = await getDocs(warehousesQuery)
      const warehousesData = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Warehouse[]
      
      console.log('📦 Raw warehouses data:', warehousesData)
      
      // If no warehouses found, show detailed error
      if (warehousesData.length === 0) {
        console.warn('⚠️ No warehouses found in database!')
        console.log('🔍 Query details:', {
          collection: 'warehouses',
          filter: 'isActive == true',
          snapshotSize: warehousesSnapshot.size,
          snapshotEmpty: warehousesSnapshot.empty
        })
        toast.error('لم يتم العثور على مخازن نشطة في قاعدة البيانات')
        return
      }
      
      setWarehouses(warehousesData)
      
      console.log('✅ Loaded warehouses successfully:', {
        total: warehousesData.length,
        nonAgent: warehousesData.filter(w => w.type !== 'agent').length,
        warehouses: warehousesData.map(w => ({ id: w.id, name: w.name, type: w.type, isActive: w.isActive }))
      })
      
      const nonAgentWarehouses = warehousesData.filter(w => w.type !== 'agent')
      if (nonAgentWarehouses.length === 0) {
        console.warn('⚠️ No non-agent warehouses found!')
        toast.error('لا توجد مخازن متاحة للبيع (جميع المخازن خاصة بالوكلاء)')
      }
      
    } catch (error) {
      console.error('❌ Error loading warehouses:', error)
      console.log('🔍 Error details:', {
        message: (error as Error).message,
        code: (error as any).code,
        stack: (error as Error).stack
      })
      toast.error('خطأ في تحميل المخازن: ' + (error as Error).message)
    }
  }

  const loadAvailableItems = async () => {
    try {
      // Load items from main warehouse and showroom only
      const inventoryQuery = query(
        collection(db, 'inventory_items'),
        where('status', '==', 'available')
      )
      
      const inventorySnapshot = await getDocs(inventoryQuery)
      const allItems = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[]
      
      // Get warehouses to filter by type
      const warehousesQuery = query(
        collection(db, 'warehouses'),
        where('isActive', '==', true)
      )
      const warehousesSnapshot = await getDocs(warehousesQuery)
      const warehousesData = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Warehouse[]
      
      // Filter items from main warehouse and showroom only
      const mainAndShowroomWarehouses = warehousesData.filter(w => {
        const name = w.name?.toLowerCase() || ''
        const type = w.type?.toLowerCase() || ''
        
        return (
          // Check by type
          type === 'main' || 
          type === 'showroom' ||
          type === 'institution' ||
          // Check by name (Arabic)
          name.includes('رئيسي') || 
          name.includes('معرض') ||
          name.includes('الرئيسي') ||
          name.includes('المعرض') ||
          name.includes('مؤسسة') ||
          name.includes('المؤسسة') ||
          // Check by name (English)
          name.includes('main') ||
          name.includes('showroom') ||
          name.includes('institution') ||
          name.includes('company')
        )
      })
      
      const warehouseIds = mainAndShowroomWarehouses.map(w => w.id)
      
      let filteredItems = allItems.filter(item => 
        warehouseIds.includes(item.currentWarehouseId)
      )
      
      // If no items found in main/showroom warehouses, don't show agent items
      if (filteredItems.length === 0 && allItems.length > 0) {
        console.warn('⚠️ No items found in main/showroom warehouses')
        
        // Only show items from non-agent warehouses as fallback
        const nonAgentWarehouses = warehousesData.filter(w => w.type !== 'agent')
        const nonAgentWarehouseIds = nonAgentWarehouses.map(w => w.id)
        
        const nonAgentItems = allItems.filter(item => 
          nonAgentWarehouseIds.includes(item.currentWarehouseId)
        )
        
        if (nonAgentItems.length > 0) {
          filteredItems = nonAgentItems
          console.log('🔄 Using fallback - showing items from non-agent warehouses only:', nonAgentItems.length)
        } else {
          console.log('❌ No items available in any non-agent warehouse')
        }
      }
      
      console.log('✅ Loaded items from main/showroom warehouses:', {
        totalItems: allItems.length,
        mainShowroomWarehouses: mainAndShowroomWarehouses.length,
        filteredItems: filteredItems.length,
        warehouseIds
      })
      
      setAvailableItems(filteredItems)
      setWarehouses(warehousesData)
      
    } catch (error) {
      console.error('Error loading available items:', error)
      toast.error('خطأ في تحميل المنتجات المتاحة')
    }
  }

  const uploadImageToCloudinary = async (imageDataUrl: string, filename: string): Promise<string> => {
    try {
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      
      // Create a File object for validation
      const file = new File([blob], filename, { type: blob.type })
      
      // Validate the file
      const validation = validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      
      // Compress the image
      const compressedBlob = await compressImage(file, 0.8)
      
      // Upload to Cloudinary
      const result = await uploadToCloudinary(compressedBlob, {
        folder: 'customers',
        tags: ['customer', 'id-card']
      })
      
      return result.secure_url
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error)
      throw error
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!userData) return

    try {
      setLoading(true)

      // Validate required data
      if (selectedItems.length === 0) {
        toast.error('يرجى إضافة أصناف للفاتورة')
        return
      }

      if (!data.idCardImage) {
        toast.error('يرجى تصوير بطاقة الهوية')
        return
      }

      // Upload ID card image to Cloudinary
      const idCardImageUrl = await uploadImageToCloudinary(
        data.idCardImage,
        `id-card-${data.customer.nationalId}-${Date.now()}.jpg`
      )

      // Generate transaction ID
      const saleTransactionId = generateTransactionId('sale_to_customer')

      // Calculate totals - ALL PROFITS GO TO INSTITUTION (no agent commissions)
      const totalAmount = selectedItems.reduce((sum, item) => sum + item.salePrice, 0)
      const totalProfit = selectedItems.reduce((sum, item) => sum + (item.salePrice - item.inventoryItem.purchasePrice), 0)

      // Customer details are now included directly in document tracking

      // Create composite image for documents
      let combinedImageUrl = ''
      try {
        // Check if we have the required images
        const hasCustomerImage = idCardImageUrl && idCardImageUrl.length > 0
        const hasMotorImage = selectedItems[0]?.inventoryItem.motorFingerprintImageUrl
        const hasChassisImage = selectedItems[0]?.inventoryItem.chassisNumberImageUrl
        
        console.log('🖼️ [COMPOSITE] Checking available images:', {
          hasCustomerImage,
          hasMotorImage: !!hasMotorImage,
          hasChassisImage: !!hasChassisImage
        })
        
        if (hasCustomerImage && (hasMotorImage || hasChassisImage)) {
          const compositeImageDataUrl = await createCompositeImage({
            customerIdImage: idCardImageUrl,
            motorFingerprintImage: selectedItems[0]?.inventoryItem.motorFingerprintImageUrl,
            chassisNumberImage: selectedItems[0]?.inventoryItem.chassisNumberImageUrl,
            customerName: data.customer.name,
            motorFingerprint: selectedItems[0]?.inventoryItem.motorFingerprint,
            chassisNumber: selectedItems[0]?.inventoryItem.chassisNumber,
            saleDate: new Date().toLocaleDateString('ar-EG')
          })
          
          // Upload composite image to Cloudinary
          const compositeBlob = await fetch(compositeImageDataUrl).then(r => r.blob())
          const compositeResult = await uploadToCloudinary(compositeBlob, {
            folder: 'composite-documents',
            tags: ['composite', 'sale-document', 'customer-' + data.customer.nationalId]
          })
          combinedImageUrl = compositeResult.secure_url
          console.log('✅ Composite image created and uploaded:', combinedImageUrl)
        } else {
          console.log('⚠️ Insufficient images for composite creation - skipping')
        }
      } catch (error) {
        console.error('⚠️ Error creating composite image:', error)
        // Continue without composite image
      }

      // Create document tracking entry (enhanced with composite image)
      const documentTrackingData = {
        saleTransactionId,
        customerName: data.customer.name,
        customerNationalId: data.customer.nationalId,
        customerPhone: data.customer.phone,
        customerAddress: data.customer.address,
        motorFingerprint: selectedItems[0]?.inventoryItem.motorFingerprint,
        chassisNumber: selectedItems[0]?.inventoryItem.chassisNumber,
        motorBrand: selectedItems[0]?.inventoryItem.brand,
        motorModel: selectedItems[0]?.inventoryItem.model,
        salePrice: selectedItems[0]?.salePrice,
        purchasePrice: selectedItems[0]?.inventoryItem.purchasePrice,
        profit: selectedItems[0] ? selectedItems[0].salePrice - selectedItems[0].inventoryItem.purchasePrice : 0,
        commissionRate: 0, // No commission for institution sales
        idCardImageUrl,
        motorFingerprintImageUrl: selectedItems[0]?.inventoryItem.motorFingerprintImageUrl,
        chassisNumberImageUrl: selectedItems[0]?.inventoryItem.chassisNumberImageUrl,
        combinedImageUrl, // Add composite image URL
        status: 'pending_submission',
        stages: [{
          status: 'pending_submission',
          date: new Date(),
          updatedBy: userData.id,
          notes: 'تم إنشاء سجل تتبع الوثائق'
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userData.id
      }

      // Add document tracking entry to Firestore
      await addDoc(collection(db, 'document_tracking'), documentTrackingData)

      // Update inventory items status to 'sold'
      for (const item of selectedItems) {
        await updateDoc(doc(db, 'inventory_items', item.inventoryItem.id), {
          status: 'sold',
          updatedAt: serverTimestamp()
        })
      }

      // Create institution transaction record (all profits go to institution)
      const institutionTransaction = {
        transactionId: saleTransactionId,
        type: 'institution_sale',
        amount: totalProfit, // All profit goes to institution
        description: `بيع ${selectedItems.length} موتوسيكل للعميل ${data.customer.name} - جميع الأرباح للمؤسسة`,
        customerId: data.customer.nationalId,
        customerName: data.customer.name,
        items: selectedItems.map(item => ({
          inventoryItemId: item.inventoryItem.id,
          motorFingerprint: item.inventoryItem.motorFingerprint,
          chassisNumber: item.inventoryItem.chassisNumber,
          salePrice: item.salePrice,
          purchasePrice: item.inventoryItem.purchasePrice,
          profit: item.salePrice - item.inventoryItem.purchasePrice
        })),
        totalAmount,
        totalProfit,
        createdAt: serverTimestamp(),
        createdBy: userData.id
      }
      
      await addDoc(collection(db, 'institution_transactions'), institutionTransaction)

      toast.success('تم إنشاء فاتورة البيع بنجاح')
      navigate('/sales')
    } catch (error) {
      console.error('Error creating sale:', error)
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleIdCardOCR = async (text: string, imageUrl: string) => {
    setValue('idCardImage', imageUrl)
    
    try {
      // Use enhanced OCR for Egyptian ID cards
      const ocrResult = await extractEgyptianIdCardEnhanced(imageUrl)
      
      if (ocrResult.success && ocrResult.extractedData) {
        const data = ocrResult.extractedData
        
        // Set form values with extracted data
        if (data.name) {
          setValue('customer.name', data.name)
          setExtractedCustomerData(prev => ({ ...prev, name: data.name }))
        }
        if (data.nationalId) {
          setValue('customer.nationalId', data.nationalId)
          setExtractedCustomerData(prev => ({ ...prev, nationalId: data.nationalId }))
        }
        if (data.address) {
          setValue('customer.address', data.address)
          setExtractedCustomerData(prev => ({ ...prev, address: data.address }))
        }
        if (data.phone) {
          setValue('customer.phone', data.phone)
          setExtractedCustomerData(prev => ({ ...prev, phone: data.phone }))
        }
        
        // Store additional extracted data
        if (data.birthDate) {
          setExtractedCustomerData(prev => ({ ...prev, birthDate: data.birthDate }))
        }
        if (data.gender) {
          setExtractedCustomerData(prev => ({ ...prev, gender: data.gender }))
        }
        
        toast.success('تم استخراج بيانات بطاقة الهوية بنجاح')
      } else {
        // Fallback to basic text extraction
        const lines = text.split('\n').map(line => line.trim()).filter(line => line)
        
        for (const line of lines) {
          const nationalIdMatch = line.match(/\d{14}/)
          if (nationalIdMatch) {
            setValue('customer.nationalId', nationalIdMatch[0])
          }
          
          const arabicNameMatch = line.match(/[\u0600-\u06FF\s]{3,}/)
          if (arabicNameMatch && !customerData.name) {
            setValue('customer.name', arabicNameMatch[0].trim())
          }
        }
        
        toast.success('تم استخراج بيانات بطاقة الهوية')
      }
    } catch (error) {
      console.error('OCR extraction error:', error)
      toast.error('خطأ في استخراج البيانات، يرجى إدخالها يدوياً')
    }
    
    setOcrStep('none')
  }


  const handleCancelOCR = () => {
    setOcrStep('none')
  }

  const addItemToSale = (item: InventoryItem) => {
    if (selectedItems.find(si => si.inventoryItem.id === item.id)) {
      toast.error('هذا الصنف مضاف بالفعل')
      return
    }

    const newSaleItem: SaleItem = {
      inventoryItem: item,
      salePrice: item.purchasePrice * 1.2, // Default 20% markup
      commissionPercentage: 0 // NO COMMISSIONS - All profits go to institution
    }

    setSelectedItems(prev => [...prev, newSaleItem])
    setItemSearchQuery('')
  }

  const removeItemFromSale = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.inventoryItem.id !== itemId))
  }

  const updateItemPrice = (itemId: string, price: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.inventoryItem.id === itemId 
        ? { ...item, salePrice: price }
        : item
    ))
  }

  // Commission functionality removed - all profits go to institution

  // Filter items by selected warehouse and search query
  const filteredItems = availableItems.filter(item => {
    // Filter by warehouse first
    if (selectedWarehouseId !== 'all' && item.currentWarehouseId !== selectedWarehouseId) {
      return false
    }
    
    // Then filter by search query
    if (!itemSearchQuery) return false
    const query = itemSearchQuery.toLowerCase()
    return (
      item.motorFingerprint.toLowerCase().includes(query) ||
      item.chassisNumber.toLowerCase().includes(query) ||
      item.brand.toLowerCase().includes(query) ||
      item.model.toLowerCase().includes(query) ||
      item.color.toLowerCase().includes(query)
    )
  })

  const totalSaleAmount = selectedItems.reduce((sum, item) => sum + item.salePrice, 0)
  const totalProfit = selectedItems.reduce((sum, item) => sum + (item.salePrice - item.inventoryItem.purchasePrice), 0)

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  // Show OCR interface
  if (ocrStep !== 'none') {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <ImprovedCameraOCR
          title="تصوير بطاقة الهوية"
          placeholder="بيانات بطاقة الهوية"
          extractionType="general"
          onTextExtracted={handleIdCardOCR}
          onCancel={handleCancelOCR}
          className="w-full max-w-2xl mx-auto"
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">إنشاء فاتورة بيع</h1>
          <p className="text-gray-600 arabic-text">إنشاء فاتورة بيع جديدة للعميل</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/sales')}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للمبيعات
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="space-y-6">
            {/* ID Card OCR Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  بيانات العميل وبطاقة الهوية
                </CardTitle>
                <CardDescription>
                  استخدم الكاميرا لتصوير بطاقة الهوية واستخراج البيانات تلقائياً
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  {/* ID Card Single Image */}
                  <div className="space-y-3 w-full max-w-md">
                    <Label className="text-base font-medium text-center block">صورة بطاقة الهوية</Label>
                    
                    {idCardImage ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <img 
                            src={idCardImage} 
                            alt="ID Card" 
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <div className="absolute top-2 right-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setOcrStep('id-card')}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-32 flex-col gap-2"
                        onClick={() => setOcrStep('id-card')}
                      >
                        <Camera className="h-8 w-8" />
                        <span>تصوير بطاقة الهوية</span>
                        <span className="text-xs text-gray-500">سيتم استخراج البيانات تلقائياً</span>
                      </Button>
                    )}
                  </div>
                </div>

                {!idCardImage && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 arabic-text">
                      <strong>مطلوب:</strong> يجب تصوير بطاقة الهوية قبل المتابعة
                    </p>
                  </div>
                )}

                {/* Display extracted customer data */}
                {(extractedCustomerData.birthDate || extractedCustomerData.gender) && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-2 arabic-text">بيانات إضافية من بطاقة الهوية:</h4>
                    <div className="space-y-1 text-sm text-green-800">
                      {extractedCustomerData.birthDate && (
                        <p>تاريخ الميلاد: {extractedCustomerData.birthDate}</p>
                      )}
                      {extractedCustomerData.gender && (
                        <p>النوع: {extractedCustomerData.gender}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  بيانات العميل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="customerName" required>اسم العميل</Label>
                    <Input
                      id="customerName"
                      {...register('customer.name', { required: 'اسم العميل مطلوب' })}
                      placeholder="الاسم الكامل"
                      error={errors.customer?.name?.message}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerPhone" required>رقم الهاتف</Label>
                    <Input
                      id="customerPhone"
                      {...register('customer.phone', { required: 'رقم الهاتف مطلوب' })}
                      placeholder="01xxxxxxxxx"
                      error={errors.customer?.phone?.message}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerAddress" required>العنوان</Label>
                    <Input
                      id="customerAddress"
                      {...register('customer.address', { required: 'العنوان مطلوب' })}
                      placeholder="العنوان الكامل"
                      error={errors.customer?.address?.message}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerNationalId" required>الرقم القومي</Label>
                    <Input
                      id="customerNationalId"
                      {...register('customer.nationalId', { 
                        required: 'الرقم القومي مطلوب',
                        pattern: {
                          value: /^\d{14}$/,
                          message: 'الرقم القومي يجب أن يكون 14 رقم'
                        }
                      })}
                      placeholder="14 رقم"
                      error={errors.customer?.nationalId?.message}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Selection */}
          <div className="space-y-6">
            {/* Item Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  إضافة أصناف للفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Warehouse Selection */}
                <div className="space-y-2">
                  <Label>اختيار المخزن</Label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full form-input input-rtl arabic-text"
                  >
                    <option value="all">جميع المخازن المتاحة</option>
                    {warehouses.length === 0 ? (
                      <option disabled>جاري تحميل المخازن...</option>
                    ) : (
                      warehouses
                        .filter(w => w.type !== 'agent') // Hide agent warehouses
                        .map(warehouse => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} ({warehouse.type === 'main' ? 'رئيسي' : warehouse.type === 'showroom' ? 'معرض' : warehouse.type})
                          </option>
                        ))
                    )}
                  </select>
                  
                  {/* Debug info for warehouses */}
                  {warehouses.length > 0 && (
                    <p className="text-xs text-gray-500">
                      تم تحميل {warehouses.filter(w => w.type !== 'agent').length} مخزن متاح
                    </p>
                  )}
                  
                  {warehouses.length === 0 && (
                    <p className="text-xs text-red-500">
                      لم يتم العثور على مخازن. يرجى التأكد من وجود مخازن نشطة في النظام.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>البحث عن صنف</Label>
                  <Input
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="ابحث بالبصمة أو الشاسيه أو الماركة..."
                  />
                </div>

                {/* Search Results */}
                {itemSearchQuery && (
                  <div className="space-y-2">
                    {filteredItems.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {filteredItems.map(item => (
                          <div key={item.id} className="p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium arabic-text">{item.brand} {item.model}</p>
                                <p className="text-sm text-gray-600">{item.motorFingerprint}</p>
                                <p className="text-sm text-gray-500">{formatCurrency(item.purchasePrice)}</p>
                                <p className="text-xs text-gray-400">
                                  المخزن: {warehouses.find(w => w.id === item.currentWarehouseId)?.name || 'غير محدد'}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => addItemToSale(item)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                        <p className="text-gray-600 arabic-text">لا توجد نتائج للبحث</p>
                        <p className="text-sm text-gray-500 arabic-text mt-1">
                          جرب البحث ببصمة الموتور أو رقم الشاسيه أو الماركة
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Available Items Info */}
                {!itemSearchQuery && availableItems.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 arabic-text">
                      <strong>متاح:</strong> {availableItems.length} منتج في المخازن المحددة
                    </p>
                    <p className="text-xs text-blue-600 arabic-text mt-1">
                      اختر المخزن وابدأ بالبحث لإظهار المنتجات المتاحة
                    </p>
                  </div>
                )}
                
                {availableItems.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 arabic-text">
                      <strong>تنبيه:</strong> لا توجد منتجات متاحة في المخازن المحددة
                    </p>
                    <p className="text-xs text-yellow-600 arabic-text mt-1">
                      يرجى التأكد من وجود منتجات في المخازن المناسبة
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Items */}
            <Card>
              <CardHeader>
                <CardTitle>الأصناف المحددة</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 arabic-text">
                    لم يتم إضافة أصناف بعد
                  </p>
                ) : (
                  <div className="space-y-4">
                    {selectedItems.map(item => (
                      <div key={item.inventoryItem.id} className="p-4 border rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium arabic-text">
                                {item.inventoryItem.brand} {item.inventoryItem.model}
                              </p>
                              <p className="text-sm text-gray-600">
                                {item.inventoryItem.motorFingerprint}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemFromSale(item.inventoryItem.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label>سعر البيع</Label>
                              <Input
                                type="number"
                                value={item.salePrice}
                                onChange={(e) => updateItemPrice(item.inventoryItem.id, Number(e.target.value))}
                                min={item.inventoryItem.purchasePrice}
                              />
                            </div>
                          </div>
                          
                          {/* Institution profit notice */}
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 arabic-text">
                              🏢 <strong>ملاحظة:</strong> جميع أرباح هذه الفاتورة تذهب للمؤسسة (بدون عمولات وكلاء)
                            </p>
                          </div>

                          <div className="text-sm text-gray-600">
                            <p>سعر الشراء: {formatCurrency(item.inventoryItem.purchasePrice)}</p>
                            <p>الربح: {formatCurrency(item.salePrice - item.inventoryItem.purchasePrice)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Totals */}
                    <div className="border-t pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="arabic-text">إجمالي المبلغ:</span>
                          <span className="font-bold">{formatCurrency(totalSaleAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="arabic-text">إجمالي الربح (للمؤسسة):</span>
                          <span className="font-bold text-green-600">{formatCurrency(totalProfit)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/sales')}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={selectedItems.length === 0 || !idCardImage || isSubmitting}
          >
            <Save className="ml-2 h-4 w-4" />
            إنشاء الفاتورة
          </Button>
        </div>
      </form>
    </div>
  )
}

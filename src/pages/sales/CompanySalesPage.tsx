import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { 
  ShoppingCart, 
  Package, 
  Search, 
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Save,
  Camera,
  CreditCard
} from 'lucide-react'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { canOnlySellFromCompany, canViewProfits } from '@/lib/permissions'
import { SimpleNotificationSystem } from '@/lib/simpleNotifications'
import { generateTransactionId } from '@/lib/utils'
import { InventoryItem, Warehouse } from '@/types'
import { ImprovedCameraOCR } from '@/components/ui/ImprovedCameraOCR'
import { uploadToCloudinary, validateImageFile, compressImage } from '@/lib/cloudinary'
import { createCompositeImage } from '@/lib/imageComposer'
import { extractEgyptianIdCardEnhanced, parseEgyptianIdCardEnhanced } from '@/lib/enhancedOCR'

interface SaleFormData {
  customerName: string
  customerPhone: string
  customerNationalId: string
  customerAddress: string
  notes: string
  idCardImage?: string
  salePrice?: number
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

export function CompanySalesPage() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ocrStep, setOcrStep] = useState<OCRStep>('none')
  const [extractedData, setExtractedData] = useState<ExtractedCustomerData>({})
  const [customSalePrice, setCustomSalePrice] = useState<number | null>(null)

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<SaleFormData>()
  
  const idCardImage = watch('idCardImage')
  
  // Debug logging للصورة
  useEffect(() => {
    console.log('🖼️ ID Card Image state changed:', idCardImage ? 'Image present' : 'No image')
    if (idCardImage) {
      console.log('📷 Image URL:', idCardImage.substring(0, 100) + '...')
    }
  }, [idCardImage])

  // التحقق من الصلاحيات
  const canSeeProfit = canViewProfits(userData?.role || '')
  const isCompanyEmployee = canOnlySellFromCompany(userData?.role || '')

  useEffect(() => {
    if (userData) {
      loadWarehouses()
    }
  }, [userData])

  useEffect(() => {
    if (selectedWarehouse) {
      loadInventoryItems()
    }
  }, [selectedWarehouse])

  const loadWarehouses = async () => {
    try {
      setLoading(true)
      
      // تحميل جميع المخازن النشطة
      const warehousesQuery = query(
        collection(db, 'warehouses'),
        where('isActive', '==', true)
      )
      
      const warehousesSnapshot = await getDocs(warehousesQuery)
      const allWarehouses = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Warehouse[]
      
      // فلترة المخازن لإظهار المخازن الرئيسية والمعارض فقط
      const companyWarehouses = allWarehouses.filter(warehouse => {
        const name = warehouse.name?.toLowerCase() || ''
        const type = warehouse.type?.toLowerCase() || ''
        
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
          name.includes('company') ||
          // Not agent warehouses
          !warehouse.agentId
        )
      })
      
      setWarehouses(companyWarehouses)
      
      console.log('✅ Loaded company warehouses:', {
        total: allWarehouses.length,
        company: companyWarehouses.length,
        warehouses: companyWarehouses.map(w => ({ id: w.id, name: w.name, type: w.type }))
      })
      
      // اختيار أول مخزن تلقائياً
      if (companyWarehouses.length > 0) {
        setSelectedWarehouse(companyWarehouses[0].id)
      } else {
        console.warn('⚠️ No company warehouses found')
        toast.warning('لا توجد مخازن متاحة للشركة')
      }
      
    } catch (error) {
      console.error('Error loading warehouses:', error)
      toast.error('فشل في تحميل المخازن')
    } finally {
      setLoading(false)
    }
  }

  const loadInventoryItems = async () => {
    if (!selectedWarehouse) return

    try {
      const itemsQuery = query(
        collection(db, 'inventory_items'),
        where('currentWarehouseId', '==', selectedWarehouse),
        where('status', '==', 'available')
      )
      
      const itemsSnapshot = await getDocs(itemsQuery)
      const itemsData = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[]
      
      setInventoryItems(itemsData)
    } catch (error) {
      console.error('Error loading inventory items:', error)
      toast.error('فشل في تحميل المخزون')
    }
  }

  // دوال تصوير بطاقة الهوية
  const uploadImageToCloudinary = async (imageDataUrl: string, filename: string): Promise<string> => {
    try {
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      
      const file = new File([blob], filename, { type: blob.type })
      const validation = validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      
      const compressedBlob = await compressImage(file, 0.8)
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

  const handleIdCardOCR = async (imageUrl: string, text: string) => {
    try {
      console.log('📷 Processing ID card image URL:', imageUrl.substring(0, 50) + '...')
      console.log('📋 Processing extracted text:', text)
      
      // التأكد من أن imageUrl هو رابط صورة وليس نص
      if (!imageUrl.startsWith('data:image/') && !imageUrl.startsWith('http')) {
        console.error('❌ Invalid image URL format:', imageUrl)
        toast.error('خطأ في تنسيق الصورة')
        return
      }
      
      // حفظ الصورة في الـ form state (التأكد من حفظ الرابط وليس النص)
      setValue('idCardImage', imageUrl)
      
      // التأكد من أن الصورة محفوظة
      console.log('✅ ID card image URL saved to form state')
      
      // استخدام الدالة المحسنة لاستخراج البيانات
      const ocrResult = await extractEgyptianIdCardEnhanced(imageUrl)
      
      if (ocrResult.success && ocrResult.extractedData) {
        const data = ocrResult.extractedData
        
        if (data.name) {
          setValue('customerName', data.name)
          setExtractedData(prev => ({ ...prev, name: data.name }))
        }
        if (data.nationalId) {
          setValue('customerNationalId', data.nationalId)
          setExtractedData(prev => ({ ...prev, nationalId: data.nationalId }))
        }
        if (data.address) {
          setValue('customerAddress', data.address)
          setExtractedData(prev => ({ ...prev, address: data.address }))
        }
        if (data.phone) {
          setValue('customerPhone', data.phone)
          setExtractedData(prev => ({ ...prev, phone: data.phone }))
        }
        if (data.birthDate) {
          setExtractedData(prev => ({ ...prev, birthDate: data.birthDate }))
        }
        if (data.gender) {
          setExtractedData(prev => ({ ...prev, gender: data.gender }))
        }
        
        toast.success('تم استخراج بيانات بطاقة الهوية بنجاح')
      } else {
        // Fallback parsing للنص المستخرج مباشرة
        const parsedData = parseEgyptianIdCardEnhanced(text)
        
        if (parsedData.nationalId) {
          setValue('customerNationalId', parsedData.nationalId)
          setExtractedData(prev => ({ ...prev, nationalId: parsedData.nationalId }))
        }
        if (parsedData.name) {
          setValue('customerName', parsedData.name)
          setExtractedData(prev => ({ ...prev, name: parsedData.name }))
        }
        if (parsedData.address) {
          setValue('customerAddress', parsedData.address)
          setExtractedData(prev => ({ ...prev, address: parsedData.address }))
        }
        if (parsedData.phone) {
          setValue('customerPhone', parsedData.phone)
          setExtractedData(prev => ({ ...prev, phone: parsedData.phone }))
        }
        if (parsedData.birthDate) {
          setExtractedData(prev => ({ ...prev, birthDate: parsedData.birthDate }))
        }
        if (parsedData.gender) {
          setExtractedData(prev => ({ ...prev, gender: parsedData.gender }))
        }
        
        toast.info('تم تصوير بطاقة الهوية - يرجى مراجعة البيانات')
      }
    } catch (error) {
      console.error('Error processing ID card:', error)
      toast.error('خطأ في معالجة بطاقة الهوية')
    } finally {
      setOcrStep('none')
    }
  }

  const handleCancelOCR = () => {
    setOcrStep('none')
  }

  const filteredItems = inventoryItems.filter(item =>
    item.motorFingerprint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.chassisNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const onSubmit = async (data: SaleFormData) => {
    if (!selectedItem || !userData) {
      toast.error('يرجى اختيار منتج أولاً')
      return
    }

    if (!data.idCardImage) {
      toast.error('يرجى تصوير بطاقة الهوية')
      return
    }

    try {
      setSubmitting(true)
      
      // رفع صورة بطاقة الهوية
      const idCardImageUrl = await uploadImageToCloudinary(
        data.idCardImage,
        `id-card-${data.customerNationalId}-${Date.now()}.jpg`
      )
      
      const transactionId = generateTransactionId('company_sale')
      const invoiceNumber = `COMP-${Date.now()}`

      // إنشاء معاملة البيع
      const saleTransaction = {
        transactionId,
        invoiceNumber,
        type: 'company_sale',
        warehouseId: selectedWarehouse,
        customerId: data.customerNationalId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        items: [{
          inventoryItemId: selectedItem.id,
          motorFingerprint: selectedItem.motorFingerprint,
          chassisNumber: selectedItem.chassisNumber,
          brand: selectedItem.brand,
          model: selectedItem.model,
          salePrice: data.salePrice || selectedItem.salePrice || selectedItem.purchasePrice,
          originalPrice: selectedItem.salePrice || selectedItem.purchasePrice,
          // لا نحفظ سعر الشراء أو الربح للموظف
        }],
        totalAmount: data.salePrice || selectedItem.salePrice || selectedItem.purchasePrice,
        notes: data.notes,
        createdAt: serverTimestamp(),
        createdBy: userData.id,
        soldBy: userData.id
      }

      const saleRef = await addDoc(collection(db, 'company_sales'), saleTransaction)

      // تحديث حالة المنتج إلى مباع
      await updateDoc(doc(db, 'inventory_items', selectedItem.id), {
        status: 'sold',
        soldAt: serverTimestamp(),
        soldBy: userData.id,
        saleTransactionId: saleRef.id,
        salePrice: data.salePrice || selectedItem.salePrice || selectedItem.purchasePrice
      })

      // إرسال إشعار للمدير
      try {
        await SimpleNotificationSystem.sendNotification({
          recipientId: 'eJVyY9OwowchKEMlFLrk4MRiiaq2', // المدير الرئيسي
          title: '🏢 بيعة شركة جديدة',
          message: `موظف البيع ${userData.displayName || userData.email} أنشأ بيعة للعميل ${data.customerName} بقيمة ${(data.salePrice || selectedItem.salePrice || selectedItem.purchasePrice).toLocaleString()} جنيه`,
          type: 'company_sale',
          actionUrl: `/sales/company/${saleRef.id}`,
          senderId: userData.id,
          senderName: userData.displayName || userData.email || 'موظف بيع',
          priority: 'medium',
          data: {
            saleId: saleRef.id,
            customerName: data.customerName,
            totalAmount: data.salePrice || selectedItem.salePrice || selectedItem.purchasePrice,
            itemBrand: selectedItem.brand,
            itemModel: selectedItem.model
          }
        })
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
      }

      // إنشاء تتبع الوثائق
      try {
        let combinedImageUrl = ''
        
        // إنشاء صورة مركبة للوثائق
        try {
          const { createCompositeImage } = await import('@/lib/imageComposer')
          combinedImageUrl = await createCompositeImage({
            customerIdImage: idCardImageUrl,
            motorFingerprintImage: selectedItem.motorFingerprintImageUrl || undefined,
            chassisNumberImage: selectedItem.chassisNumberImageUrl || undefined,
            customerName: data.customerName,
            saleDate: new Date().toISOString()
          })
          
          // رفع الصورة المجمعة إلى Cloudinary
          if (combinedImageUrl) {
            const response = await fetch(combinedImageUrl)
            const blob = await response.blob()
            combinedImageUrl = await uploadImageToCloudinary(
              combinedImageUrl,
              `composite-${data.customerNationalId}-${Date.now()}.jpg`
            )
          }
        } catch (compositeError) {
          console.error('Error generating composite image:', compositeError)
          // استخدام صورة بطاقة الهوية كـ fallback
          combinedImageUrl = idCardImageUrl
        }

        const documentTracking = {
          transactionId,
          transactionType: 'company_sale',
          customerId: data.customerNationalId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress,
          inventoryItemId: selectedItem.id,
          motorFingerprint: selectedItem.motorFingerprint,
          chassisNumber: selectedItem.chassisNumber,
          brand: selectedItem.brand,
          model: selectedItem.model,
          salePrice: data.salePrice || selectedItem.salePrice || selectedItem.purchasePrice,
          warehouseId: selectedWarehouse,
          status: 'pending_documents',
          documents: {
            idCard: {
              imageUrl: idCardImageUrl,
              status: 'uploaded',
              uploadedAt: serverTimestamp(),
              uploadedBy: userData.id
            },
            motorFingerprint: {
              imageUrl: selectedItem.motorFingerprintImageUrl || null,
              status: selectedItem.motorFingerprintImageUrl ? 'uploaded' : 'missing',
              uploadedAt: selectedItem.motorFingerprintImageUrl ? serverTimestamp() : null,
              uploadedBy: selectedItem.motorFingerprintImageUrl ? userData.id : null
            },
            chassisNumber: {
              imageUrl: selectedItem.chassisNumberImageUrl || null,
              status: selectedItem.chassisNumberImageUrl ? 'uploaded' : 'missing',
              uploadedAt: selectedItem.chassisNumberImageUrl ? serverTimestamp() : null,
              uploadedBy: selectedItem.chassisNumberImageUrl ? userData.id : null
            }
          },
          combinedImageUrl,
          extractedCustomerData: extractedData,
          createdAt: serverTimestamp(),
          createdBy: userData.id,
          lastUpdated: serverTimestamp(),
          notes: data.notes || ''
        }

        await addDoc(collection(db, 'document_tracking'), documentTracking)
        console.log('✅ Document tracking created successfully')
      } catch (docError) {
        console.error('Error creating document tracking:', docError)
        // لا نوقف العملية إذا فشل إنشاء تتبع الوثائق
      }

      toast.success('تم إنشاء فاتورة البيع وتتبع الوثائق بنجاح!')
      reset()
      setSelectedItem(null)
      setSelectedWarehouse('')
      setSearchTerm('')
      setExtractedData({})
      setCustomSalePrice(null)
      
    } catch (error) {
      console.error('Error creating sale:', error)
      toast.error('فشل في إنشاء فاتورة البيع')
    } finally {
      setSubmitting(false)
    }
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  // عرض واجهة الكاميرا
  if (ocrStep !== 'none') {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <ImprovedCameraOCR
          title="تصوير بطاقة الهوية"
          placeholder="بيانات بطاقة الهوية"
          extractionType="general"
          onTextExtracted={(text: string, imageUrl: string, extractedData?: any) => handleIdCardOCR(imageUrl, text)}
          onCancel={handleCancelOCR}
          className="w-full max-w-2xl mx-auto"
        />
      </div>
    )
  }

  if (!isCompanyEmployee && userData.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              غير مصرح بالوصول
            </h2>
            <p className="text-gray-600">
              هذه الصفحة مخصصة لموظفي البيع فقط
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">مبيعات الشركة</h1>
          <p className="text-gray-600 arabic-text">إنشاء فواتير بيع من مخازن الشركة</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للوحة التحكم
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* اختيار المخزن والمنتج */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              اختيار المنتج
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* اختيار المخزن */}
            <div className="space-y-2">
              <Label>المخزن</Label>
              {loading ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 arabic-text">
                  جاري تحميل المخازن...
                </div>
              ) : (
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 arabic-text"
                >
                  <option value="">اختر المخزن</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              )}
              
              {/* معلومات تشخيصية */}
              {!loading && (
                <div className="text-xs text-gray-500 arabic-text">
                  {warehouses.length === 0 
                    ? "⚠️ لا توجد مخازن متاحة" 
                    : `✅ تم العثور على ${warehouses.length} مخزن`
                  }
                </div>
              )}
            </div>

            {/* البحث */}
            {selectedWarehouse && (
              <div className="space-y-2">
                <Label>البحث في المنتجات</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="البحث بالبصمة أو الشاسيه أو الماركة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* قائمة المنتجات */}
            {selectedWarehouse && (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد منتجات متاحة
                  </div>
                ) : (
                  filteredItems.map(item => (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium arabic-text">{item.brand} {item.model}</h4>
                          <p className="text-sm text-gray-600 arabic-text">
                            اللون: {item.color} | سنة الصنع: {item.manufacturingYear}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            بصمة الموتور: {item.motorFingerprint}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            {(item.salePrice || item.purchasePrice)?.toLocaleString()} جنيه
                          </p>
                          {/* لا نعرض سعر الشراء أو الربح لموظف البيع */}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* نموذج بيانات العميل */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              بيانات العميل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* تصوير بطاقة الهوية */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  صورة بطاقة الهوية *
                </Label>
                {idCardImage ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      <img 
                        src={idCardImage} 
                        alt="صورة بطاقة الهوية" 
                        className="w-full h-48 object-contain rounded-lg border-2 border-green-200 bg-gray-50"
                        onError={(e) => {
                          console.error('❌ Error loading ID card image:', idCardImage)
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPtiu2LfYoyDZgdmKINiq2K3ZhdmK2YQg2KfZhNi12YjYsdipPC90ZXh0Pjwvc3ZnPg=='
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setOcrStep('id-card')}
                          className="bg-white/90 hover:bg-white"
                        >
                          <Camera className="h-4 w-4" />
                          إعادة تصوير
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setValue('idCardImage', '')
                            setExtractedData({})
                            toast.info('تم حذف صورة بطاقة الهوية')
                          }}
                          className="bg-red-500/90 hover:bg-red-600"
                        >
                          حذف
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded text-xs">
                        ✅ تم التصوير
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 flex-col gap-2 border-dashed border-2 hover:border-blue-300 hover:bg-blue-50"
                    onClick={() => setOcrStep('id-card')}
                  >
                    <Camera className="h-8 w-8 text-blue-500" />
                    <span className="font-medium">تصوير بطاقة الهوية</span>
                    <span className="text-xs text-gray-500">سيتم استخراج البيانات تلقائياً</span>
                  </Button>
                )}
                
                {!idCardImage && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 arabic-text">
                      <strong>مطلوب:</strong> يجب تصوير بطاقة الهوية قبل المتابعة
                    </p>
                  </div>
                )}

                {/* معلومات إضافية عن الصورة */}
                {idCardImage && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CreditCard className="h-4 w-4" />
                      <span>تم تصوير بطاقة الهوية بنجاح</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      يمكنك الآن إكمال باقي البيانات أو إعادة التصوير إذا لزم الأمر
                    </p>
                  </div>
                )}

                {/* عرض البيانات المستخرجة الإضافية */}
                {(extractedData.birthDate || extractedData.gender) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-2 arabic-text">بيانات إضافية من بطاقة الهوية:</h4>
                    <div className="space-y-1 text-sm text-green-800">
                      {extractedData.birthDate && (
                        <p>تاريخ الميلاد: {extractedData.birthDate}</p>
                      )}
                      {extractedData.gender && (
                        <p>النوع: {extractedData.gender}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName" required>اسم العميل</Label>
                <Input
                  id="customerName"
                  {...register('customerName', { required: 'اسم العميل مطلوب' })}
                  placeholder="أدخل اسم العميل"
                  className="input-rtl arabic-text"
                />
                {errors.customerName && (
                  <p className="text-sm text-destructive arabic-text">{errors.customerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone" required>رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerPhone"
                    {...register('customerPhone', { required: 'رقم الهاتف مطلوب' })}
                    placeholder="01xxxxxxxxx"
                    className="pr-10 input-rtl"
                  />
                </div>
                {errors.customerPhone && (
                  <p className="text-sm text-destructive arabic-text">{errors.customerPhone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerNationalId" required>الرقم القومي</Label>
                <Input
                  id="customerNationalId"
                  {...register('customerNationalId', { required: 'الرقم القومي مطلوب' })}
                  placeholder="xxxxxxxxxxxxxx"
                  className="input-rtl"
                />
                {errors.customerNationalId && (
                  <p className="text-sm text-destructive arabic-text">{errors.customerNationalId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerAddress">العنوان</Label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    id="customerAddress"
                    {...register('customerAddress')}
                    placeholder="أدخل عنوان العميل"
                    className="form-input w-full pr-10 input-rtl arabic-text min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="أي ملاحظات إضافية"
                  className="form-input w-full input-rtl arabic-text min-h-[60px] resize-none"
                />
              </div>

              {/* سعر البيع المخصص */}
              {selectedItem && (
                <div className="space-y-2">
                  <Label htmlFor="salePrice" className="flex items-center gap-2">
                    <span>سعر البيع</span>
                    <span className="text-xs text-gray-500">
                      (السعر الافتراضي: {(selectedItem.salePrice || selectedItem.purchasePrice)?.toLocaleString()} جنيه)
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="salePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('salePrice', {
                        valueAsNumber: true,
                        validate: (value) => {
                          if (value && selectedItem) {
                            const minPrice = selectedItem.purchasePrice || 0
                            if (value < minPrice) {
                              return `سعر البيع لا يمكن أن يكون أقل من سعر الشراء (${minPrice.toLocaleString()} جنيه)`
                            }
                          }
                          return true
                        }
                      })}
                      placeholder={`السعر الافتراضي: ${(selectedItem.salePrice || selectedItem.purchasePrice)?.toLocaleString()}`}
                      className="input-rtl"
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        setCustomSalePrice(isNaN(value) ? null : value)
                      }}
                    />
                    <span className="absolute left-3 top-3 text-gray-400 text-sm">جنيه</span>
                  </div>
                  {errors.salePrice && (
                    <p className="text-sm text-destructive arabic-text">{errors.salePrice.message}</p>
                  )}
                  {customSalePrice && selectedItem.purchasePrice && customSalePrice < selectedItem.purchasePrice && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 arabic-text">
                        ⚠️ <strong>تحذير:</strong> سعر البيع ({customSalePrice.toLocaleString()} جنيه) أقل من سعر الشراء ({selectedItem.purchasePrice.toLocaleString()} جنيه)
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        هذا سيؤدي إلى خسارة قدرها {(selectedItem.purchasePrice - customSalePrice).toLocaleString()} جنيه
                      </p>
                    </div>
                  )}
                  {customSalePrice && selectedItem.purchasePrice && customSalePrice > selectedItem.purchasePrice && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 arabic-text">
                        ✅ ربح متوقع: {(customSalePrice - selectedItem.purchasePrice).toLocaleString()} جنيه
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ملخص البيع */}
              {selectedItem && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <h4 className="font-medium arabic-text">ملخص البيع</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>المنتج:</span>
                      <span className="arabic-text">{selectedItem.brand} {selectedItem.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>سعر البيع:</span>
                      <span className="font-medium text-green-600">
                        {(customSalePrice || selectedItem.salePrice || selectedItem.purchasePrice)?.toLocaleString()} جنيه
                      </span>
                    </div>
                    {customSalePrice && customSalePrice !== (selectedItem.salePrice || selectedItem.purchasePrice) && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>السعر الأصلي:</span>
                        <span>{(selectedItem.salePrice || selectedItem.purchasePrice)?.toLocaleString()} جنيه</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!selectedItem || submitting}
              >
                <Save className="ml-2 h-4 w-4" />
                {submitting ? 'جاري الحفظ...' : 'إنشاء فاتورة البيع'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

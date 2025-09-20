import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { 
  Package, 
  Search, 
  User, 
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ImprovedCameraOCR } from '@/components/ui/ImprovedCameraOCR'
import { useAuth } from '@/hooks/useAuth'
import { useAgentPermissions } from '@/lib/agentPermissions'
import { formatCurrency, isAdmin, isSuperAdmin } from '@/lib/utils'
import { uploadToCloudinary } from '@/lib/cloudinary'

interface SaleFormData {
  inventoryItemId: string
  customerName: string
  customerNationalId: string
  customerPhone: string
  customerAddress: string
  customerBirthDate?: string
  customerGender?: string
  salePrice: number
  notes?: string
  customerIdImage?: string
}

interface AgentInventoryItem {
  id: string
  motorFingerprint: string
  chassisNumber: string
  model: string
  color: string
  brand: string
  manufacturingYear: number
  purchasePrice: number
  salePrice: number
  status: 'available' | 'sold' | 'reserved'
  currentWarehouseId: string
  agentId?: string
  agentCommissionPercentage?: number // نسبة العمولة المحددة عند التحويل
  createdAt: any
}

interface AgentData {
  id: string
  name: string
  warehouseId: string
  userId?: string
  isActive: boolean
  commissionRate: number
  totalSales: number
  totalCommission: number
}

export function AgentSalesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userData } = useAuth()
  const { 
    getAgentData, 
    getAgentById,
    getAgentInventory, 
    createAgentSale 
  } = useAgentPermissions()
  
  const [agentData, setAgentData] = useState<AgentData | null>(null)
  const [inventoryItems, setInventoryItems] = useState<AgentInventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<AgentInventoryItem | null>(null)
  const [showIdCapture, setShowIdCapture] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<SaleFormData>()

  const watchedSalePrice = watch('salePrice')

  useEffect(() => {
    if (userData) {
      loadAgentData()
    }
  }, [userData])

  const loadAgentData = async () => {
    if (!userData?.id) {
      console.log('❌ [AGENT SALES] No user data available')
      return
    }

    try {
      setLoading(true)
      console.log('🔍 [AGENT SALES] Loading agent data for:', id || userData.id)
      console.log('👤 [AGENT SALES] Current user role:', userData.role)
      
      let agent: AgentData | null = null
      
      // If we have an agent ID in URL (manager accessing agent's sales page)
      if (id && (isAdmin(userData.role) || isSuperAdmin(userData.role))) {
        console.log('👨‍💼 [AGENT SALES] Manager accessing agent sales page for agent ID:', id)
        // Load specific agent data for manager using agent ID
        agent = await getAgentById(id)
        if (!agent) {
          console.error('❌ [AGENT SALES] Agent not found with ID:', id)
          toast.error('لم يتم العثور على الوكيل')
          navigate('/agents')
          return
        }
        console.log('✅ [AGENT SALES] Agent data loaded for manager:', agent)
      } else {
        console.log('🏪 [AGENT SALES] Agent accessing their own sales page')
        // Load current user's agent data (agent accessing their own page)
        agent = await getAgentData(userData.id)
      }
      
      if (!agent) {
        console.error('❌ [AGENT SALES] Agent not found')
        setAgentData(null)
        
        // Check if user is admin/manager trying to access without agent ID
        if (isAdmin(userData.role) || isSuperAdmin(userData.role)) {
          if (!id) {
            console.log('ℹ️ [AGENT SALES] Manager needs to specify agent ID')
            toast.info('يجب تحديد الوكيل للبيع بالنيابة عنه')
            navigate('/agents')
            return
          }
        } else {
          console.error('❌ [AGENT SALES] No agent account linked to user')
          toast.error('لم يتم العثور على حساب وكيل مرتبط بهذا المستخدم')
        }
        return
      }
      
      console.log('✅ [AGENT SALES] Agent data loaded:', agent)
      console.log('💰 [AGENT SALES] Agent current balance:', (agent as any).currentBalance)
      console.log('🏢 [AGENT SALES] Agent warehouse ID:', agent.warehouseId)
      setAgentData(agent)

      // Load inventory items from agent's warehouse
      if (agent.warehouseId) {
        console.log('📦 [AGENT SALES] Loading inventory for warehouse:', agent.warehouseId)
        
        const inventory = await getAgentInventory(agent.id, agent.warehouseId)
        
        console.log('✅ [AGENT SALES] Available items in agent warehouse:', inventory.length, 'items')
        console.log('📋 [AGENT SALES] Inventory items:', inventory)
        setInventoryItems(inventory)
        
        if (inventory.length === 0) {
          console.log('⚠️ [AGENT SALES] No items found in agent warehouse. Agent must have items transferred to their warehouse first.')
        }
      } else {
        console.error('❌ [AGENT SALES] Agent has no warehouse ID')
      }
      
    } catch (error) {
      console.error('Error loading agent data:', error)
      toast.error('خطأ في تحميل بيانات الوكيل')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = inventoryItems.filter(item =>
    item.motorFingerprint.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleItemSelect = (item: AgentInventoryItem) => {
    setSelectedItem(item)
    setValue('inventoryItemId', item.id)
    setValue('salePrice', item.salePrice || item.purchasePrice * 1.2)
  }


  const onSubmit = async (data: SaleFormData) => {
    console.log('🚀 [AGENT SALES] Starting sale submission...')
    console.log('📝 [AGENT SALES] Sale form data:', data)
    console.log('📦 [AGENT SALES] Selected item:', selectedItem)
    console.log('👤 [AGENT SALES] Agent data:', agentData)
    
    if (!selectedItem || !agentData || !userData) {
      console.error('❌ [AGENT SALES] Missing required data for sale')
      toast.error('يرجى اختيار منتج وتسجيل الدخول')
      return
    }

    try {
      setSubmitting(true)
      console.log('⏳ [AGENT SALES] Submission started...')
      
      // Check if this is a manager selling on behalf of an agent
      const isManagerSale = id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role))
      console.log('👨‍💼 [AGENT SALES] Is manager sale:', isManagerSale)
      
      // استخدام نسبة العمولة المحددة للمنتج أو النسبة العامة للوكيل كـ fallback
      const itemCommissionRate = selectedItem.agentCommissionPercentage || agentData.commissionRate || 10
      console.log('💰 [AGENT SALES] Commission rate:', itemCommissionRate, '%')
      
      // رفع صورة بطاقة العميل إلى Cloudinary إذا كانت موجودة
      console.log('📷 [AGENT SALES] Processing customer ID image...')
      let customerIdImageUrl = data.customerIdImage
      if (data.customerIdImage && data.customerIdImage.startsWith('data:')) {
        try {
          console.log('📤 [AGENT SALES] Uploading customer ID image to Cloudinary...')
          toast.info('جاري رفع صورة بطاقة العميل...')
          
          // تحويل data URL إلى blob
          const response = await fetch(data.customerIdImage)
          const blob = await response.blob()
          console.log('📦 [AGENT SALES] Image blob size:', blob.size, 'bytes')
          
          // رفع إلى Cloudinary
          const uploadResult = await uploadToCloudinary(blob, {
            folder: 'customer-ids',
            tags: ['customer-id', 'egyptian-id', 'agent-sale']
          })
          
          if (uploadResult.secure_url) {
            customerIdImageUrl = uploadResult.secure_url
            console.log('✅ [AGENT SALES] Customer ID image uploaded:', customerIdImageUrl)
          }
        } catch (error) {
          console.error('❌ [AGENT SALES] Error uploading customer ID image:', error)
          toast.warning('تم حفظ البيع لكن فشل في رفع صورة البطاقة')
          // نستمر في العملية حتى لو فشل رفع الصورة
        }
      } else {
        console.log('ℹ️ [AGENT SALES] No customer ID image to upload')
      }
      
      console.log('🔄 [AGENT SALES] Calling createAgentSale with data:')
      console.log('🏪 [AGENT SALES] Agent ID:', agentData.id)
      console.log('📦 [AGENT SALES] Warehouse ID:', agentData.warehouseId)
      console.log('💰 [AGENT SALES] Sale price:', data.salePrice)
      console.log('📊 [AGENT SALES] Commission rate:', itemCommissionRate)
      console.log('🆔 [AGENT SALES] Customer ID image URL:', customerIdImageUrl ? 'Present' : 'Not provided')
      
      const result = await createAgentSale(
        agentData.id,
        agentData.warehouseId,
        {
          customerId: data.customerNationalId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress,
          inventoryItemId: selectedItem.id,
          salePrice: data.salePrice,
          commissionRate: itemCommissionRate,
          customerIdImageUrl: customerIdImageUrl, // صورة بطاقة العميل المرفوعة
          saleType: isManagerSale ? 'manager_on_behalf' : 'agent_direct',
          managerId: isManagerSale ? userData.id : undefined
        }
      )
      
      console.log('📋 [AGENT SALES] createAgentSale result:', result)

      if (result.success) {
        console.log('✅ [AGENT SALES] Sale created successfully!')
        console.log('🆔 [AGENT SALES] Sale ID:', result.saleId)
        
        if (isManagerSale) {
          // استخدام نفس الحسابات الموجودة في agentPermissions.ts - من الربح وليس سعر البيع
          const totalProfit = data.salePrice - selectedItem.purchasePrice
          const agentCommission = totalProfit * (itemCommissionRate / 100)
          const companyShare = totalProfit - agentCommission
          
          console.log('💰 [AGENT SALES] Financial breakdown:')
          console.log('💰 [AGENT SALES] Sale price:', data.salePrice)
          console.log('💰 [AGENT SALES] Purchase price:', selectedItem.purchasePrice)
          console.log('💰 [AGENT SALES] Total profit:', totalProfit)
          console.log('💰 [AGENT SALES] Commission rate:', itemCommissionRate, '%')
          console.log('💰 [AGENT SALES] Agent commission (from profit):', agentCommission, '- NOT added to balance')
          console.log('💰 [AGENT SALES] Company share (from profit):', companyShare, '- ADDED as debt')
          console.log('🔍 [AGENT SALES] Verification: Commission + Company Share =', agentCommission + companyShare, '(should equal total profit:', totalProfit, ')')
          console.log('🎯 [AGENT SALES] New Logic: Only company share affects agent balance as debt!')
          console.log('🚫 [AGENT SALES] Agent commission is earned but NOT added to account balance')
          
          const successMessage = customerIdImageUrl && customerIdImageUrl.startsWith('https://') 
            ? `تم إنشاء البيع بنجاح مع رفع صورة البطاقة! تم إضافة ${formatCurrency(companyShare)} كمديونية للوكيل`
            : `تم إنشاء البيع بنجاح! تم إضافة ${formatCurrency(companyShare)} كمديونية للوكيل`
          
          toast.success(successMessage)
        } else {
          const successMessage = customerIdImageUrl && customerIdImageUrl.startsWith('https://') 
            ? 'تم إنشاء البيع بنجاح مع رفع صورة البطاقة!'
            : 'تم إنشاء البيع بنجاح'
          
          toast.success(successMessage)
        }
        
        reset()
        setSelectedItem(null)
        await loadAgentData() // إعادة تحميل البيانات
      } else {
        toast.error(result.error || 'فشل في إنشاء البيع')
      }
    } catch (error) {
      console.error('Error creating sale:', error)
      toast.error('فشل في إنشاء البيع')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  if (!agentData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-blue-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">شاشة البيع بالنيابة عن الوكيل</h3>
            <p className="text-blue-700 mb-4">
              هذه الشاشة مخصصة للوكلاء فقط. أنت مدير في النظام.
            </p>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-600 mb-2">
                <strong>لإنشاء فواتير البيع:</strong>
              </p>
              <p className="text-sm text-blue-600">
                استخدم شاشة "إنشاء فاتورة بيع" من قائمة المبيعات
              </p>
            </div>
            <button 
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              العودة للخلف
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/agents')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                البيع بالنيابة عن الوكيل
              </h1>
              <p className="text-gray-600">
                الوكيل: {agentData.name} | المخزن: {agentData.warehouseId}
              </p>
            </div>
          </div>
        </div>

        {/* Important Notice for Managers */}
        {id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role)) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-orange-600 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-orange-900 mb-1">ملاحظة مهمة - البيع بالنيابة عن الوكيل</h3>
                <p className="text-sm text-orange-800">
                  عند البيع بالنيابة عن الوكيل الأوفلاين، سيتم إضافة <strong>نصيب الشركة فقط</strong> كمديونية على الوكيل.
                  نصيب الوكيل من الربح لن يُضاف لرصيده. نسبة الربح المستخدمة هي المحددة عند نقل البضاعة لمخزن الوكيل.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                اختيار المنتج
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث ببصمة الموتور، رقم الشاسيه، الموديل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Items List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <Package className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-blue-900 mb-2 text-center">
                      لا توجد موتوسيكلات في مخزن الوكيل
                    </h3>
                    <p className="text-blue-700 text-center">
                      يجب نقل موتوسيكلات إلى مخزن الوكيل أولاً قبل إمكانية البيع
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleItemSelect(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {item.brand} {item.model}
                          </h4>
                          <p className="text-sm text-gray-600">
                            بصمة الموتور: {item.motorFingerprint}
                          </p>
                          <p className="text-sm text-gray-600">
                            رقم الشاسيه: {item.chassisNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            اللون: {item.color} | السنة: {item.manufacturingYear}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            {formatCurrency(item.salePrice || item.purchasePrice * 1.2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            سعر البيع
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            عمولة: {item.agentCommissionPercentage || agentData.commissionRate || 10}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sale Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                بيانات العميل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Customer ID Capture Button */}
                <div className="mb-4">
                  <Button
                    type="button"
                    onClick={() => setShowIdCapture(true)}
                    className={`w-full ${
                      watch('customerIdImage') 
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                        : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    }`}
                    variant="outline"
                  >
                    <div className="flex items-center justify-center gap-2">
                      {watch('customerIdImage') ? '✅ تم حفظ صورة البطاقة' : '📱 تصوير أو اختيار صورة بطاقة الهوية'}
                      <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                        {watch('customerIdImage') ? 'تغيير الصورة' : 'استخراج تلقائي'}
                      </span>
                    </div>
                  </Button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {watch('customerIdImage') 
                      ? 'سيتم رفع الصورة إلى السيرفر عند إتمام البيع'
                      : 'سيتم استخراج الاسم والرقم القومي والعنوان تلقائياً من الصورة'
                    }
                  </p>
                </div>

                {/* Customer Name */}
                <div className="space-y-2">
                  <Label htmlFor="customerName">اسم العميل *</Label>
                  <Input
                    id="customerName"
                    {...register('customerName', { required: 'اسم العميل مطلوب' })}
                    placeholder="أدخل اسم العميل"
                  />
                  {errors.customerName && (
                    <p className="text-sm text-red-600">{errors.customerName.message}</p>
                  )}
                </div>

                {/* National ID */}
                <div className="space-y-2">
                  <Label htmlFor="customerNationalId">الرقم القومي *</Label>
                  <Input
                    id="customerNationalId"
                    {...register('customerNationalId', { 
                      required: 'الرقم القومي مطلوب',
                      pattern: {
                        value: /^\d{14}$/,
                        message: 'الرقم القومي يجب أن يكون 14 رقم'
                      }
                    })}
                    placeholder="أدخل الرقم القومي (14 رقم)"
                  />
                  {errors.customerNationalId && (
                    <p className="text-sm text-red-600">{errors.customerNationalId.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">رقم الهاتف *</Label>
                  <Input
                    id="customerPhone"
                    {...register('customerPhone', { required: 'رقم الهاتف مطلوب' })}
                    placeholder="أدخل رقم الهاتف"
                  />
                  {errors.customerPhone && (
                    <p className="text-sm text-red-600">{errors.customerPhone.message}</p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="customerAddress">العنوان</Label>
                  <Input
                    id="customerAddress"
                    {...register('customerAddress')}
                    placeholder="أدخل العنوان"
                  />
                </div>

                {/* Sale Price */}
                <div className="space-y-2">
                  <Label htmlFor="salePrice">سعر البيع *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    {...register('salePrice', { 
                      required: 'سعر البيع مطلوب',
                      min: { value: 0, message: 'سعر البيع يجب أن يكون أكبر من صفر' }
                    })}
                    placeholder="أدخل سعر البيع"
                  />
                  {errors.salePrice && (
                    <p className="text-sm text-red-600">{errors.salePrice.message}</p>
                  )}
                </div>

                {/* Commission Info */}
                {selectedItem && watchedSalePrice && agentData && (
                  <div className={`border rounded-lg p-3 ${
                    id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role))
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <h4 className={`font-medium mb-2 ${
                      id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role))
                        ? 'text-yellow-800'
                        : 'text-green-800'
                    }`}>
                      {id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role))
                        ? 'تفاصيل الربح والمديونية'
                        : 'تفاصيل العمولة'
                      }
                    </h4>
                    <div className={`text-sm space-y-1 ${
                      id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role))
                        ? 'text-yellow-700'
                        : 'text-green-700'
                    }`}>
                      <div className="flex justify-between">
                        <span>سعر البيع:</span>
                        <span className="font-medium">{formatCurrency(watchedSalePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>سعر الشراء:</span>
                        <span className="font-medium">{formatCurrency(selectedItem.purchasePrice)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>إجمالي الربح:</span>
                        <span className="font-medium">{formatCurrency(watchedSalePrice - selectedItem.purchasePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>نصيب الوكيل ({selectedItem.agentCommissionPercentage || agentData.commissionRate || 10}%):</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency((watchedSalePrice - selectedItem.purchasePrice) * ((selectedItem.agentCommissionPercentage || agentData.commissionRate || 10) / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-semibold">
                          {id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role))
                            ? 'نصيب الشركة (مديونية):'
                            : 'نصيب الشركة:'
                          }
                        </span>
                        <span className={`font-bold ${
                          id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role))
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}>
                          {formatCurrency((watchedSalePrice - selectedItem.purchasePrice) - ((watchedSalePrice - selectedItem.purchasePrice) * ((selectedItem.agentCommissionPercentage || agentData.commissionRate || 10) / 100)))}
                        </span>
                      </div>
                    </div>
                    {id && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role)) && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <strong>ملاحظة:</strong> سيتم إضافة نصيب الشركة فقط ({formatCurrency((watchedSalePrice - selectedItem.purchasePrice) - ((watchedSalePrice - selectedItem.purchasePrice) * ((selectedItem.agentCommissionPercentage || agentData.commissionRate || 10) / 100)))}) كمديونية على الوكيل.
                        نصيب الوكيل لن يُضاف لرصيده.
                        {selectedItem.agentCommissionPercentage && (
                          <>
                            <br />
                            <span className="text-green-700">✓ يتم استخدام نسبة العمولة المحددة عند التحويل: {selectedItem.agentCommissionPercentage}%</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Input
                    id="notes"
                    {...register('notes')}
                    placeholder="ملاحظات إضافية"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={!selectedItem || submitting}
                  className="w-full"
                >
                  {submitting 
                    ? (watch('customerIdImage') ? 'جاري رفع الصورة وإنشاء البيع...' : 'جاري إنشاء البيع...')
                    : 'إنشاء البيع'
                  }
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Customer ID Capture Modal */}
        {showIdCapture && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">تصوير بطاقة الهوية</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowIdCapture(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>
              <ImprovedCameraOCR
                title="تصوير بطاقة الهوية"
                placeholder="الرقم القومي"
                extractionType="egyptianId"
                onTextExtracted={(text: string, imageUrl: string, extractedData?: any) => {
                  // حفظ رابط الصورة
                  setValue('customerIdImage', imageUrl)
                  
                  // استخراج البيانات إذا كانت متوفرة
                  if (extractedData) {
                    if (extractedData.name) setValue('customerName', extractedData.name)
                    if (extractedData.nationalId) setValue('customerNationalId', extractedData.nationalId)
                    if (extractedData.phone) setValue('customerPhone', extractedData.phone)
                    if (extractedData.address) setValue('customerAddress', extractedData.address)
                    if (extractedData.birthDate) setValue('customerBirthDate', extractedData.birthDate)
                    if (extractedData.gender) setValue('customerGender', extractedData.gender)
                  } else {
                    // إذا لم يتم استخراج بيانات، استخدم النص المستخرج كرقم قومي
                    setValue('customerNationalId', text)
                  }
                  
                  setShowIdCapture(false)
                  toast.success('تم حفظ صورة بطاقة الهوية وتم استخراج البيانات')
                }}
                onCancel={() => setShowIdCapture(false)}
              />
            </div>
          </div>
        )}
      </div>
    )
}

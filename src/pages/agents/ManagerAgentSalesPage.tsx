import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { 
  Package,
  User,
  Search,
  ArrowLeft,
  CheckCircle,
  Camera,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CustomerIdCapture } from '@/components/ui/CustomerIdCapture'
import { useUserData } from '@/hooks/useUserData'
import { formatCurrency, isAdmin, isSuperAdmin } from '@/lib/utils'

interface SaleFormData {
  customer: {
    name: string
    nationalId: string
    phone: string
    address: string
  }
  salePrice: number
  notes?: string
}

interface InventoryItem {
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
  motorFingerprintImageUrl?: string
  chassisNumberImageUrl?: string
  createdAt: any
}

interface Agent {
  id: string
  name: string
  warehouseId: string
  userId?: string
  isActive: boolean
  commissionRate: number
  currentBalance: number
  hasUserAccount: boolean
  createdAt: any
}

export function ManagerAgentSalesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showIdCapture, setShowIdCapture] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [idCardFrontImageUrl, setIdCardFrontImageUrl] = useState('')
  const [idCardBackImageUrl, setIdCardBackImageUrl] = useState('')

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
    if (id && userData) {
      loadAgentData()
    }
  }, [id, userData])

  const loadAgentData = async () => {
    if (!id || !userData) return

    try {
      setLoading(true)
      
      // Check if user is admin/manager
      if (!isAdmin(userData.role) && !isSuperAdmin(userData.role)) {
        toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
        navigate('/agents')
        return
      }
      
      // Load agent data
      const agentDoc = await getDoc(doc(db, 'agents', id))
      if (!agentDoc.exists()) {
        toast.error('لم يتم العثور على الوكيل')
        navigate('/agents')
        return
      }

      const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent
      
      // Check if agent is offline (no user account)
      if (agentData.hasUserAccount) {
        toast.error('هذا الوكيل لديه حساب مستخدم. استخدم شاشة البيع العادية.')
        navigate('/agents')
        return
      }
      
      setAgent(agentData)

      // Load inventory items from agent's warehouse
      if (agentData.warehouseId) {
        const inventoryQuery = query(
          collection(db, 'inventory_items'),
          where('currentWarehouseId', '==', agentData.warehouseId),
          where('status', '==', 'available')
        )
        
        const inventorySnapshot = await getDocs(inventoryQuery)
        const inventoryData = inventorySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as InventoryItem[]
        
        setInventoryItems(inventoryData)
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

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item)
    setValue('salePrice', item.salePrice || item.purchasePrice * 1.2)
  }

  const handleIdCardOCR = async (extractedData: any, frontImageUrl: string, backImageUrl?: string) => {
    try {
      if (extractedData.name) setValue('customer.name', extractedData.name)
      if (extractedData.nationalId) setValue('customer.nationalId', extractedData.nationalId)
      if (extractedData.phone) setValue('customer.phone', extractedData.phone)
      if (extractedData.address) setValue('customer.address', extractedData.address)

      setIdCardFrontImageUrl(frontImageUrl)
      if (backImageUrl) setIdCardBackImageUrl(backImageUrl)
      
      setShowIdCapture(false)
      toast.success('تم استخراج البيانات من بطاقة الهوية')
    } catch (error) {
      console.error('Error processing OCR:', error)
      toast.error('فشل في معالجة البيانات المستخرجة')
    }
  }

  const onSubmit = async (data: SaleFormData) => {
    if (!selectedItem || !agent || !userData) {
      toast.error('يرجى اختيار منتج وتسجيل الدخول')
      return
    }

    try {
      setSubmitting(true)
      
      const saleTransactionId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const totalProfit = data.salePrice - selectedItem.purchasePrice
      const agentCommission = totalProfit * (agent.commissionRate / 100)
      const companyShare = totalProfit - agentCommission

      // Create sale transaction
      await addDoc(collection(db, 'sales'), {
        id: saleTransactionId,
        agentId: agent.id,
        agentName: agent.name,
        customerId: data.customer.nationalId,
        customerName: data.customer.name,
        customerPhone: data.customer.phone,
        customerAddress: data.customer.address,
        inventoryItemId: selectedItem.id,
        motorFingerprint: selectedItem.motorFingerprint,
        chassisNumber: selectedItem.chassisNumber,
        salePrice: data.salePrice,
        purchasePrice: selectedItem.purchasePrice,
        totalProfit,
        agentCommission,
        companyShare,
        commissionRate: agent.commissionRate,
        notes: data.notes || '',
        saleType: 'manager_on_behalf',
        createdAt: serverTimestamp(),
        createdBy: userData.id
      })

      // Update inventory item status
      await updateDoc(doc(db, 'inventory_items', selectedItem.id), {
        status: 'sold',
        soldAt: serverTimestamp(),
        soldBy: userData.id,
        saleTransactionId,
        finalSalePrice: data.salePrice
      })

      // Add agent transaction - ONLY company share as debt to agent
      await addDoc(collection(db, 'agent_transactions'), {
        agentId: agent.id,
        transactionId: saleTransactionId,
        type: 'sale_debt',
        amount: -companyShare, // Negative = debt to company
        description: `مديونية بيع بالنيابة - ${selectedItem.brand} ${selectedItem.model} - العميل: ${data.customer.name}`,
        relatedSaleId: saleTransactionId,
        createdAt: serverTimestamp(),
        createdBy: userData.id
      })

      // Update agent balance - ONLY add company share as debt
      await updateDoc(doc(db, 'agents', agent.id), {
        currentBalance: agent.currentBalance - companyShare,
        totalSales: (Number((agent as any).totalSales) || 0) + data.salePrice,
        lastSaleDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Create document tracking
      await addDoc(collection(db, 'document_tracking'), {
        saleTransactionId,
        customerName: data.customer.name,
        customerNationalId: data.customer.nationalId,
        customerPhone: data.customer.phone,
        customerAddress: data.customer.address,
        motorFingerprint: selectedItem.motorFingerprint,
        chassisNumber: selectedItem.chassisNumber,
        motorBrand: selectedItem.brand,
        motorModel: selectedItem.model,
        salePrice: data.salePrice,
        purchasePrice: selectedItem.purchasePrice,
        profit: totalProfit,
        agentId: agent.id,
        agentName: agent.name,
        agentCommission,
        companyShare,
        saleType: 'manager_on_behalf',
        idCardFrontImageUrl,
        idCardBackImageUrl,
        motorFingerprintImageUrl: selectedItem.motorFingerprintImageUrl,
        chassisNumberImageUrl: selectedItem.chassisNumberImageUrl,
        status: 'pending_submission',
        stages: [{
          status: 'pending_submission',
          date: new Date(),
          updatedBy: userData.id,
          notes: `بيع بالنيابة عن الوكيل ${agent.name} - نصيب الشركة فقط: ${formatCurrency(companyShare)}`
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userData.id
      })

      toast.success(`تم إنشاء البيع بنجاح! تم إضافة ${formatCurrency(companyShare)} كمديونية للوكيل`)
      reset()
      setSelectedItem(null)
      setIdCardFrontImageUrl('')
      setIdCardBackImageUrl('')
      await loadAgentData() // Reload data
      
    } catch (error) {
      console.error('Error creating sale:', error)
      toast.error('فشل في إنشاء البيع')
    } finally {
      setSubmitting(false)
    }
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (loading) {
    return <LoadingSpinner text="جاري تحميل بيانات الوكيل..." />
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          الوكيل غير موجود
        </h2>
        <p className="text-gray-600">
          لم يتم العثور على الوكيل المطلوب أو ليس وكيل أوفلاين
        </p>
        <Button onClick={() => navigate('/agents')} className="mt-4">
          العودة للقائمة
        </Button>
      </div>
    )
  }

  const calculateProfitBreakdown = () => {
    if (!selectedItem || !watchedSalePrice) return null
    
    const totalProfit = watchedSalePrice - selectedItem.purchasePrice
    const agentCommission = totalProfit * (agent.commissionRate / 100)
    const companyShare = totalProfit - agentCommission
    
    return { totalProfit, agentCommission, companyShare }
  }

  const profitBreakdown = calculateProfitBreakdown()

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
              البيع بالنيابة عن الوكيل الأوفلاين
            </h1>
            <p className="text-gray-600">
              الوكيل: {agent.name} | المخزن: {agent.warehouseId}
            </p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-900 mb-1">ملاحظة مهمة</h3>
            <p className="text-sm text-orange-800">
              عند البيع بالنيابة عن الوكيل، سيتم إضافة <strong>نصيب الشركة فقط</strong> كمديونية على الوكيل.
              نصيب الوكيل من الربح لن يُضاف لرصيده.
            </p>
          </div>
        </div>
      </div>

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
                  className="w-full"
                  variant="outline"
                >
                  <Camera className="ml-2 h-4 w-4" />
                  تصوير بطاقة الهوية لاستخراج البيانات
                </Button>
              </div>

              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="customerName">اسم العميل *</Label>
                <Input
                  id="customerName"
                  {...register('customer.name', { required: 'اسم العميل مطلوب' })}
                  placeholder="أدخل اسم العميل"
                />
                {errors.customer?.name && (
                  <p className="text-sm text-red-600">{errors.customer.name.message}</p>
                )}
              </div>

              {/* National ID */}
              <div className="space-y-2">
                <Label htmlFor="customerNationalId">الرقم القومي *</Label>
                <Input
                  id="customerNationalId"
                  {...register('customer.nationalId', { 
                    required: 'الرقم القومي مطلوب',
                    pattern: {
                      value: /^\d{14}$/,
                      message: 'الرقم القومي يجب أن يكون 14 رقم'
                    }
                  })}
                  placeholder="أدخل الرقم القومي (14 رقم)"
                />
                {errors.customer?.nationalId && (
                  <p className="text-sm text-red-600">{errors.customer.nationalId.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="customerPhone">رقم الهاتف *</Label>
                <Input
                  id="customerPhone"
                  {...register('customer.phone', { required: 'رقم الهاتف مطلوب' })}
                  placeholder="أدخل رقم الهاتف"
                />
                {errors.customer?.phone && (
                  <p className="text-sm text-red-600">{errors.customer.phone.message}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="customerAddress">العنوان</Label>
                <Input
                  id="customerAddress"
                  {...register('customer.address')}
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

              {/* Profit Breakdown */}
              {selectedItem && profitBreakdown && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-3">تفاصيل الربح والمديونية</h4>
                  <div className="text-sm text-yellow-700 space-y-2">
                    <div className="flex justify-between">
                      <span>سعر البيع:</span>
                      <span className="font-medium">{formatCurrency(watchedSalePrice || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>سعر الشراء:</span>
                      <span className="font-medium">{formatCurrency(selectedItem.purchasePrice)}</span>
                    </div>
                    <div className="flex justify-between border-t border-yellow-300 pt-2">
                      <span>إجمالي الربح:</span>
                      <span className="font-medium">{formatCurrency(profitBreakdown.totalProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>نصيب الوكيل ({agent.commissionRate}%):</span>
                      <span className="font-medium text-green-600">{formatCurrency(profitBreakdown.agentCommission)}</span>
                    </div>
                    <div className="flex justify-between border-t border-yellow-300 pt-2">
                      <span className="font-semibold">نصيب الشركة (مديونية):</span>
                      <span className="font-bold text-red-600">{formatCurrency(profitBreakdown.companyShare)}</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <strong>ملاحظة:</strong> سيتم إضافة نصيب الشركة فقط ({formatCurrency(profitBreakdown.companyShare)}) كمديونية على الوكيل.
                    نصيب الوكيل لن يُضاف لرصيده.
                  </div>
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
                className="w-full gap-2"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner />
                    جاري إنشاء البيع...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    إنشاء البيع بالنيابة
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Customer ID Capture Modal */}
      {showIdCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full mx-4">
            <CustomerIdCapture
              onDataExtracted={handleIdCardOCR}
              onCancel={() => setShowIdCapture(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

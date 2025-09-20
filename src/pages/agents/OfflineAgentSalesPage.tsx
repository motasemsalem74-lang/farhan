import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus,
  Eye,
  DollarSign
} from 'lucide-react'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent, InventoryItem } from '@/types'
import { formatCurrency, formatDate, isAdmin, isSuperAdmin } from '@/lib/utils'

interface OfflineAgentSale {
  id: string
  agentId: string
  inventoryItemId: string
  customerDetails: {
    name: string
    phone: string
    address: string
  }
  inventoryItem: {
    brand: string
    model: string
    color: string
    manufacturingYear: number
    motorFingerprint: string
    chassisNumber: string
  }
  salePrice: number
  downPayment: number
  remainingAmount: number
  totalAmount: number
  agentCommission?: number
  saleDate: any
  paymentStatus: string
  createdAt: any
  createdBy: string
}

interface SalesFilters {
  search: string
  dateFrom: string
  dateTo: string
  sortBy: 'date' | 'amount'
  sortOrder: 'asc' | 'desc'
}

export function OfflineAgentSalesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [sales, setSales] = useState<OfflineAgentSale[]>([])
  const [agentInventory, setAgentInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSaleModal, setShowCreateSaleModal] = useState(false)
  
  const [filters, setFilters] = useState<SalesFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc'
  })

  useEffect(() => {
    if (userData && id) {
      loadData()
    }
  }, [userData, id, filters])

  const loadData = async () => {
    if (!id) return

    try {
      setLoading(true)

      // Load agent data
      const agentDoc = await getDoc(doc(db, 'agents', id))
      if (!agentDoc.exists()) {
        toast.error('لم يتم العثور على الوكيل')
        navigate('/agents/offline')
        return
      }

      const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent
      setAgent(agentData)

      // Load agent's sales
      const salesQuery = query(
        collection(db, 'sales'),
        where('agentId', '==', id)
      )
      
      const salesSnapshot = await getDocs(salesQuery)
      const salesData = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OfflineAgentSale[]
      
      setSales(salesData)

      // Load agent's available inventory for new sales
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
      
      setAgentInventory(inventoryData)

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter(sale => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!sale.customerDetails.name.toLowerCase().includes(searchLower) &&
          !sale.customerDetails.phone.includes(filters.search) &&
          !sale.inventoryItem.motorFingerprint.toLowerCase().includes(searchLower) &&
          !sale.inventoryItem.chassisNumber.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    if (filters.dateFrom) {
      const saleDate = new Date(sale.saleDate.seconds * 1000)
      const fromDate = new Date(filters.dateFrom)
      if (saleDate < fromDate) return false
    }
    
    if (filters.dateTo) {
      const saleDate = new Date(sale.saleDate.seconds * 1000)
      const toDate = new Date(filters.dateTo)
      if (saleDate > toDate) return false
    }
    
    return true
  })

  const sortedSales = [...filteredSales].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1
    switch (filters.sortBy) {
      case 'amount':
        return (a.totalAmount - b.totalAmount) * order
      default:
        return ((a.saleDate as any) - (b.saleDate as any)) * order
    }
  })

  const canManageAgents = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!canManageAgents) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">غير مصرح</h3>
            <p className="text-red-700">هذه الشاشة مخصصة للمديرين فقط</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="جاري تحميل البيانات..." />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">لم يتم العثور على الوكيل</h3>
          <Button onClick={() => navigate('/agents/offline')}>
            العودة للوكلاء الأوفلاين
          </Button>
        </div>
      </div>
    )
  }

  const totalSales = sortedSales.length
  const totalRevenue = sortedSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const totalCommission = sortedSales.reduce((sum, sale) => sum + (sale.agentCommission || 0), 0)
  const avgSaleAmount = totalSales > 0 ? totalRevenue / totalSales : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/agents/offline')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">
              مبيعات الوكيل الأوفلاين
            </h1>
            <p className="text-gray-600 arabic-text">
              الوكيل: {agent.name} | المبيعات: {totalSales} عملية بيع
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowCreateSaleModal(true)}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة عملية بيع
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الإيرادات</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي العمولات</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">متوسط البيع</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(avgSaleAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Input
                type="text"
                placeholder="البحث في المبيعات..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>

            <div>
              <Input
                type="date"
                placeholder="من تاريخ"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full"
              />
            </div>

            <div>
              <Input
                type="date"
                placeholder="إلى تاريخ"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full"
              />
            </div>

            <div>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-')
                  setFilters(prev => ({
                    ...prev,
                    sortBy: sortBy as any,
                    sortOrder: sortOrder as 'asc' | 'desc'
                  }))
                }}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="date-desc">الأحدث أولاً</option>
                <option value="date-asc">الأقدم أولاً</option>
                <option value="amount-desc">المبلغ (الأعلى أولاً)</option>
                <option value="amount-asc">المبلغ (الأقل أولاً)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      {sortedSales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد مبيعات
            </h3>
            <p className="text-gray-500 arabic-text">
              لا توجد مبيعات تطابق معايير البحث المحددة
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowCreateSaleModal(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة عملية بيع جديدة
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedSales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      )}

      {/* Create Sale Modal */}
      {showCreateSaleModal && (
        <CreateSaleModal
          agent={agent}
          availableInventory={agentInventory}
          onSaleCreated={() => {
            setShowCreateSaleModal(false)
            loadData()
          }}
          onCancel={() => setShowCreateSaleModal(false)}
        />
      )}
    </div>
  )
}

function SaleCard({ sale }: { sale: OfflineAgentSale }) {
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 arabic-text">
                {sale.customerDetails.name}
              </h3>
              <p className="text-sm text-gray-600">
                {sale.customerDetails.phone}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(sale.totalAmount)}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(sale.saleDate)}
              </p>
            </div>
          </div>

          {/* Motorcycle Info */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 arabic-text mb-2">
              {sale.inventoryItem.brand} {sale.inventoryItem.model}
            </h4>
            <div className="space-y-1 text-xs text-gray-600">
              <p>بصمة الموتور: {sale.inventoryItem.motorFingerprint}</p>
              <p>رقم الشاسيه: {sale.inventoryItem.chassisNumber}</p>
              <p>اللون: {sale.inventoryItem.color}</p>
            </div>
          </div>

          {/* Financial Info */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 arabic-text">سعر البيع:</span>
              <span className="font-medium">{formatCurrency(sale.salePrice)}</span>
            </div>
            {sale.agentCommission && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 arabic-text">عمولة الوكيل:</span>
                <span className="font-medium text-purple-600">{formatCurrency(sale.agentCommission)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
              التفاصيل
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateSaleModal({ 
  agent, 
  availableInventory, 
  onSaleCreated, 
  onCancel 
}: {
  agent: Agent
  availableInventory: InventoryItem[]
  onSaleCreated: () => void
  onCancel: () => void
}) {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateSale = async () => {
    if (!selectedItem || !customerName || !customerPhone || !salePrice || !userData) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    try {
      setCreating(true)

      const salePriceNum = parseFloat(salePrice)
      const downPaymentNum = parseFloat(downPayment) || 0
      const remainingAmount = salePriceNum - downPaymentNum
      const commission = (salePriceNum * (agent.commissionRate || 0)) / 100

      // Create sale record
      const saleData = {
        agentId: agent.id,
        inventoryItemId: selectedItem.id,
        customerDetails: {
          name: customerName,
          phone: customerPhone,
          address: customerAddress
        },
        inventoryItem: {
          brand: selectedItem.brand,
          model: selectedItem.model,
          color: selectedItem.color,
          manufacturingYear: selectedItem.manufacturingYear,
          motorFingerprint: selectedItem.motorFingerprint,
          chassisNumber: selectedItem.chassisNumber
        },
        salePrice: salePriceNum,
        downPayment: downPaymentNum,
        remainingAmount: remainingAmount,
        totalAmount: salePriceNum,
        agentCommission: commission,
        saleDate: serverTimestamp(),
        paymentStatus: downPaymentNum >= salePriceNum ? 'paid' : 'partial',
        createdAt: serverTimestamp(),
        createdBy: userData.id
      }

      await addDoc(collection(db, 'sales'), saleData)

      // Update inventory item status
      await updateDoc(doc(db, 'inventory_items', selectedItem.id), {
        status: 'sold',
        soldDate: serverTimestamp(),
        soldPrice: salePriceNum,
        updatedAt: serverTimestamp()
      })

      // Create agent transaction for commission
      const agentTransactionData = {
        agentId: agent.id,
        type: 'commission',
        amount: commission,
        description: `عمولة بيع موتوسيكل ${selectedItem.brand} ${selectedItem.model}`,
        saleAmount: salePriceNum,
        commission: commission,
        companyShare: salePriceNum - commission,
        previousBalance: agent.currentBalance,
        newBalance: agent.currentBalance + commission,
        createdAt: serverTimestamp(),
        createdBy: userData.id
      }

      await addDoc(collection(db, 'agent_transactions'), agentTransactionData)

      // Update agent balance
      await updateDoc(doc(db, 'agents', agent.id), {
        currentBalance: agent.currentBalance + commission,
        updatedAt: serverTimestamp()
      })

      toast.success('تم إنشاء عملية البيع بنجاح')
      onSaleCreated()

    } catch (error) {
      console.error('Error creating sale:', error)
      toast.error('فشل في إنشاء عملية البيع')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 arabic-text">
            إضافة عملية بيع جديدة
          </h3>
          <Button variant="ghost" onClick={onCancel}>×</Button>
        </div>

        <div className="space-y-6">
          {/* Select Motorcycle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
              اختر الموتوسيكل *
            </label>
            <select
              value={selectedItem?.id || ''}
              onChange={(e) => {
                const item = availableInventory.find(i => i.id === e.target.value)
                setSelectedItem(item || null)
                if (item) {
                  setSalePrice(item.purchasePrice.toString())
                }
              }}
              className="w-full form-input input-rtl arabic-text"
            >
              <option value="">اختر موتوسيكل...</option>
              {availableInventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.brand} {item.model} - {item.motorFingerprint}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                اسم العميل *
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="أدخل اسم العميل"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                رقم الهاتف *
              </label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="أدخل رقم الهاتف"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
              العنوان
            </label>
            <Input
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="أدخل عنوان العميل"
            />
          </div>

          {/* Sale Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                سعر البيع *
              </label>
              <Input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="أدخل سعر البيع"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                المقدم المدفوع
              </label>
              <Input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="أدخل المقدم المدفوع"
              />
            </div>
          </div>

          {/* Commission Preview */}
          {selectedItem && salePrice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 arabic-text">معاينة العمولة</h4>
              <div className="space-y-1 text-sm text-blue-700">
                <p>سعر البيع: {formatCurrency(parseFloat(salePrice))}</p>
                <p>معدل العمولة: {agent.commissionRate || 0}%</p>
                <p>عمولة الوكيل: {formatCurrency((parseFloat(salePrice) * (agent.commissionRate || 0)) / 100)}</p>
                <p>نصيب الشركة: {formatCurrency(parseFloat(salePrice) - ((parseFloat(salePrice) * (agent.commissionRate || 0)) / 100))}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onCancel}>إلغاء</Button>
            <Button
              onClick={handleCreateSale}
              disabled={!selectedItem || !customerName || !customerPhone || !salePrice || creating}
            >
              {creating ? (
                <>
                  <LoadingSpinner />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء عملية البيع'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

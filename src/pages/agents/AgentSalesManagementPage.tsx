import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Eye,
  ArrowLeft,
  AlertCircle,
  Calendar,
  DollarSign,
  Package,
  User,
  FileText,
  CreditCard
} from 'lucide-react'
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent, InventoryItem } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AgentSale {
  id: string
  invoiceNumber: string
  customerName: string
  customerPhone: string
  customerNationalId: string
  customerAddress: string
  motorFingerprint: string
  chassisNumber: string
  motorBrand: string
  motorModel: string
  salePrice: number
  purchasePrice: number
  profit: number
  agentCommission: number
  companyShare: number
  createdAt: any
  status: string
}

interface SalesFilters {
  search: string
  dateFrom: string
  dateTo: string
  sortBy: 'createdAt' | 'salePrice' | 'profit'
  sortOrder: 'asc' | 'desc'
}

export function AgentSalesManagementPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [searchParams] = useSearchParams()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([])
  const [sales, setSales] = useState<AgentSale[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSale, setShowCreateSale] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [filters, setFilters] = useState<SalesFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  useEffect(() => {
    if (userData && userData.role === 'agent') {
      loadAgentData()
    }
  }, [userData])

  useEffect(() => {
    if (agent) {
      loadAvailableItems()
      loadSalesData()
    }
  }, [agent, filters])

  useEffect(() => {
    // التحقق من وجود معرف منتج في URL للبيع المباشر
    const itemId = searchParams.get('item')
    if (itemId && availableItems.length > 0) {
      const item = availableItems.find(i => i.id === itemId)
      if (item) {
        setSelectedItem(item)
        setShowCreateSale(true)
      }
    }
  }, [searchParams, availableItems])

  const loadAgentData = async () => {
    if (!userData?.id) return

    try {
      // البحث عن الوكيل المرتبط بهذا المستخدم
      const agentsQuery = query(
        collection(db, 'agents'),
        where('userId', '==', userData.id)
      )
      
      const agentsSnapshot = await getDocs(agentsQuery)
      if (agentsSnapshot.empty) {
        console.error('No agent found for user:', userData.id)
        return
      }

      const agentDoc = agentsSnapshot.docs[0]
      const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent
      setAgent(agentData)
      
    } catch (error) {
      console.error('Error loading agent data:', error)
    }
  }

  const loadAvailableItems = async () => {
    if (!agent?.warehouseId) return

    try {
      // تحميل المنتجات المتاحة للبيع من مخزن الوكيل فقط
      const inventoryQuery = query(
        collection(db, 'inventory_items'),
        where('currentWarehouseId', '==', agent.warehouseId),
        where('status', '==', 'available')
      )

      const inventorySnapshot = await getDocs(inventoryQuery)
      const inventoryData = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[]

      setAvailableItems(inventoryData)
      
    } catch (error) {
      console.error('Error loading available items:', error)
    }
  }

  const loadSalesData = async () => {
    if (!agent?.id) return

    try {
      setLoading(true)
      
      // تحميل وثائق الوكيل من document_tracking (بدون orderBy لتجنب مشكلة Index)
      let documentsQuery = query(
        collection(db, 'document_tracking'),
        where('agentId', '==', agent.id)
      )

      const salesSnapshot = await getDocs(documentsQuery)
      let salesData = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentSale[]

      // فلترة البحث
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        salesData = salesData.filter(sale =>
          sale.invoiceNumber?.toLowerCase().includes(searchLower) ||
          sale.customerName?.toLowerCase().includes(searchLower) ||
          sale.customerPhone?.includes(filters.search) ||
          sale.motorFingerprint?.toLowerCase().includes(searchLower) ||
          sale.chassisNumber?.toLowerCase().includes(searchLower)
        )
      }

      // فلترة التاريخ
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom)
        salesData = salesData.filter(sale => sale.createdAt.toDate() >= fromDate)
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        salesData = salesData.filter(sale => sale.createdAt.toDate() <= toDate)
      }

      // ترتيب النتائج يدوياً
      salesData.sort((a, b) => {
        const order = filters.sortOrder === 'asc' ? 1 : -1
        switch (filters.sortBy) {
          case 'status':
            return a.status.localeCompare(b.status) * order
          case 'customerName':
            return (a.customerName || '').localeCompare(b.customerName || '') * order
          default:
            // ترتيب حسب التاريخ
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
            return (dateA.getTime() - dateB.getTime()) * order
        }
      })

      setSales(salesData)
      
    } catch (error) {
      console.error('Error loading sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof SalesFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (userData.role !== 'agent') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          غير مصرح لك بالوصول
        </h2>
        <p className="text-gray-600 arabic-text">
          هذه الصفحة مخصصة للوكلاء فقط
        </p>
      </div>
    )
  }

  if (!agent) {
    return <LoadingSpinner text="جاري تحميل بيانات الوكيل..." />
  }

  const totalSales = sales.length
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.salePrice, 0)
  const totalCommissions = sales.reduce((sum, sale) => sum + sale.agentCommission, 0)
  const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0)

  if (showCreateSale) {
    // استيراد مكون البيع المتطور
    const AgentCreateSaleForm = React.lazy(() => import('./AgentCreateSaleForm'))
    
    return (
      <React.Suspense fallback={<LoadingSpinner text="جاري تحميل نموذج البيع..." />}>
        <AgentCreateSaleForm 
          agent={agent}
          selectedItem={selectedItem}
          onCancel={() => {
            setShowCreateSale(false)
            setSelectedItem(null)
          }}
          onSuccess={() => {
            setShowCreateSale(false)
            setSelectedItem(null)
            loadSalesData() // إعادة تحميل المبيعات
          }}
        />
      </React.Suspense>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/agent/dashboard">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">المبيعات</h1>
            <p className="text-gray-600 arabic-text">
              إدارة المبيعات وعرض الفواتير السابقة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/agent/inventory">
            <Button variant="outline">
              <Package className="ml-2 h-4 w-4" />
              عرض المخزن
            </Button>
          </Link>
          <Button onClick={() => setShowCreateSale(true)} disabled={availableItems.length === 0}>
            <Plus className="ml-2 h-4 w-4" />
            فاتورة جديدة
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
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
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">عمولاتي</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalCommissions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">منتجات متاحة</p>
                <p className="text-2xl font-bold text-orange-600">{availableItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Items for Sale */}
      {availableItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <Package className="h-5 w-5" />
              المنتجات المتاحة للبيع ({availableItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableItems.slice(0, 6).map((item) => (
                <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 arabic-text">
                          {item.brand} {item.model}
                        </h4>
                        <p className="text-sm text-gray-600 arabic-text">
                          {item.color} - {item.manufacturingYear}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(item.salePrice || item.purchasePrice)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>بصمة: {item.motorFingerprint}</p>
                      <p>شاسيه: {item.chassisNumber}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSelectedItem(item)
                        setShowCreateSale(true)
                      }}
                    >
                      <DollarSign className="ml-2 h-4 w-4" />
                      بيع
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {availableItems.length > 6 && (
              <div className="mt-4 text-center">
                <Link to="/agent/inventory">
                  <Button variant="outline">
                    عرض جميع المنتجات ({availableItems.length})
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <Input
                type="text"
                placeholder="البحث في المبيعات..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full input-rtl"
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Date From */}
            <div>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Date To */}
            <div>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Sort By */}
            <div>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="createdAt">تاريخ البيع</option>
                <option value="salePrice">سعر البيع</option>
                <option value="profit">الربح</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="desc">الأحدث أولاً</option>
                <option value="asc">الأقدم أولاً</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="جاري تحميل المبيعات..." />
        </div>
      ) : sales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد مبيعات
            </h3>
            <p className="text-gray-500 arabic-text mb-6">
              لم تقم بأي عمليات بيع حتى الآن
            </p>
            {availableItems.length > 0 && (
              <Button onClick={() => setShowCreateSale(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إنشاء أول فاتورة
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Customer Info */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-900 arabic-text">
                      {sale.invoiceNumber}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="arabic-text">{sale.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(sale.createdAt.toDate())}</span>
                      </div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 arabic-text">
                      {sale.motorBrand} {sale.motorModel}
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>بصمة: {sale.motorFingerprint}</p>
                      <p>شاسيه: {sale.chassisNumber}</p>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="space-y-2">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 arabic-text">سعر البيع:</span>
                        <span className="font-medium">{formatCurrency(sale.salePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 arabic-text">عمولتي:</span>
                        <span className="font-medium text-purple-600">
                          {formatCurrency(sale.agentCommission)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 arabic-text">الربح:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(sale.profit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/agent/documents?sale=${sale.id}`}>
                      <Button variant="outline" size="sm">
                        <FileText className="ml-2 h-4 w-4" />
                        تتبع الجواب
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      <Eye className="ml-2 h-4 w-4" />
                      التفاصيل
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

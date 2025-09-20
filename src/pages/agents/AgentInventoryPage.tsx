import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  Search, 
  Eye,
  ArrowLeft,
  AlertCircle,
  Filter,
  Calendar,
  DollarSign
} from 'lucide-react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
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

interface InventoryFilters {
  search: string
  status: 'all' | 'available' | 'sold'
  sortBy: 'createdAt' | 'brand' | 'model' | 'purchasePrice'
  sortOrder: 'asc' | 'desc'
}

export function AgentInventoryPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    status: 'all',
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
      loadInventoryData()
    }
  }, [agent, filters])

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

  const loadInventoryData = async () => {
    if (!agent?.warehouseId) return

    try {
      setLoading(true)
      
      // تحميل المنتجات من مخزن الوكيل فقط
      let inventoryQuery = query(
        collection(db, 'inventory_items'),
        where('currentWarehouseId', '==', agent.warehouseId)
      )

      // إضافة فلترة حسب الحالة
      if (filters.status !== 'all') {
        inventoryQuery = query(
          collection(db, 'inventory_items'),
          where('currentWarehouseId', '==', agent.warehouseId),
          where('status', '==', filters.status)
        )
      }

      const inventorySnapshot = await getDocs(inventoryQuery)
      let inventoryData = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[]

      // فلترة البحث
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        inventoryData = inventoryData.filter(item =>
          item.motorFingerprint?.toLowerCase().includes(searchLower) ||
          item.chassisNumber?.toLowerCase().includes(searchLower) ||
          item.brand?.toLowerCase().includes(searchLower) ||
          item.model?.toLowerCase().includes(searchLower) ||
          item.color?.toLowerCase().includes(searchLower)
        )
      }

      // ترتيب النتائج
      inventoryData.sort((a, b) => {
        const order = filters.sortOrder === 'asc' ? 1 : -1
        switch (filters.sortBy) {
          case 'brand':
            return (a.brand || '').localeCompare(b.brand || '') * order
          case 'model':
            return (a.model || '').localeCompare(b.model || '') * order
          case 'purchasePrice':
            return (a.purchasePrice - b.purchasePrice) * order
          default:
            return ((a.createdAt as any) - (b.createdAt as any)) * order
        }
      })

      setInventoryItems(inventoryData)
      
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof InventoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100'
      case 'sold': return 'text-red-600 bg-red-100'
      case 'reserved': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'متاح'
      case 'sold': return 'مباع'
      case 'reserved': return 'محجوز'
      default: return status
    }
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

  const availableItems = inventoryItems.filter(item => item.status === 'available').length
  const soldItems = inventoryItems.filter(item => item.status === 'sold').length
  const totalValue = inventoryItems
    .filter(item => item.status === 'available')
    .reduce((sum, item) => sum + (item.salePrice || item.purchasePrice), 0)

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
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">مخزني</h1>
            <p className="text-gray-600 arabic-text">
              عرض المنتجات المتاحة في مخزن {agent.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/agent/sales">
            <Button>
              <DollarSign className="ml-2 h-4 w-4" />
              بيع منتج
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الأصناف</p>
                <p className="text-2xl font-bold text-gray-900">{inventoryItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">متاح للبيع</p>
                <p className="text-2xl font-bold text-green-600">{availableItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Package className="h-6 w-6 text-red-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">مباع</p>
                <p className="text-2xl font-bold text-red-600">{soldItems}</p>
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
                <p className="text-sm font-medium text-gray-600 arabic-text">قيمة المتاح</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <Input
                type="text"
                placeholder="البحث في المنتجات..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full input-rtl"
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="all">جميع الحالات</option>
                <option value="available">متاح</option>
                <option value="sold">مباع</option>
                <option value="reserved">محجوز</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="createdAt">تاريخ الإضافة</option>
                <option value="brand">الماركة</option>
                <option value="model">الموديل</option>
                <option value="purchasePrice">السعر</option>
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

      {/* Inventory Items */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="جاري تحميل المنتجات..." />
        </div>
      ) : inventoryItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد منتجات
            </h3>
            <p className="text-gray-500 arabic-text">
              لا توجد منتجات في مخزنك حالياً
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {inventoryItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 arabic-text">
                        {item.brand} {item.model}
                      </h3>
                      <p className="text-sm text-gray-600 arabic-text">
                        {item.color} - {item.manufacturingYear}
                      </p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(item.status)
                    )}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 arabic-text">بصمة الموتور:</span>
                      <span className="font-mono">{item.motorFingerprint}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 arabic-text">رقم الشاسيه:</span>
                      <span className="font-mono">{item.chassisNumber}</span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600 arabic-text">سعر الشراء</p>
                        <p className="font-bold text-gray-900">
                          {formatCurrency(item.purchasePrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 arabic-text">سعر البيع</p>
                        <p className="font-bold text-green-600">
                          {formatCurrency(item.salePrice || item.purchasePrice)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                    <Calendar className="h-3 w-3" />
                    <span>أُضيف في {formatDate(item.createdAt.toDate())}</span>
                  </div>

                  {/* Actions */}
                  {item.status === 'available' && (
                    <div className="pt-2">
                      <Link to={`/agent/sales?item=${item.id}`}>
                        <Button size="sm" className="w-full">
                          <DollarSign className="ml-2 h-4 w-4" />
                          بيع هذا المنتج
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ShoppingCart, 
  Plus, 
  Eye,
  Calendar,
  User,
  Package,
  DollarSign,
  FileText
} from 'lucide-react'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Transaction } from '@/types'
import { formatCurrency, formatDate, canCreateSales } from '@/lib/utils'

interface SalesFilters {
  search: string
  dateFrom: string
  dateTo: string
  warehouseId: string
  sortBy: 'date' | 'amount' | 'customer'
  sortOrder: 'asc' | 'desc'
}

export default function SalesList() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [sales, setSales] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SalesFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    warehouseId: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  })

  useEffect(() => {
    if (userData) {
      loadSalesData()
    }
  }, [userData, filters])

  const loadSalesData = async () => {
    try {
      setLoading(true)
      
      // Load real sales data from document_tracking (where sales are actually stored)
      const salesQuery = query(
        collection(db, 'document_tracking'),
        orderBy('createdAt', 'desc')
      )
      
      const salesSnapshot = await getDocs(salesQuery)
      console.log('📊 [SALES LIST] Loaded sales documents:', salesSnapshot.docs.length)
      
      const salesData = salesSnapshot.docs.map(doc => {
        const data = doc.data()
        console.log('📋 [SALES LIST] Processing sale:', doc.id, {
          salePrice: data.salePrice,
          purchasePrice: data.purchasePrice,
          customerName: data.customerName
        })
        
        // Convert document_tracking format to Transaction format for compatibility
        return {
          id: doc.id,
          type: 'sale_to_customer',
          referenceNumber: data.saleTransactionId || doc.id,
          date: data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : data.createdAt instanceof Date 
              ? data.createdAt 
              : data.createdAt 
                ? new Date(data.createdAt as any)
                : new Date(),
          totalAmount: typeof data.salePrice === 'string' ? parseFloat(data.salePrice) || 0 : (data.salePrice || 0),
          details: {
            customer: {
              name: data.customerName || 'غير محدد',
              phone: data.customerPhone || '',
              address: data.customerAddress || '',
              nationalId: data.customerNationalId || '',
              idCardFrontImageUrl: data.customerIdImageUrl || '',
              idCardBackImageUrl: data.customerIdBackImageUrl || ''
            }
          },
          items: [{
            inventoryId: doc.id,
            inventoryItemId: doc.id,
            motorFingerprint: data.motorFingerprint || '',
            chassisNumber: data.chassisNumber || '',
            quantity: 1,
            unitPrice: typeof data.salePrice === 'string' ? parseFloat(data.salePrice) || 0 : (data.salePrice || 0),
            totalPrice: typeof data.salePrice === 'string' ? parseFloat(data.salePrice) || 0 : (data.salePrice || 0),
            purchasePrice: typeof data.purchasePrice === 'string' ? parseFloat(data.purchasePrice) || 0 : (data.purchasePrice || 0)
          }],
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : data.createdAt instanceof Date 
              ? data.createdAt 
              : data.createdAt 
                ? new Date(data.createdAt as any)
                : new Date(),
          updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
            ? data.updatedAt.toDate() 
            : data.updatedAt instanceof Date 
              ? data.updatedAt 
              : data.updatedAt 
                ? new Date(data.updatedAt as any)
                : data.createdAt && typeof data.createdAt.toDate === 'function' 
                  ? data.createdAt.toDate() 
                  : data.createdAt instanceof Date 
                    ? data.createdAt 
                    : data.createdAt 
                      ? new Date(data.createdAt as any)
                      : new Date(),
          createdBy: data.createdBy || '',
          userId: data.createdBy || '',
          agentId: data.agentId || null,
          agentName: data.agentName || null
        }
      }) as Transaction[]
      
      setSales(salesData)
    } catch (error) {
      console.error('Error loading sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter(sale => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const customerName = sale.details.customer?.name?.toLowerCase() || ''
      const referenceNumber = sale.referenceNumber.toLowerCase()
      const motorFingerprint = sale.items[0]?.motorFingerprint?.toLowerCase() || ''
      const chassisNumber = sale.items[0]?.chassisNumber?.toLowerCase() || ''
      
      if (!customerName.includes(searchLower) && 
          !referenceNumber.includes(searchLower) &&
          !motorFingerprint.includes(searchLower) &&
          !chassisNumber.includes(searchLower)) {
        return false
      }
    }
    
    if (filters.dateFrom) {
      let saleDate: Date
      if (sale.date instanceof Date) {
        saleDate = sale.date
      } else if (sale.date && typeof (sale.date as any).toDate === 'function') {
        saleDate = (sale.date as any).toDate()
      } else {
        saleDate = new Date()
      }
      const fromDate = new Date(filters.dateFrom)
      if (saleDate < fromDate) return false
    }
    
    if (filters.dateTo) {
      let saleDate: Date
      if (sale.date instanceof Date) {
        saleDate = sale.date
      } else if (sale.date && typeof (sale.date as any).toDate === 'function') {
        saleDate = (sale.date as any).toDate()
      } else {
        saleDate = new Date()
      }
      const toDate = new Date(filters.dateTo)
      if (saleDate > toDate) return false
    }
    
    if (filters.warehouseId !== 'all' && sale.fromWarehouseId !== filters.warehouseId) {
      return false
    }
    
    return true
  })

  const sortedSales = [...filteredSales].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1
    switch (filters.sortBy) {
      case 'amount':
        return (a.totalAmount - b.totalAmount) * order
      case 'customer':
        const nameA = a.details.customer?.name || ''
        const nameB = b.details.customer?.name || ''
        return nameA.localeCompare(nameB) * order
      default:
        let dateA: Date
        if (a.date instanceof Date) {
          dateA = a.date
        } else if (a.date && typeof (a.date as any).toDate === 'function') {
          dateA = (a.date as any).toDate()
        } else {
          dateA = new Date()
        }
        
        let dateB: Date
        if (b.date instanceof Date) {
          dateB = b.date
        } else if (b.date && typeof (b.date as any).toDate === 'function') {
          dateB = (b.date as any).toDate()
        } else {
          dateB = new Date()
        }
        
        return (dateA.getTime() - dateB.getTime()) * order
    }
  })

  const handleFilterChange = (key: keyof SalesFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const canCreateSale = userData && canCreateSales(userData.role)
  const totalSalesAmount = filteredSales.reduce((sum, sale) => {
    const amount = typeof sale.totalAmount === 'string' ? parseFloat(sale.totalAmount) || 0 : (sale.totalAmount || 0)
    return sum + amount
  }, 0)

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">إدارة المبيعات</h1>
          <p className="text-gray-600 arabic-text">عرض وإدارة جميع فواتير البيع</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateSale && (
            <Link to="/sales/create">
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إنشاء فاتورة بيع
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-gray-900">{filteredSales.length}</p>
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
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي القيمة</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSalesAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">مبيعات اليوم</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredSales.filter(sale => {
                    const today = new Date()
                    const saleDate = new Date(sale.date as any)
                    return saleDate.toDateString() === today.toDateString()
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Input
                type="text"
                placeholder="البحث في المبيعات..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
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

            {/* Sort */}
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
                <option value="amount-desc">القيمة (الأعلى أولاً)</option>
                <option value="amount-asc">القيمة (الأقل أولاً)</option>
                <option value="customer-asc">العميل (أ - ي)</option>
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
      ) : sortedSales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد مبيعات
            </h3>
            <p className="text-gray-500 arabic-text">
              لا يوجد مبيعات تطابق معايير البحث المحددة
            </p>
            {canCreateSale && (
              <div className="mt-6">
                <Link to="/sales/create">
                  <Button>
                    <Plus className="ml-2 h-4 w-4" />
                    إنشاء فاتورة بيع جديدة
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedSales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      )}
    </div>
  )
}

function SaleCard({ sale }: { sale: Transaction }) {
  const navigate = useNavigate()
  
  const handleViewDetails = () => {
    navigate(`/sales/details/${sale.id}`)
  }

  const calculateProfit = () => {
    // حساب الربح الحقيقي من البيانات المحفوظة
    const salePrice = sale.totalAmount || 0
    const purchasePrice = (sale.items[0] as any)?.purchasePrice || 0
    
    if (purchasePrice > 0) {
      return salePrice - purchasePrice
    }
    
    // إذا لم يكن سعر الشراء متوفر، لا نعرض ربح
    return 0
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 arabic-text">
                {sale.referenceNumber}
              </h3>
              <p className="text-sm text-gray-600 arabic-text">
                {formatDate(sale.date as any)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(sale.totalAmount)}
              </p>
              {calculateProfit() > 0 ? (
                <p className="text-sm text-green-600">
                  ربح: {formatCurrency(calculateProfit())}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  الربح: غير محدد
                </p>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900 arabic-text">
                {sale.details.customer?.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {sale.items[0]?.motorFingerprint}
              </span>
            </div>
          </div>

          {/* Items Summary */}
          <div className="text-xs text-gray-500 arabic-text">
            {sale.items.length} صنف • {sale.details.customer?.phone}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={handleViewDetails}>
              <Eye className="h-4 w-4" />
              عرض التفاصيل
            </Button>
            <Button variant="ghost" size="sm">
              <FileText className="h-4 w-4" />
              طباعة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

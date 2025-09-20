import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { 
  Package, 
  Plus, 
  ArrowRightLeft,
  Grid3X3,
  List,
  Eye,
  Edit
} from 'lucide-react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { InventoryItem, VehicleType, Warehouse } from '@/types'
import { vehicleTypeTranslations, formatCurrency, formatDate, isAdmin, isSuperAdmin } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Import sub-pages
import { AddInventoryPage } from './AddInventoryPage'
import { EditInventoryPage } from './EditInventoryPage'
import { InventoryDetailsPage } from './InventoryDetailsPage'
import { WarehouseTransferPage } from './WarehouseTransferPage'

interface InventoryFilters {
  search: string
  warehouseId: string
  type: VehicleType | 'all'
  status: string
  sortBy: 'createdAt' | 'type' | 'brand' | 'purchasePrice'
  sortOrder: 'asc' | 'desc'
}

export function InventoryPage() {
  return (
    <Routes>
      <Route path="/" element={<InventoryList />} />
      <Route path="/add" element={<AddInventoryPage />} />
      <Route path="/edit/:id" element={<EditInventoryPage />} />
      <Route path="/details/:id" element={<InventoryDetailsPage />} />
      <Route path="/transfer" element={<WarehouseTransferPage />} />
    </Routes>
  )
}

function InventoryList() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    warehouseId: 'all',
    type: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  useEffect(() => {
    if (userData) {
      loadInventoryData()
      loadWarehouses()
    }
  }, [userData, filters])

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      
      // Load real inventory data from Firebase
      const inventoryQuery = query(
        collection(db, 'inventory_items'),
        orderBy('createdAt', 'desc')
      )
      
      const inventorySnapshot = await getDocs(inventoryQuery)
      const inventoryData = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[]
      
      setInventory(inventoryData)
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWarehouses = async () => {
    try {
      // Load real warehouses from Firebase
      const warehousesQuery = query(
        collection(db, 'warehouses'),
        where('isActive', '==', true)
      )
      
      const warehousesSnapshot = await getDocs(warehousesQuery)
      const warehousesData = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Warehouse[]
      
      setWarehouses(warehousesData)
    } catch (error) {
      console.error('Error loading warehouses:', error)
      toast.error('خطأ في تحميل المخازن')
    }
  }

  const filteredInventory = inventory.filter(item => {
    if (filters.search && 
        !item.motorFingerprint.toLowerCase().includes(filters.search.toLowerCase()) &&
        !item.chassisNumber.toLowerCase().includes(filters.search.toLowerCase()) &&
        !item.brand.toLowerCase().includes(filters.search.toLowerCase()) &&
        !item.model.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.warehouseId !== 'all' && item.currentWarehouseId !== filters.warehouseId) {
      return false
    }
    if (filters.type !== 'all' && item.type !== filters.type) {
      return false
    }
    if (filters.status !== 'all' && item.status !== filters.status) {
      return false
    }
    return true
  })

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1
    switch (filters.sortBy) {
      case 'type':
        return a.type.localeCompare(b.type) * order
      case 'brand':
        return a.brand.localeCompare(b.brand) * order
      case 'purchasePrice':
        return (a.purchasePrice - b.purchasePrice) * order
      default:
        return ((a.createdAt as any) - (b.createdAt as any)) * order
    }
  })

  const handleFilterChange = (key: keyof InventoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const canAddItems = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">إدارة المخزون</h1>
          <p className="text-gray-600 arabic-text">عرض وإدارة جميع الأصناف في المخازن</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/inventory/transfer">
            <Button variant="outline">
              <ArrowRightLeft className="ml-2 h-4 w-4" />
              تحويل بين المخازن
            </Button>
          </Link>
          {canAddItems && (
            <Link to="/inventory/add">
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة صنف جديد
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Input
                type="text"
                placeholder="البحث في المخزون..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Warehouse Filter */}
            <div>
              <select
                value={filters.warehouseId}
                onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="all">جميع المخازن</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="all">جميع الأنواع</option>
                {Object.entries(vehicleTypeTranslations).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
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
                <option value="transferred">محول</option>
                <option value="reserved">محجوز</option>
              </select>
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
                <option value="createdAt-desc">الأحدث أولاً</option>
                <option value="createdAt-asc">الأقدم أولاً</option>
                <option value="type-asc">النوع (أ - ي)</option>
                <option value="brand-asc">الماركة (أ - ي)</option>
                <option value="purchasePrice-asc">السعر (الأقل أولاً)</option>
                <option value="purchasePrice-desc">السعر (الأعلى أولاً)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 arabic-text">
          عرض {sortedInventory.length} من {inventory.length} صنف
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Inventory Display */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="جاري تحميل المخزون..." />
        </div>
      ) : sortedInventory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد أصناف
            </h3>
            <p className="text-gray-500 arabic-text">
              لا يوجد أصناف تطابق معايير البحث المحددة
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedInventory.map((item) => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      النوع والماركة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      بصمة الموتور
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      رقم الشاسيه
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      السعر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedInventory.map((item) => (
                    <InventoryRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'sold': return 'bg-red-100 text-red-800'
      case 'transferred': return 'bg-blue-100 text-blue-800'
      case 'reserved': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'متاح'
      case 'sold': return 'مباع'
      case 'transferred': return 'محول'
      case 'reserved': return 'محجوز'
      default: return status
    }
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Item Type and Brand */}
          <div>
            <h3 className="font-medium text-gray-900 arabic-text">
              {item.brand} {item.model}
            </h3>
            <p className="text-sm text-gray-600 arabic-text">
              {vehicleTypeTranslations[item.type]} - {item.color}
            </p>
          </div>

          {/* IDs */}
          <div className="space-y-1 text-xs">
            <p className="text-gray-600">
              <span className="font-medium">بصمة الموتور:</span> {item.motorFingerprint}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">رقم الشاسيه:</span> {item.chassisNumber}
            </p>
          </div>

          {/* Price and Status */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(item.purchasePrice)}
            </span>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(item.status))}>
              {getStatusLabel(item.status)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link to={`/inventory/details/${item.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={`/inventory/edit/${item.id}`}>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'sold': return 'bg-red-100 text-red-800'
      case 'transferred': return 'bg-blue-100 text-blue-800'
      case 'reserved': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'متاح'
      case 'sold': return 'مباع'
      case 'transferred': return 'محول'
      case 'reserved': return 'محجوز'
      default: return status
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 arabic-text">
          {item.brand} {item.model}
        </div>
        <div className="text-sm text-gray-500 arabic-text">
          {vehicleTypeTranslations[item.type]} - {item.color}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.motorFingerprint}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.chassisNumber}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {formatCurrency(item.purchasePrice)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={cn('inline-flex px-2 py-1 text-xs font-semibold rounded-full', getStatusColor(item.status))}>
          {getStatusLabel(item.status)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-2">
          <Link to={`/inventory/details/${item.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={`/inventory/edit/${item.id}`}>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  )
}
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  MapPin,
  Eye,
  History,
  FileText
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { InventoryItem, Transaction, Warehouse } from '@/types'
import { vehicleTypeTranslations, formatCurrency, formatDateTime, cn } from '@/lib/utils'

export function InventoryDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && userData) {
      loadItemDetails()
    }
  }, [id, userData])

  const loadItemDetails = async () => {
    if (!id) return

    try {
      setLoading(true)
      
      // Load real item data from Firebase
      const itemDoc = await getDoc(doc(db, 'inventory_items', id))
      if (!itemDoc.exists()) {
        console.error('Item not found:', id)
        setItem(null)
        return
      }

      const itemData = {
        id: itemDoc.id,
        ...itemDoc.data()
      } as InventoryItem

      console.log('Item data loaded:', itemData)
      setItem(itemData)

      // Load warehouse data if available
      if (itemData.currentWarehouseId) {
        try {
          const warehouseDoc = await getDoc(doc(db, 'warehouses', itemData.currentWarehouseId))
          if (warehouseDoc.exists()) {
            const warehouseData = {
              id: warehouseDoc.id,
              ...warehouseDoc.data()
            } as Warehouse
            console.log('Warehouse data loaded:', warehouseData)
            setWarehouse(warehouseData)
          } else {
            console.log('Warehouse not found:', itemData.currentWarehouseId)
            // Create a fallback warehouse object
            setWarehouse({
              id: itemData.currentWarehouseId,
              name: (itemData as any).warehouseName || 'مخزن غير معروف',
              type: 'main' as any,
              isActive: true,
              createdAt: new Date() as any,
              updatedAt: new Date() as any
            })
          }
        } catch (warehouseError) {
          console.error('Error loading warehouse:', warehouseError)
        }
      }

      // Load transaction history for this item
      try {
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('items', 'array-contains', { inventoryItemId: id }),
          orderBy('createdAt', 'desc')
        )
        
        const transactionsSnapshot = await getDocs(transactionsQuery)
        const transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[]
        
        console.log('Transactions loaded:', transactionsData.length, 'transactions')
        setTransactions(transactionsData)
      } catch (transactionError) {
        console.error('Error loading transactions:', transactionError)
        // If transactions query fails (likely due to missing index), set empty array
        setTransactions([])
      }

      // Also load warehouse transfers for this item
      try {
        const transfersQuery = query(
          collection(db, 'warehouse_transfers'),
          where('inventoryItemId', '==', id),
          orderBy('createdAt', 'desc')
        )
        
        const transfersSnapshot = await getDocs(transfersQuery)
        const transfersData = transfersSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'warehouse_transfer',
          date: doc.data().transferredAt || doc.data().createdAt,
          referenceNumber: doc.data().transactionId,
          totalAmount: doc.data().purchasePrice || 0,
          details: {
            notes: `تحويل من ${doc.data().fromWarehouseId} إلى ${doc.data().toWarehouseId}`
          },
          ...doc.data()
        })) as Transaction[]
        
        console.log('Transfers loaded:', transfersData.length, 'transfers')
        
        // Combine transactions and transfers
        const allTransactions = [...transactions, ...transfersData]
          .sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : (a.date ? new Date(a.date as any) : new Date())
            const dateB = b.date?.toDate ? b.date.toDate() : (b.date ? new Date(b.date as any) : new Date())
            return dateB.getTime() - dateA.getTime()
          })
        
        setTransactions(allTransactions)
      } catch (transferError) {
        console.error('Error loading transfers:', transferError)
      }

    } catch (error) {
      console.error('Error loading item details:', error)
      setItem(null)
    } finally {
      setLoading(false)
    }
  }

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

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      'warehouse_entry': 'إدخال مخزني',
      'warehouse_transfer': 'تحويل مخزني',
      'sale_to_customer': 'بيع للعميل',
      'agent_invoice': 'فاتورة وكيل',
      'payment_receipt': 'سند قبض',
      'return': 'مرتجع'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'warehouse_entry': return 'bg-green-100 text-green-800'
      case 'warehouse_transfer': return 'bg-blue-100 text-blue-800'
      case 'sale_to_customer': return 'bg-purple-100 text-purple-800'
      case 'agent_invoice': return 'bg-orange-100 text-orange-800'
      case 'payment_receipt': return 'bg-teal-100 text-teal-800'
      case 'return': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-6">
        <LoadingSpinner text="جاري تحميل تفاصيل الصنف..." />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-6xl mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              الصنف غير موجود
            </h3>
            <p className="text-gray-500 arabic-text mb-4">
              لا يمكن العثور على الصنف المطلوب
            </p>
            <Button onClick={() => navigate('/inventory')}>
              العودة للمخزون
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">
            تفاصيل الصنف
          </h1>
          <p className="text-gray-600 arabic-text">
            {item.brand} {item.model} - {vehicleTypeTranslations[item.type]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/inventory/edit/${item.id}`}>
            <Button variant="outline">
              <Edit className="ml-2 h-4 w-4" />
              تحرير
            </Button>
          </Link>
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item Information */}
        <div className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات أساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 arabic-text">النوع</p>
                  <p className="font-medium arabic-text">{vehicleTypeTranslations[item.type]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 arabic-text">الماركة</p>
                  <p className="font-medium arabic-text">{item.brand}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 arabic-text">الموديل</p>
                  <p className="font-medium arabic-text">{item.model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 arabic-text">اللون</p>
                  <p className="font-medium arabic-text">{item.color}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 arabic-text">بلد المنشأ</p>
                  <p className="font-medium arabic-text">{item.countryOfOrigin}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 arabic-text">سنة الصنع</p>
                  <p className="font-medium">{item.manufacturingYear}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 arabic-text">سعر الشراء</p>
                  <p className="font-medium text-green-600">{formatCurrency(item.purchasePrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 arabic-text">الحالة</p>
                  <span className={cn('inline-flex px-2 py-1 text-xs font-semibold rounded-full', getStatusColor(item.status))}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identification Card */}
          <Card>
            <CardHeader>
              <CardTitle>معرفات الصنف</CardTitle>
              <CardDescription>بصمة الموتور ورقم الشاسيه</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 arabic-text mb-2">بصمة الموتور</p>
                <p className="font-mono text-lg font-bold border p-3 rounded bg-gray-50">
                  {item.motorFingerprint}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 arabic-text mb-2">رقم الشاسيه</p>
                <p className="font-mono text-lg font-bold border p-3 rounded bg-gray-50">
                  {item.chassisNumber}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                معلومات المخزن
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium arabic-text">{warehouse?.name}</p>
                  <p className="text-sm text-gray-500 arabic-text">
                    تاريخ الإدخال: {item.createdAt ? formatDateTime(item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt as any)) : 'غير محدد'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 arabic-text">رقم الإدخال</p>
                  <p className="font-mono text-sm">{item.entryTransactionId}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Images and History */}
        <div className="space-y-6">
          {/* Images Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                الصور المرفقة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Motor Fingerprint Image */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 arabic-text">صورة بصمة الموتور</p>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <img 
                    src={item.motorFingerprintImageUrl} 
                    alt="Motor Fingerprint"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder-image.jpg'
                    }}
                  />
                </div>
              </div>

              {/* Chassis Number Image */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 arabic-text">صورة رقم الشاسيه</p>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <img 
                    src={item.chassisNumberImageUrl} 
                    alt="Chassis Number"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder-image.jpg'
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                سجل المعاملات
              </CardTitle>
              <CardDescription>تاريخ جميع المعاملات المتعلقة بهذا الصنف</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-4 arabic-text">
                  لا توجد معاملات مسجلة
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-full', getTransactionColor(transaction.type))}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium arabic-text">
                            {getTransactionTypeLabel(transaction.type)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {transaction.date ? formatDateTime(transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date as any)) : 'غير محدد'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm text-gray-600">
                          {transaction.referenceNumber}
                        </p>
                        <p className="text-sm font-medium">
                          {formatCurrency(transaction.totalAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
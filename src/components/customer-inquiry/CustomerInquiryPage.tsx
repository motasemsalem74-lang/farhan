import React, { useState, useEffect } from 'react'
import { 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Package, 
  FileText, 
  Calendar,
  Eye,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Sale, DocumentTracking } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CustomerData {
  id: string
  name: string
  phone: string
  nationalId: string
  address: string
  sales: Sale[]
  documents: DocumentTracking[]
  totalPurchases: number
  lastPurchaseDate?: Date
}

interface SearchFilters {
  searchType: 'name' | 'phone' | 'nationalId' | 'motorFingerprint' | 'chassisNumber' | 'invoiceNumber'
  searchTerm: string
  dateFrom?: string
  dateTo?: string
}

export function CustomerInquiryPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  const [currentAgent, setCurrentAgent] = useState<any>(null)
  const [filters, setFilters] = useState<SearchFilters>({
    searchType: 'name',
    searchTerm: ''
  })

  // تحديد الوكيل الحالي إذا كان المستخدم وكيل
  useEffect(() => {
    const loadCurrentAgent = async () => {
      if (userData && userData.role === 'agent') {
        try {
          const agentsQuery = query(
            collection(db, 'agents'),
            where('userId', '==', userData.id)
          )
          const agentsSnapshot = await getDocs(agentsQuery)
          if (!agentsSnapshot.empty) {
            const agentData = agentsSnapshot.docs[0].data()
            setCurrentAgent({ id: agentsSnapshot.docs[0].id, ...agentData })
          }
        } catch (error) {
          console.error('Error loading agent:', error)
        }
      }
    }
    
    loadCurrentAgent()
  }, [userData])

  const searchCustomers = async () => {
    if (!filters.searchTerm.trim()) {
      setCustomers([])
      return
    }

    try {
      setLoading(true)
      
      // Search in real Firebase data
      let searchResults: CustomerData[] = []
      
      if (filters.searchType === 'motorFingerprint' || filters.searchType === 'chassisNumber') {
        // Search in document_tracking collection
        let documentsQuery
        if (currentAgent && userData?.role === 'agent') {
          // للوكيل: عرض عملاءه فقط
          documentsQuery = query(
            collection(db, 'document_tracking'),
            where('agentId', '==', currentAgent.id),
            where(filters.searchType, '>=', filters.searchTerm),
            where(filters.searchType, '<=', filters.searchTerm + '\uf8ff')
          )
        } else {
          // للمديرين: عرض جميع العملاء
          documentsQuery = query(
            collection(db, 'document_tracking'),
            where(filters.searchType, '>=', filters.searchTerm),
            where(filters.searchType, '<=', filters.searchTerm + '\uf8ff')
          )
        }
        const documentsSnapshot = await getDocs(documentsQuery)
        
        // Group by customer
        const customerMap = new Map<string, CustomerData>()
        
        for (const docSnap of documentsSnapshot.docs) {
          const docData = docSnap.data()
          
          // للوكيل: فلترة محلية بناءً على نوع البحث
          if (currentAgent && userData?.role === 'agent') {
            const searchValue = docData[filters.searchType]?.toString().toLowerCase() || ''
            const searchTerm = filters.searchTerm.toLowerCase()
            if (!searchValue.includes(searchTerm)) {
              continue // تخطي هذا المستند إذا لم يطابق البحث
            }
          }
          
          const customerId = docData.customerName + '_' + docData.customerPhone // Simple ID generation
          
          if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
              id: customerId,
              name: docData.customerName || 'غير محدد',
              phone: docData.customerPhone || 'غير محدد',
              nationalId: docData.customerNationalId || 'غير محدد',
              address: docData.customerAddress || 'غير محدد',
              sales: [],
              documents: [],
              totalPurchases: 0,
              lastPurchaseDate: undefined
            })
          }
          
          const customer = customerMap.get(customerId)!
          customer.documents.push({
            id: docSnap.id,
            ...docData,
            stages: docData.stages || []
          } as any)
        }
        
        searchResults = Array.from(customerMap.values())
        
      } else {
        // Search in document_tracking collection by customer info or invoice number
        let searchField = ''
        switch (filters.searchType) {
          case 'name':
            searchField = 'customerName'
            break
          case 'phone':
            searchField = 'customerPhone'
            break
          case 'nationalId':
            searchField = 'customerNationalId'
            break
          case 'invoiceNumber':
            searchField = 'invoiceNumber'
            break
        }
        
        if (searchField) {
          let documentsQuery
          if (currentAgent && userData?.role === 'agent') {
            // للوكيل: أولاً جلب جميع وثائقه، ثم فلترة محلياً
            documentsQuery = query(
              collection(db, 'document_tracking'),
              where('agentId', '==', currentAgent.id)
            )
          } else {
            // للمديرين: عرض جميع العملاء
            documentsQuery = query(
              collection(db, 'document_tracking'),
              where(searchField, '>=', filters.searchTerm),
              where(searchField, '<=', filters.searchTerm + '\uf8ff')
            )
          }
          const documentsSnapshot = await getDocs(documentsQuery)
          
          // Group by customer
          const customerMap = new Map<string, CustomerData>()
          
          for (const docSnap of documentsSnapshot.docs) {
            const docData = docSnap.data()
            
            // للوكيل: فلترة محلية بناءً على نوع البحث
            if (currentAgent && userData?.role === 'agent') {
              const searchValue = docData[searchField]?.toString().toLowerCase() || ''
              const searchTerm = filters.searchTerm.toLowerCase()
              if (!searchValue.includes(searchTerm)) {
                continue // تخطي هذا المستند إذا لم يطابق البحث
              }
            }
            
            const customerId = docData.customerName + '_' + docData.customerPhone
            
            if (!customerMap.has(customerId)) {
              customerMap.set(customerId, {
                id: customerId,
                name: docData.customerName || 'غير محدد',
                phone: docData.customerPhone || 'غير محدد',
                nationalId: docData.customerNationalId || 'غير محدد',
                address: docData.customerAddress || 'غير محدد',
                sales: [],
                documents: [],
                totalPurchases: 0,
                lastPurchaseDate: undefined
              })
            }
            
            const customer = customerMap.get(customerId)!
            customer.documents.push({
              id: docSnap.id,
              ...docData,
              stages: docData.stages || []
            } as any)
            
            // Add sale price to total purchases
            if (docData.salePrice) {
              customer.totalPurchases += docData.salePrice
            }
            
            // Update last purchase date
            if (docData.createdAt) {
              const purchaseDate = docData.createdAt.toDate()
              if (!customer.lastPurchaseDate || purchaseDate > customer.lastPurchaseDate) {
                customer.lastPurchaseDate = purchaseDate
              }
            }
          }
          
          searchResults = Array.from(customerMap.values())
        }
      }
      
      setCustomers(searchResults)
      
    } catch (error) {
      console.error('Error searching customers:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchCustomers()
  }

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const exportCustomerData = (customer: CustomerData) => {
    // Mock export functionality
    const data = {
      customer: {
        name: customer.name,
        phone: customer.phone,
        nationalId: customer.nationalId,
        address: customer.address
      },
      sales: customer.sales,
      documents: customer.documents,
      summary: {
        totalPurchases: customer.totalPurchases,
        lastPurchaseDate: customer.lastPurchaseDate
      }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customer-${customer.name}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // All authenticated users can access customer inquiry (super_admin, admin, agent, showroom_user)
  const canAccessInquiry = userData && ['super_admin', 'admin', 'agent', 'showroom_user'].includes(userData.role)

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (!canAccessInquiry) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          غير مصرح لك بالوصول
        </h2>
        <p className="text-gray-600 arabic-text">
          ليس لديك صلاحية للوصول لنظام الاستعلام عن العملاء
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 arabic-text">الاستعلام عن العملاء</h1>
        <p className="text-gray-600 arabic-text">البحث في بيانات العملاء ومعاملاتهم للاستخدام الداخلي</p>
        {userData?.role === 'agent' && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 arabic-text">
              📋 كوكيل، يمكنك رؤية العملاء الذين اشتروا منك فقط
            </p>
          </div>
        )}
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Search className="h-5 w-5" />
            البحث في بيانات العملاء
          </CardTitle>
          <CardDescription className="arabic-text">
            ابحث عن العملاء باستخدام معايير مختلفة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  نوع البحث
                </label>
                <select
                  value={filters.searchType}
                  onChange={(e) => handleFilterChange('searchType', e.target.value)}
                  className="w-full form-input input-rtl arabic-text"
                >
                  <option value="name">الاسم</option>
                  <option value="phone">رقم الهاتف</option>
                  <option value="nationalId">الرقم القومي</option>
                  <option value="invoiceNumber">رقم الفاتورة</option>
                  <option value="motorFingerprint">بصمة الموتور</option>
                  <option value="chassisNumber">رقم الشاسيه</option>
                </select>
              </div>

              {/* Search Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  كلمة البحث
                </label>
                <Input
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  placeholder="أدخل كلمة البحث..."
                  className="input-rtl arabic-text"
                />
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <Button type="submit" disabled={loading || !filters.searchTerm.trim()} className="w-full">
                  {loading ? (
                    <>
                      <LoadingSpinner className="ml-2 h-4 w-4" />
                      جاري البحث...
                    </>
                  ) : (
                    <>
                      <Search className="ml-2 h-4 w-4" />
                      بحث
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {customers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="arabic-text">نتائج البحث ({customers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className={cn(
                    'p-4 border rounded-lg cursor-pointer transition-colors',
                    selectedCustomer?.id === customer.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <h3 className="font-medium text-gray-900 arabic-text">{customer.name}</h3>
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{customer.sales.length} عملية شراء</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{customer.documents.length} وثيقة</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="arabic-text">
                            آخر شراء: {customer.lastPurchaseDate ? formatDate(customer.lastPurchaseDate) : 'لا يوجد'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(customer)}>
                        <Eye className="h-4 w-4" />
                        عرض
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => exportCustomerData(customer)}>
                        <Download className="h-4 w-4" />
                        تصدير
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Details */}
      {selectedCustomer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 arabic-text">
                <User className="h-5 w-5" />
                معلومات العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm arabic-text">
                    <strong>الاسم:</strong> {selectedCustomer.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    <strong>الهاتف:</strong> {selectedCustomer.phone}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    <strong>الرقم القومي:</strong> {selectedCustomer.nationalId}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm arabic-text">
                    <strong>العنوان:</strong> {selectedCustomer.address}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3 arabic-text">ملخص المعاملات</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{selectedCustomer.sales.length}</p>
                    <p className="text-sm text-gray-600 arabic-text">عمليات الشراء</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedCustomer.totalPurchases)}</p>
                    <p className="text-sm text-gray-600 arabic-text">إجمالي المشتريات</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales & Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 arabic-text">
                <Package className="h-5 w-5" />
                المبيعات والوثائق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Sales */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 arabic-text">عمليات الشراء</h3>
                  <div className="space-y-3">
                    {selectedCustomer.sales.map((sale) => (
                      <div key={sale.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{sale.invoiceNumber || 'غير محدد'}</p>
                            <p className="text-sm text-gray-600">
                              بصمة الموتور: {sale.items?.[0]?.motorFingerprint || 'غير محدد'}
                            </p>
                            <p className="text-sm text-gray-500">{formatDate(sale.createdAt?.toDate?.() || sale.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{formatCurrency(sale.totalAmount)}</p>
                            <p className="text-sm text-gray-600 arabic-text">الوكيل: {sale.agentName}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 arabic-text">الوثائق</h3>
                  <div className="space-y-3">
                    {selectedCustomer.documents.map((doc) => (
                      <div key={doc.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              بصمة الموتور: {doc.motorFingerprint}
                            </p>
                            <p className="text-sm text-gray-600 arabic-text">
                              الحالة: {doc.status === 'completed' ? 'مكتملة' : 
                                     doc.status === 'submitted_to_manufacturer' ? 'تم الإرسال للشركة' : 
                                     doc.status === 'received_from_manufacturer' ? 'تم الاستلام من الشركة' :
                                     doc.status === 'sent_to_point_of_sale' ? 'تم الإرسال لنقطة البيع' :
                                     doc.status === 'pending_submission' ? 'في انتظار الإرسال' : 'غير محدد'}
                            </p>
                            <p className="text-sm text-gray-500">{formatDate(doc.createdAt?.toDate?.() || doc.createdAt)}</p>
                          </div>
                          <div className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                            doc.status === 'submitted_to_manufacturer' ? 'bg-blue-100 text-blue-800' :
                            doc.status === 'received_from_manufacturer' ? 'bg-purple-100 text-purple-800' :
                            doc.status === 'sent_to_point_of_sale' ? 'bg-indigo-100 text-indigo-800' :
                            doc.status === 'pending_submission' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          )}>
                            {doc.status === 'completed' ? 'مكتملة' : 
                             doc.status === 'submitted_to_manufacturer' ? 'تم الإرسال للشركة' : 
                             doc.status === 'received_from_manufacturer' ? 'تم الاستلام من الشركة' :
                             doc.status === 'sent_to_point_of_sale' ? 'تم الإرسال لنقطة البيع' :
                             doc.status === 'pending_submission' ? 'في انتظار الإرسال' : 'غير محدد'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Results */}
      {!loading && customers.length === 0 && filters.searchTerm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد نتائج
            </h3>
            <p className="text-gray-500 arabic-text">
              لم يتم العثور على عملاء يطابقون معايير البحث المحددة
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

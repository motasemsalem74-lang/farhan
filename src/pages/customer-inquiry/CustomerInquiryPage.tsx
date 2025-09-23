import React, { useState, useEffect } from 'react'
import { 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Eye, 
  FileText, 
  Car,
  Camera,
  CreditCard,
  Building,
  UserCheck,
  Clock,
  Package,
  ArrowRight,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from '@/lib/utils'

// Badge component inline
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/firebase/firebase-config.template'
import { useUserData } from '@/hooks/useUserData'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface CustomerSale {
  id: string
  customerName: string
  customerPhone: string
  customerNationalId: string
  customerAddress: string
  customerIdImageUrl?: string
  salePrice: string | number
  purchasePrice: string | number
  profit: number
  agentName: string
  agentId: string
  motorBrand: string
  motorModel: string
  motorFingerprint: string
  chassisNumber: string
  createdAt: any
  updatedAt: any
  status: string
  motorFingerprintImageUrl?: string
  chassisNumberImageUrl?: string
  combinedImageUrl?: string
  warehouseName?: string
  agentCommission: number
  companyShare: number
}

interface CustomerDetails {
  name: string
  phone: string
  nationalId: string
  address: string
  idImageUrl?: string
  totalPurchases: number
  totalSpent: number
  lastPurchaseDate: any
  sales: CustomerSale[]
}

export function CustomerInquiryPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<'name' | 'phone' | 'nationalId'>('name')
  const [customers, setCustomers] = useState<CustomerDetails[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const searchCustomers = async () => {
    if (!searchTerm.trim()) {
      toast.error('يرجى إدخال كلمة البحث')
      return
    }

    try {
      setLoading(true)
      console.log('🔍 Searching for customers with term:', searchTerm, 'type:', searchType)

      // البحث في مجموعات المبيعات المختلفة
      const searchQueries = []
      
      // البحث في document_tracking
      const docTrackingQuery = query(
        collection(db, 'document_tracking'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      
      // البحث في sales
      const salesQuery = query(
        collection(db, 'sales'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )

      const [docTrackingSnapshot, salesSnapshot] = await Promise.all([
        getDocs(docTrackingQuery),
        getDocs(salesQuery)
      ])

      // جمع جميع المبيعات
      const allSales: CustomerSale[] = []
      
      docTrackingSnapshot.docs.forEach(doc => {
        const data = doc.data()
        allSales.push({ id: doc.id, ...data } as CustomerSale)
      })
      
      salesSnapshot.docs.forEach(doc => {
        const data = doc.data()
        allSales.push({ id: doc.id, ...data } as CustomerSale)
      })

      console.log('📊 Total sales found:', allSales.length)

      // فلترة النتائج حسب نوع البحث
      const filteredSales = allSales.filter(sale => {
        const searchLower = searchTerm.toLowerCase().trim()
        
        switch (searchType) {
          case 'name':
            return sale.customerName?.toLowerCase().includes(searchLower)
          case 'phone':
            return sale.customerPhone?.includes(searchTerm.trim())
          case 'nationalId':
            return sale.customerNationalId?.includes(searchTerm.trim())
          default:
            return false
        }
      })

      console.log('🔍 Filtered sales:', filteredSales.length)

      // تجميع المبيعات حسب العميل
      const customerMap = new Map<string, CustomerDetails>()

      filteredSales.forEach(sale => {
        const key = `${sale.customerName}_${sale.customerPhone}_${sale.customerNationalId}`
        
        if (customerMap.has(key)) {
          const customer = customerMap.get(key)!
          customer.sales.push(sale)
          customer.totalPurchases += 1
          customer.totalSpent += typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) || 0 : (sale.salePrice || 0)
          
          // تحديث تاريخ آخر شراء
          if (sale.createdAt && (!customer.lastPurchaseDate || sale.createdAt.seconds > customer.lastPurchaseDate.seconds)) {
            customer.lastPurchaseDate = sale.createdAt
          }
        } else {
          const salePrice = typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) || 0 : (sale.salePrice || 0)
          
          customerMap.set(key, {
            name: sale.customerName || 'غير محدد',
            phone: sale.customerPhone || 'غير محدد',
            nationalId: sale.customerNationalId || 'غير محدد',
            address: sale.customerAddress || 'غير محدد',
            idImageUrl: sale.customerIdImageUrl || (sale as any).documents?.idCard?.imageUrl || null,
            totalPurchases: 1,
            totalSpent: salePrice,
            lastPurchaseDate: sale.createdAt,
            sales: [sale]
          })
        }
      })

      const customersArray = Array.from(customerMap.values())
      console.log('👥 Customers found:', customersArray.length)

      setCustomers(customersArray)
      
      if (customersArray.length === 0) {
        toast.info('لم يتم العثور على عملاء بهذا البحث')
      } else {
        toast.success(`تم العثور على ${customersArray.length} عميل`)
      }

    } catch (error) {
      console.error('❌ Error searching customers:', error)
      toast.error('حدث خطأ أثناء البحث عن العملاء')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerSelect = (customer: CustomerDetails) => {
    setSelectedCustomer(customer)
    setShowDetails(true)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'غير محدد'
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return 'تاريخ غير صحيح'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">مكتمل</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">قيد المعالجة</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">ملغي</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status || 'غير محدد'}</Badge>
    }
  }

  // دوال الإجراءات
  const handleViewSaleDetails = (sale: CustomerSale) => {
    // فتح صفحة تفاصيل البيع
    window.open(`/sales/details/${sale.id}`, '_blank')
  }

  const handlePrintInvoice = (sale: CustomerSale) => {
    // طباعة الفاتورة
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة بيع - ${sale.customerName}</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; text-align: right; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .info { margin: 10px 0; }
            .label { font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>فاتورة بيع</h1>
            <h2>مؤسسة أبو فرحان للنقل الخفيف</h2>
          </div>
          <div class="info"><span class="label">اسم العميل:</span> ${sale.customerName}</div>
          <div class="info"><span class="label">رقم الهاتف:</span> ${sale.customerPhone}</div>
          <div class="info"><span class="label">الرقم القومي:</span> ${sale.customerNationalId}</div>
          <div class="info"><span class="label">العنوان:</span> ${sale.customerAddress}</div>
          <div class="info"><span class="label">نوع المركبة:</span> ${sale.motorBrand} ${sale.motorModel}</div>
          <div class="info"><span class="label">رقم الشاسيه:</span> ${sale.chassisNumber}</div>
          <div class="info"><span class="label">رقم المحرك:</span> ${sale.motorFingerprint}</div>
          <div class="info"><span class="label">سعر البيع:</span> ${formatCurrency(typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) || 0 : (sale.salePrice || 0))}</div>
          <div class="info"><span class="label">اسم الوكيل:</span> ${sale.agentName}</div>
          <div class="info"><span class="label">تاريخ البيع:</span> ${formatDate(sale.createdAt)}</div>
          <div class="footer">
            <p>شكراً لتعاملكم معنا</p>
            <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleDownloadImages = async (sale: CustomerSale) => {
    try {
      const images = []
      if (sale.motorFingerprintImageUrl) images.push({ url: sale.motorFingerprintImageUrl, name: 'motor-fingerprint.jpg' })
      if (sale.chassisNumberImageUrl) images.push({ url: sale.chassisNumberImageUrl, name: 'chassis-number.jpg' })
      if (sale.customerIdImageUrl) images.push({ url: sale.customerIdImageUrl, name: 'customer-id.jpg' })
      
      if (images.length === 0) {
        toast.info('لا توجد صور متاحة للتحميل')
        return
      }

      for (const image of images) {
        try {
          const response = await fetch(image.url)
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${sale.customerName}-${image.name}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        } catch (error) {
          console.error('Error downloading image:', error)
        }
      }
      
      toast.success(`تم تحميل ${images.length} صورة`)
    } catch (error) {
      console.error('Error downloading images:', error)
      toast.error('حدث خطأ أثناء تحميل الصور')
    }
  }

  const handleCreateNewSale = () => {
    if (!selectedCustomer) return
    
    // الانتقال لصفحة بيع جديد مع بيانات العميل المحددة مسبقاً
    const customerData = {
      name: selectedCustomer.name,
      phone: selectedCustomer.phone,
      nationalId: selectedCustomer.nationalId,
      address: selectedCustomer.address
    }
    
    // حفظ بيانات العميل في localStorage للاستخدام في صفحة البيع الجديد
    localStorage.setItem('prefilledCustomer', JSON.stringify(customerData))
    
    // فتح صفحة بيع جديد
    window.open('/sales/new', '_blank')
    toast.success('تم فتح صفحة بيع جديد مع بيانات العميل')
  }

  const handleExportCustomerData = () => {
    if (!selectedCustomer) return

    try {
      const exportData = {
        customerInfo: {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          nationalId: selectedCustomer.nationalId,
          address: selectedCustomer.address,
          totalPurchases: selectedCustomer.totalPurchases,
          totalSpent: selectedCustomer.totalSpent,
          lastPurchaseDate: formatDate(selectedCustomer.lastPurchaseDate)
        },
        salesHistory: selectedCustomer.sales.map(sale => ({
          date: formatDate(sale.createdAt),
          motorBrand: sale.motorBrand,
          motorModel: sale.motorModel,
          chassisNumber: sale.chassisNumber,
          motorFingerprint: sale.motorFingerprint,
          salePrice: typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) || 0 : (sale.salePrice || 0),
          agentName: sale.agentName,
          status: sale.status
        }))
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customer-data-${selectedCustomer.name}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('تم تصدير بيانات العميل بنجاح')
    } catch (error) {
      console.error('Error exporting customer data:', error)
      toast.error('حدث خطأ أثناء تصدير البيانات')
    }
  }

  const handleCallCustomer = () => {
    if (!selectedCustomer?.phone) {
      toast.error('رقم الهاتف غير متاح')
      return
    }
    
    // فتح تطبيق الهاتف
    window.location.href = `tel:${selectedCustomer.phone}`
    toast.info(`جاري الاتصال بـ ${selectedCustomer.name}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 arabic-text">استعلام العملاء</h1>
            <p className="text-gray-600 arabic-text">البحث الشامل عن العملاء وتفاصيل مشترياتهم</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Search className="h-5 w-5 text-blue-600" />
            البحث عن العملاء
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 arabic-text">نوع البحث</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="w-full form-input input-rtl arabic-text rounded-md border-gray-300"
              >
                <option value="name">البحث بالاسم</option>
                <option value="phone">البحث بالهاتف</option>
                <option value="nationalId">البحث بالرقم القومي</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700 arabic-text">
                {searchType === 'name' ? 'اسم العميل' : 
                 searchType === 'phone' ? 'رقم الهاتف' : 'الرقم القومي'}
              </label>
              <Input
                placeholder={
                  searchType === 'name' ? 'أدخل اسم العميل...' :
                  searchType === 'phone' ? 'أدخل رقم الهاتف...' : 'أدخل الرقم القومي...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-rtl arabic-text"
                onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
              />
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button 
                onClick={searchCustomers} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
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
        </CardContent>
      </Card>

      {/* Search Results */}
      {customers.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="arabic-text flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              نتائج البحث ({customers.length} عميل)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((customer, index) => (
                <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleCustomerSelect(customer)}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-gray-900 arabic-text">{customer.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span className="arabic-text">{customer.phone}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CreditCard className="h-4 w-4" />
                        <span className="arabic-text">{customer.nationalId}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="h-4 w-4" />
                        <span className="arabic-text">{customer.totalPurchases} مشتريات</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="arabic-text">{formatCurrency(customer.totalSpent)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span className="arabic-text">{formatDate(customer.lastPurchaseDate)}</span>
                      </div>
                      
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        <Eye className="ml-2 h-4 w-4" />
                        عرض التفاصيل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Details Modal */}
      {showDetails && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 arabic-text">
                  تفاصيل العميل: {selectedCustomer.name}
                </h2>
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="arabic-text flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    معلومات العميل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 arabic-text">الاسم</label>
                      <p className="text-gray-900 arabic-text">{selectedCustomer.name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 arabic-text">الهاتف</label>
                      <p className="text-gray-900">{selectedCustomer.phone}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 arabic-text">الرقم القومي</label>
                      <p className="text-gray-900">{selectedCustomer.nationalId}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 arabic-text">العنوان</label>
                      <p className="text-gray-900 arabic-text">{selectedCustomer.address}</p>
                    </div>
                  </div>
                  
                  {selectedCustomer.idImageUrl && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-600 arabic-text">صورة الهوية</label>
                      <img 
                        src={selectedCustomer.idImageUrl} 
                        alt="صورة الهوية" 
                        className="mt-2 max-w-xs rounded-lg shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(selectedCustomer.idImageUrl!)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Purchase Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="arabic-text flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    ملخص المشتريات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        <span className="text-sm text-blue-600 arabic-text">إجمالي المشتريات</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{selectedCustomer.totalPurchases}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-600 arabic-text">إجمالي المبلغ</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(selectedCustomer.totalSpent)}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <span className="text-sm text-purple-600 arabic-text">آخر شراء</span>
                      </div>
                      <p className="text-lg font-bold text-purple-900 arabic-text">{formatDate(selectedCustomer.lastPurchaseDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sales History */}
              <Card>
                <CardHeader>
                  <CardTitle className="arabic-text flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    تاريخ المبيعات ({selectedCustomer.sales.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedCustomer.sales.map((sale, index) => (
                      <Card key={sale.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Sale Info */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900 arabic-text">معلومات البيع</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="arabic-text">{formatDate(sale.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-gray-500" />
                                  <span className="arabic-text">{formatCurrency(typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) || 0 : (sale.salePrice || 0))}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <UserCheck className="h-4 w-4 text-gray-500" />
                                  <span className="arabic-text">{sale.agentName || 'غير محدد'}</span>
                                </div>
                                {getStatusBadge(sale.status)}
                              </div>
                            </div>

                            {/* Vehicle Info */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900 arabic-text">معلومات المركبة</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <Car className="h-4 w-4 text-gray-500" />
                                  <span className="arabic-text">{sale.motorBrand} {sale.motorModel}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-gray-500" />
                                  <span>{sale.chassisNumber}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-gray-500" />
                                  <span>{sale.motorFingerprint}</span>
                                </div>
                              </div>
                            </div>

                            {/* Images */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900 arabic-text">الصور</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {(sale.motorFingerprintImageUrl || (sale as any).documents?.motorFingerprint?.imageUrl) && (
                                  <img 
                                    src={sale.motorFingerprintImageUrl || (sale as any).documents?.motorFingerprint?.imageUrl} 
                                    alt="صورة المحرك" 
                                    className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setSelectedImage(sale.motorFingerprintImageUrl || (sale as any).documents?.motorFingerprint?.imageUrl)}
                                  />
                                )}
                                {(sale.chassisNumberImageUrl || (sale as any).documents?.chassisNumber?.imageUrl) && (
                                  <img 
                                    src={sale.chassisNumberImageUrl || (sale as any).documents?.chassisNumber?.imageUrl} 
                                    alt="رقم الشاسيه" 
                                    className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setSelectedImage(sale.chassisNumberImageUrl || (sale as any).documents?.chassisNumber?.imageUrl)}
                                  />
                                )}
                                {((sale as any).documents?.idCard?.imageUrl || sale.customerIdImageUrl) && (
                                  <img 
                                    src={(sale as any).documents?.idCard?.imageUrl || sale.customerIdImageUrl} 
                                    alt="بطاقة الهوية" 
                                    className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setSelectedImage((sale as any).documents?.idCard?.imageUrl || sale.customerIdImageUrl)}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900 arabic-text">الإجراءات</h4>
                              <div className="space-y-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => handleViewSaleDetails(sale)}
                                >
                                  <Eye className="ml-2 h-4 w-4" />
                                  عرض التفاصيل
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => handlePrintInvoice(sale)}
                                >
                                  <FileText className="ml-2 h-4 w-4" />
                                  طباعة الفاتورة
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => handleDownloadImages(sale)}
                                >
                                  <Download className="ml-2 h-4 w-4" />
                                  تحميل الصور
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Related Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="arabic-text flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-indigo-600" />
                    الإجراءات المرتبطة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleCreateNewSale}
                    >
                      <FileText className="ml-2 h-4 w-4" />
                      إنشاء بيع جديد
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleExportCustomerData}
                    >
                      <Download className="ml-2 h-4 w-4" />
                      تصدير بيانات العميل
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleCallCustomer}
                    >
                      <Phone className="ml-2 h-4 w-4" />
                      الاتصال بالعميل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img 
              src={selectedImage} 
              alt="صورة مكبرة" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button 
              variant="outline" 
              size="sm"
              className="absolute top-4 right-4 bg-white hover:bg-gray-100"
              onClick={() => setSelectedImage(null)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
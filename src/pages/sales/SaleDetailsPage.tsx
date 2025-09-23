import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  User,
  Package,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Phone,
  MapPin,
  Hash
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SafeImageDisplay } from '@/components/ui/SafeImageDisplay'
import { CompositeImageDisplay } from '@/components/ui/CompositeImageDisplay'
import { useUserData } from '@/hooks/useUserData'
import { Transaction, DocumentTracking } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function SaleDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [sale, setSale] = useState<Transaction | null>(null)
  const [documentTracking, setDocumentTracking] = useState<DocumentTracking[]>([])
  const [loading, setLoading] = useState(true)
  const isLoadingRef = useRef(false)

  console.log('SaleDetailsPage render - loading:', loading, 'sale:', !!sale, 'id:', id)

  // Force stop loading after 5 seconds no matter what
  useEffect(() => {
    const forceTimeout = setTimeout(() => {
      console.log('Force stopping loading after 5 seconds')
      setLoading(false)
    }, 5000)
    
    return () => clearTimeout(forceTimeout)
  }, [])

  useEffect(() => {
    console.log('useEffect triggered - id:', id, 'userData:', !!userData, 'user:', !!user)
    
    if (!id) {
      console.log('No ID provided, stopping loading')
      setLoading(false)
      return
    }
    
    if (!user) {
      console.log('No user, stopping loading')
      setLoading(false)
      return
    }
    
    // Only load if we don't already have sale data and not currently loading
    if (sale || isLoadingRef.current) {
      console.log('Sale data already loaded or currently loading, skipping')
      if (sale) setLoading(false)
      return
    }
    
    // Set loading flag
    isLoadingRef.current = true
    
    // Load data immediately, don't wait for userData
    console.log('Loading data immediately...')
    console.log('About to call loadSaleDetails()')
    loadSaleDetails()
    console.log('About to call loadDocumentTracking()')
    loadDocumentTracking()
    console.log('Both functions called')
  }, [id, user, sale])

  const loadSaleDetails = async () => {
    if (!id) {
      console.log('loadSaleDetails: No ID, setting loading false')
      setLoading(false)
      return
    }
    
    try {
      console.log('Loading sale details for ID:', id)
      
      // Add timeout for Firebase call (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase timeout')), 30000)
      })
      
      // Load real data from document_tracking collection
      const docRef = doc(db, 'document_tracking', id)
      const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]) as any
      
      if (!docSnap.exists()) {
        console.log('No sale found with ID:', id)
        setSale(null)
        setLoading(false)
        return
      }
      
      const saleData = docSnap.data()
      console.log('Loaded sale data:', saleData)
      
      // Safely handle date conversion
      let saleDate = new Date()
      try {
        if (saleData.createdAt && typeof saleData.createdAt.toDate === 'function') {
          saleDate = saleData.createdAt.toDate()
        } else if (saleData.createdAt && saleData.createdAt instanceof Date) {
          saleDate = saleData.createdAt
        } else if (saleData.createdAt) {
          saleDate = new Date(saleData.createdAt)
        }
      } catch (dateError) {
        console.warn('Error parsing date, using current date:', dateError)
      }
      
      // Convert document_tracking data to Transaction format
      const transaction: Transaction = {
        id: docSnap.id,
        type: 'sale_to_customer',
        date: saleDate as any,
        userId: saleData.createdBy || saleData.agentId || 'unknown',
        referenceNumber: saleData.saleTransactionId || saleData.id || docSnap.id,
        items: [{
          inventoryItemId: saleData.inventoryItemId || '',
          motorFingerprint: saleData.motorFingerprint || '',
          chassisNumber: saleData.chassisNumber || '',
          salePrice: Number(saleData.salePrice) || 0,
          agentCommissionPercentage: Number(saleData.agentCommissionPercentage) || 0,
          ...(saleData.purchasePrice && { purchasePrice: Number(saleData.purchasePrice) }),
          motorFingerprintImageUrl: saleData.motorFingerprintImageUrl || null,
          chassisNumberImageUrl: saleData.chassisNumberImageUrl || null
        } as any],
        totalAmount: Number(saleData.salePrice) || 0,
        fromWarehouseId: saleData.fromWarehouseId || '',
        details: {
          customer: {
            name: saleData.customerName || 'غير محدد',
            phone: saleData.customerPhone || '',
            address: saleData.customerAddress || '',
            nationalId: saleData.customerNationalId || '',
            idCardFrontImageUrl: saleData.idCardImageUrl || saleData.customerIdImageUrl || saleData.customerIdImage || null,
            idCardBackImageUrl: saleData.idCardBackImageUrl || null,
            idIssuanceDate: saleData.customerIdIssuanceDate || null,
            idExpiryDate: saleData.customerIdExpiryDate || null
          },
          notes: saleData.notes || ''
        },
        createdAt: saleDate as any,
        updatedAt: saleData.updatedAt || saleDate as any
      }
      
      console.log('Converted transaction:', transaction)
      setSale(transaction)
      console.log('Sale data loaded successfully')
    } catch (error) {
      console.error('Error loading sale details:', error)
      setSale(null)
      setLoading(false)
    } finally {
      console.log('Finally block: Setting loading to false')
      isLoadingRef.current = false
      setLoading(false)
    }
  }

  const loadDocumentTracking = async () => {
    if (!id) return
    
    try {
      console.log('Loading document tracking for ID:', id)
      
      // Load the same document as it contains all tracking info
      const docRef = doc(db, 'document_tracking', id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const docData = docSnap.data()
        console.log('Loaded document tracking data:', docData)
        
        // Safely handle date conversion for tracking
        let createdDate = new Date()
        let updatedDate = new Date()
        
        try {
          if (docData.createdAt && typeof docData.createdAt.toDate === 'function') {
            createdDate = docData.createdAt.toDate()
          } else if (docData.createdAt && docData.createdAt instanceof Date) {
            createdDate = docData.createdAt
          } else if (docData.createdAt) {
            createdDate = new Date(docData.createdAt)
          }
          
          if (docData.updatedAt && typeof docData.updatedAt.toDate === 'function') {
            updatedDate = docData.updatedAt.toDate()
          } else if (docData.updatedAt && docData.updatedAt instanceof Date) {
            updatedDate = docData.updatedAt
          } else if (docData.updatedAt) {
            updatedDate = new Date(docData.updatedAt)
          } else {
            updatedDate = createdDate
          }
        } catch (dateError) {
          console.warn('Error parsing tracking dates:', dateError)
        }
        
        // Create DocumentTracking object from the data
        const tracking: DocumentTracking = {
          id: docSnap.id,
          saleTransactionId: docData.saleTransactionId || docSnap.id,
          customerName: docData.customerName || 'غير محدد',
          motorFingerprint: docData.motorFingerprint || '',
          chassisNumber: docData.chassisNumber || '',
          status: docData.status || 'pending_submission',
          stages: Array.isArray(docData.stages) ? docData.stages : [],
          combinedImageUrl: docData.combinedImageUrl || null,
          createdAt: createdDate as any,
          updatedAt: updatedDate as any,
          updatedBy: docData.updatedBy || docData.createdBy || 'unknown'
        }
        
        console.log('Converted document tracking:', tracking)
        setDocumentTracking([tracking])
      } else {
        console.log('No document tracking found')
      }
    } catch (error) {
      console.error('Error loading document tracking:', error)
    } finally {
      console.log('Document tracking loading completed')
      setDocumentTracking([])
    }
  }

  const calculateProfit = () => {
    if (!sale) return 0
    // Calculate profit from real data
    const salePrice = sale.totalAmount || 0
    const purchasePrice = (sale.items[0] as any)?.purchasePrice || 0
    return salePrice - purchasePrice
  }

  const calculateAgentCommission = () => {
    if (!sale || !sale.items[0]?.agentCommissionPercentage) return 0
    const profit = calculateProfit()
    return (profit * sale.items[0].agentCommissionPercentage) / 100
  }

  const getDocumentStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_submission': return 'في انتظار الإرسال'
      case 'submitted_to_manufacturer': return 'تم الإرسال للشركة المصنعة'
      case 'received_from_manufacturer': return 'تم الاستلام من الشركة'
      case 'sent_to_point_of_sale': return 'تم الإرسال لنقطة البيع'
      case 'completed': return 'مكتمل'
      default: return status
    }
  }

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'pending_submission': return 'bg-yellow-100 text-yellow-800'
      case 'submitted_to_manufacturer': return 'bg-blue-100 text-blue-800'
      case 'received_from_manufacturer': return 'bg-purple-100 text-purple-800'
      case 'sent_to_point_of_sale': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePrintInvoice = () => {
    // Implement print functionality
    window.print()
  }

  const handleDownloadPDF = () => {
    // Implement PDF download functionality
    console.log('Download PDF')
  }

  // Simple loading check
  if (loading) {
    return <LoadingSpinner text="جاري تحميل تفاصيل الفاتورة..." />
  }

  // If no sale found after loading
  if (!sale) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4 arabic-text">
          لم يتم العثور على الفاتورة
        </h2>
        <p className="text-gray-600 mb-4 arabic-text">
          معرف الفاتورة: {id || 'غير محدد'}
        </p>
        <div className="space-x-2">
          <Button onClick={() => navigate('/sales')}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة للمبيعات
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            إعادة تحميل
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">
            فاتورة رقم {sale.referenceNumber}
          </h1>
          <p className="text-gray-600 arabic-text">
            تاريخ الإنشاء: {formatDate(sale.date as any)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePrintInvoice}>
            <FileText className="ml-2 h-4 w-4" />
            طباعة
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="ml-2 h-4 w-4" />
            تحميل PDF
          </Button>
          <Button variant="outline" onClick={() => navigate('/sales')}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                بيانات العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">الاسم</p>
                      <p className="font-medium arabic-text">{sale.details.customer?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">رقم الهاتف</p>
                      <p className="font-medium">{sale.details.customer?.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">العنوان</p>
                      <p className="font-medium arabic-text">{sale.details.customer?.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">الرقم القومي</p>
                      <p className="font-medium">{sale.details.customer?.nationalId}</p>
                    </div>
                  </div>
                </div>

                {/* ID Card Images */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-2">صورة بطاقة الهوية</p>
                    <SafeImageDisplay
                      imageUrl={sale.details.customer?.idCardFrontImageUrl}
                      alt="بطاقة الهوية"
                      title="بطاقة الهوية"
                    />
                  </div>
                  
                  {sale.details.customer?.idCardBackImageUrl && (
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-2">بطاقة الهوية (الوجه الخلفي)</p>
                      <SafeImageDisplay
                        imageUrl={sale.details.customer.idCardBackImageUrl}
                        alt="بطاقة الهوية (الوجه الخلفي)"
                        title="بطاقة الهوية (الوجه الخلفي)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                تفاصيل الأصناف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sale.items.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Text Information */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600">بصمة الموتور</p>
                          <p className="font-mono font-medium">{item.motorFingerprint}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">رقم الشاسيه</p>
                          <p className="font-mono font-medium">{item.chassisNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">سعر البيع</p>
                          <p className="font-bold text-lg">{formatCurrency(item.salePrice || 0)}</p>
                        </div>
                        {item.agentCommissionPercentage && (
                          <div>
                            <p className="text-sm text-gray-600">نسبة العمولة</p>
                            <p className="font-medium">{item.agentCommissionPercentage}%</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Motor Fingerprint Image */}
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 font-medium">صورة بصمة الموتور</p>
                        <SafeImageDisplay
                          imageUrl={(item as any)?.motorFingerprintImageUrl}
                          alt="بصمة الموتور"
                          title="بصمة الموتور"
                        />
                      </div>
                      
                      {/* Chassis Number Image */}
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 font-medium">صورة رقم الشاسيه</p>
                        <SafeImageDisplay
                          imageUrl={(item as any)?.chassisNumberImageUrl}
                          alt="رقم الشاسيه"
                          title="رقم الشاسيه"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Document Tracking */}
          {documentTracking.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  تتبع الجواب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documentTracking.map((doc) => (
                    <div key={doc.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium arabic-text">
                            جواب الموتوسيكل: {doc.motorFingerprint}
                          </p>
                          <p className="text-sm text-gray-600">
                            رقم الشاسيه: {doc.chassisNumber}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDocumentStatusColor(doc.status)}`}>
                          {getDocumentStatusLabel(doc.status)}
                        </span>
                      </div>

                      {/* Stages Timeline */}
                      <div className="space-y-3">
                        {doc.stages.map((stage, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="font-medium arabic-text">
                                {getDocumentStatusLabel(stage.status)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatDate(stage.date as any)}
                              </p>
                              {stage.notes && (
                                <p className="text-sm text-gray-500 arabic-text">
                                  {stage.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Combined Image */}
                      <CompositeImageDisplay
                        compositeImageUrl={doc.combinedImageUrl}
                        customerIdImage={(doc as any).documents?.idCard?.imageUrl || sale.details.customer?.idCardFrontImageUrl}
                        motorFingerprintImage={(doc as any).documents?.motorFingerprint?.imageUrl || (sale.items[0] as any)?.motorFingerprintImageUrl}
                        chassisNumberImage={(doc as any).documents?.chassisNumber?.imageUrl || (sale.items[0] as any)?.chassisNumberImageUrl}
                        customerName={doc.customerName || sale.details.customer?.name || 'عميل'}
                        saleDate={sale.date?.toDate ? sale.date.toDate() : (sale.date instanceof Date ? sale.date : new Date())}
                        showRegenerateButton={false}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                الملخص المالي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 arabic-text">إجمالي المبلغ:</span>
                  <span className="font-bold">{formatCurrency(sale.totalAmount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 arabic-text">إجمالي الربح:</span>
                  <span className="font-bold text-green-600">{formatCurrency(calculateProfit())}</span>
                </div>

                {sale.items[0]?.agentCommissionPercentage && (
                  <>
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 arabic-text">عمولة الوكيل:</span>
                        <span className="font-medium">{formatCurrency(calculateAgentCommission())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 arabic-text">نصيب المؤسسة:</span>
                        <span className="font-medium">{formatCurrency(calculateProfit() - calculateAgentCommission())}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sale Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                معلومات الفاتورة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">رقم الفاتورة</p>
                <p className="font-mono font-medium">{sale.referenceNumber}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">تاريخ الإنشاء</p>
                <p className="font-medium">{formatDate(sale.date as any)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">المخزن</p>
                <p className="font-medium arabic-text">
                  {sale.fromWarehouseId === 'main-warehouse' ? 'المخزن الرئيسي' : 
                   sale.fromWarehouseId === 'showroom-warehouse' ? 'مخزن المعرض' : 
                   'مخزن الوكيل'}
                </p>
              </div>

              {sale.details.notes && (
                <div>
                  <p className="text-sm text-gray-600">ملاحظات</p>
                  <p className="font-medium arabic-text">{sale.details.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

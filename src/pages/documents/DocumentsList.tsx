import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Plus,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Filter,
  Download,
  Share2,
  Truck,
  Package,
  Building
} from 'lucide-react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { useAuth } from '@/hooks/useAuth'
import { DocumentTracking } from '@/types'
import { formatDate, isAdmin, isSuperAdmin } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DocumentsFilters {
  search: string
  searchType: 'all' | 'motorFingerprint' | 'chassisNumber' | 'customerName' | 'agentName'
  status: 'all' | 'pending_submission' | 'submitted_to_manufacturer' | 'received_from_manufacturer' | 'sent_to_point_of_sale' | 'completed'
  agentId: string
  dateFrom: string
  dateTo: string
  sortBy: 'createdAt' | 'motorFingerprint' | 'customerName' | 'agentName'
  sortOrder: 'asc' | 'desc'
}

export function DocumentsList() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const { userData: authUserData } = useAuth()
  const [documents, setDocuments] = useState<DocumentTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<DocumentsFilters>({
    search: '',
    searchType: 'all',
    status: 'all',
    agentId: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  useEffect(() => {
    if (userData) {
      loadDocumentsData()
    }
  }, [userData, filters])

  const loadDocumentsData = async () => {
    try {
      setLoading(true)
      
      // Load real document tracking data from Firebase
      const documentsQuery = query(
        collection(db, 'document_tracking'),
        orderBy('createdAt', 'desc')
      )
      
      const snapshot = await getDocs(documentsQuery)
      let documentsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          // Ensure stages is always an array
          stages: data.stages || []
        }
      }) as DocumentTracking[]
      
      // إذا كان المستخدم وكيل، اعرض وثائقه فقط
      if (authUserData?.role === 'agent') {
        documentsData = documentsData.filter(doc => (doc as any).agentId === authUserData.id)
      }
      
      setDocuments(documentsData)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return doc.customerName.toLowerCase().includes(searchLower) ||
             doc.motorFingerprint.toLowerCase().includes(searchLower) ||
             doc.chassisNumber.toLowerCase().includes(searchLower)
    }
    
    if (filters.status && filters.status !== 'all') {
      return doc.status === filters.status
    }
    
    return true
  })

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1
    switch (filters.sortBy) {
      case 'motorFingerprint':
        return a.motorFingerprint.localeCompare(b.motorFingerprint) * order
      case 'customerName':
        return a.customerName.localeCompare(b.customerName) * order
      default:
        return ((a.createdAt as any) - (b.createdAt as any)) * order
    }
  })

  const handleFilterChange = (key: keyof DocumentsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const canManageDocuments = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))
  
  // Calculate statistics
  const totalDocuments = documents.length
  const pendingCount = documents.filter(doc => doc.status === 'pending_submission').length
  const inProgressCount = documents.filter(doc => doc.status === 'submitted_to_manufacturer' || doc.status === 'received_from_manufacturer').length
  const completedCount = documents.filter(doc => doc.status === 'completed').length

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">تتبع الوثائق (الجواب)</h1>
          <p className="text-gray-600 arabic-text">متابعة حالة وثائق الدراجات النارية</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageDocuments && (
            <Link to="/documents/create">
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة وثيقة جديدة
              </Button>
            </Link>
          )}
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
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الوثائق</p>
                <p className="text-2xl font-bold text-gray-900">{totalDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">في انتظار الإرسال</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">قيد المعالجة</p>
                <p className="text-2xl font-bold text-orange-600">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">مكتملة</p>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
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
                placeholder="البحث في الوثائق..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as DocumentsFilters['status'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending_submission">في انتظار الإرسال</option>
                <option value="submitted_to_manufacturer">تم الإرسال للمصنع</option>
                <option value="received_from_manufacturer">تم الاستلام من المصنع</option>
                <option value="sent_to_point_of_sale">تم الإرسال لنقطة البيع</option>
                <option value="completed">مكتمل</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as DocumentsFilters['sortBy'])}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="createdAt">تاريخ الإنشاء</option>
                <option value="motorFingerprint">بصمة الموتور</option>
                <option value="customerName">اسم العميل</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as DocumentsFilters['sortOrder'])}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="desc">الأحدث أولاً</option>
                <option value="asc">الأقدم أولاً</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="جاري تحميل الوثائق..." />
        </div>
      ) : sortedDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد وثائق
            </h3>
            <p className="text-gray-500 arabic-text">
              لا توجد وثائق تطابق معايير البحث المحددة
            </p>
            {canManageDocuments && (
              <div className="mt-6">
                <Link to="/documents/create">
                  <Button>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة وثيقة جديدة
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedDocuments.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentCard({ document }: { document: DocumentTracking }) {
  const navigate = useNavigate()
  
  const handleViewDetails = () => {
    navigate(`/documents/details/${document.id}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_submission':
        return 'bg-yellow-100 text-yellow-800'
      case 'submitted_to_manufacturer':
        return 'bg-blue-100 text-blue-800'
      case 'received_from_manufacturer':
        return 'bg-purple-100 text-purple-800'
      case 'sent_to_point_of_sale':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_submission':
        return 'في انتظار الإرسال'
      case 'submitted_to_manufacturer':
        return 'تم الإرسال للمصنع'
      case 'received_from_manufacturer':
        return 'تم الاستلام من المصنع'
      case 'sent_to_point_of_sale':
        return 'تم الإرسال لنقطة البيع'
      case 'completed':
        return 'مكتملة'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_submission':
        return <Clock className="h-4 w-4" />
      case 'submitted_to_manufacturer':
        return <FileText className="h-4 w-4" />
      case 'received_from_manufacturer':
        return <AlertCircle className="h-4 w-4" />
      case 'sent_to_point_of_sale':
        return <AlertCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Get the latest stage for display
  const latestStage = document.stages && document.stages.length > 0 ? document.stages[document.stages.length - 1] : null
  const isCompleted = document.status === 'completed'

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2', getStatusColor(document.status))}>
                {getStatusIcon(document.status)}
                {getStatusLabel(document.status)}
              </div>
              {isCompleted && (
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  مكتمل
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Vehicle Info */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2 arabic-text">معلومات الدراجة</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">بصمة الموتور:</span> {document.motorFingerprint}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">رقم الشاسيه:</span> {document.chassisNumber}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2 arabic-text">معلومات العميل</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 arabic-text">
                    <span className="font-medium">الاسم:</span> {document.customerName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">معرف البيع:</span> {document.saleTransactionId}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2 arabic-text">التواريخ</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 arabic-text">
                    <span className="font-medium">تاريخ الإنشاء:</span> {formatDate(document.createdAt.toDate())}
                  </p>
                  <p className="text-sm text-gray-600 arabic-text">
                    <span className="font-medium">آخر تحديث:</span> {formatDate(document.updatedAt.toDate())}
                  </p>
                  {latestStage && (
                    <p className="text-sm text-gray-600 arabic-text">
                      <span className="font-medium">آخر مرحلة:</span> {formatDate(latestStage.date.toDate())}
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={handleViewDetails}>
              <Eye className="h-4 w-4" />
              التفاصيل
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  FileText, 
  Search, 
  Eye,
  ArrowLeft,
  AlertCircle,
  Calendar,
  Package,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DocumentTracking {
  id: string
  saleTransactionId: string
  customerName: string
  customerPhone: string
  motorFingerprint: string
  chassisNumber: string
  motorBrand: string
  motorModel: string
  status: 'pending_submission' | 'submitted_to_manufacturer' | 'received_from_manufacturer' | 'sent_to_point_of_sale' | 'completed'
  stages: Array<{
    status: string
    date: any
    updatedBy: string
    notes?: string
  }>
  combinedImageUrl?: string
  createdAt: any
  updatedAt: any
}

interface DocumentFilters {
  search: string
  status: 'all' | 'pending_submission' | 'submitted_to_manufacturer' | 'received_from_manufacturer' | 'sent_to_point_of_sale' | 'completed'
  sortBy: 'createdAt' | 'status' | 'customerName'
  sortOrder: 'asc' | 'desc'
}

export function AgentDocumentsPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [searchParams] = useSearchParams()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [documents, setDocuments] = useState<DocumentTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<DocumentFilters>({
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
      loadDocumentsData()
    }
  }, [agent, filters])

  useEffect(() => {
    // التحقق من وجود معرف بيع في URL للانتقال المباشر
    const saleId = searchParams.get('sale')
    if (saleId && documents.length > 0) {
      const doc = documents.find(d => d.saleTransactionId === saleId)
      if (doc) {
        // يمكن إضافة منطق للتمرير إلى الوثيقة المحددة
        setFilters(prev => ({ ...prev, search: doc.customerName }))
      }
    }
  }, [searchParams, documents])

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

  const loadDocumentsData = async () => {
    if (!agent?.id) return

    try {
      setLoading(true)
      
      // تحميل وثائق الوكيل من document_tracking (بدون orderBy لتجنب مشكلة Index)
      let documentsQuery = query(
        collection(db, 'document_tracking'),
        where('agentId', '==', agent.id)
      )

      const documentsSnapshot = await getDocs(documentsQuery)
      let documentsData = documentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        stages: doc.data().stages || []
      })) as DocumentTracking[]

      // فلترة البحث
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        documentsData = documentsData.filter(doc =>
          doc.customerName?.toLowerCase().includes(searchLower) ||
          doc.customerPhone?.includes(filters.search) ||
          doc.motorFingerprint?.toLowerCase().includes(searchLower) ||
          doc.chassisNumber?.toLowerCase().includes(searchLower) ||
          doc.motorBrand?.toLowerCase().includes(searchLower) ||
          doc.motorModel?.toLowerCase().includes(searchLower)
        )
      }

      // فلترة الحالة
      if (filters.status !== 'all') {
        documentsData = documentsData.filter(doc => doc.status === filters.status)
      }

      // ترتيب النتائج
      documentsData.sort((a, b) => {
        const order = filters.sortOrder === 'asc' ? 1 : -1
        switch (filters.sortBy) {
          case 'status':
            return a.status.localeCompare(b.status) * order
          case 'customerName':
            return (a.customerName || '').localeCompare(b.customerName || '') * order
          default:
            return ((a.createdAt as any) - (b.createdAt as any)) * order
        }
      })

      setDocuments(documentsData)
      
    } catch (error) {
      console.error('Error loading documents data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof DocumentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_submission': return 'text-yellow-600 bg-yellow-100'
      case 'submitted_to_manufacturer': return 'text-blue-600 bg-blue-100'
      case 'received_from_manufacturer': return 'text-purple-600 bg-purple-100'
      case 'sent_to_point_of_sale': return 'text-orange-600 bg-orange-100'
      case 'completed': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_submission': return 'في انتظار الإرسال'
      case 'submitted_to_manufacturer': return 'تم إرسالها للشركة'
      case 'received_from_manufacturer': return 'تم استلام الجواب'
      case 'sent_to_point_of_sale': return 'تم إرسالها لنقطة البيع'
      case 'completed': return 'مكتمل'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_submission': return <Clock className="h-4 w-4" />
      case 'submitted_to_manufacturer': return <AlertTriangle className="h-4 w-4" />
      case 'received_from_manufacturer': return <FileText className="h-4 w-4" />
      case 'sent_to_point_of_sale': return <Package className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <XCircle className="h-4 w-4" />
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

  const pendingCount = documents.filter(d => d.status === 'pending_submission').length
  const submittedCount = documents.filter(d => d.status === 'submitted_to_manufacturer').length
  const receivedCount = documents.filter(d => d.status === 'received_from_manufacturer').length
  const completedCount = documents.filter(d => d.status === 'completed').length

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
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">تتبع الجوابات</h1>
            <p className="text-gray-600 arabic-text">
              متابعة حالة الجوابات لفواتير البيع التي أنشأتها
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/agent/sales">
            <Button variant="outline">
              <Package className="ml-2 h-4 w-4" />
              المبيعات
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">في الانتظار</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">مُرسلة</p>
                <p className="text-2xl font-bold text-blue-600">{submittedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">تم الاستلام</p>
                <p className="text-2xl font-bold text-purple-600">{receivedCount}</p>
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
                <p className="text-sm font-medium text-gray-600 arabic-text">مكتمل</p>
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
                <option value="pending_submission">في الانتظار</option>
                <option value="submitted_to_manufacturer">مُرسلة للشركة</option>
                <option value="received_from_manufacturer">تم الاستلام</option>
                <option value="sent_to_point_of_sale">مُرسلة لنقطة البيع</option>
                <option value="completed">مكتمل</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="createdAt">تاريخ الإنشاء</option>
                <option value="status">الحالة</option>
                <option value="customerName">اسم العميل</option>
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

      {/* Documents List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="جاري تحميل الوثائق..." />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد وثائق
            </h3>
            <p className="text-gray-500 arabic-text mb-6">
              لا توجد وثائق لتتبعها حالياً
            </p>
            <Link to="/agent/sales">
              <Button>
                <Package className="ml-2 h-4 w-4" />
                إنشاء فاتورة بيع
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => {
            const latestStage = document.stages && document.stages.length > 0 ? 
              document.stages[document.stages.length - 1] : null

            return (
              <Card key={document.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Customer & Product Info */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 arabic-text">
                          {document.customerName}
                        </h3>
                        <span className={cn(
                          'px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1',
                          getStatusColor(document.status)
                        )}>
                          {getStatusIcon(document.status)}
                          {getStatusLabel(document.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="arabic-text">
                            {document.motorBrand} {document.motorModel}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                          <p>بصمة: {document.motorFingerprint}</p>
                          <p>شاسيه: {document.chassisNumber}</p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Info */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 arabic-text">التوقيت</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>أُنشئ: {formatDate(document.createdAt.toDate())}</span>
                        </div>
                        {latestStage && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>آخر تحديث: {formatDate(latestStage.date.toDate())}</span>
                          </div>
                        )}
                      </div>
                      
                      {latestStage?.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 arabic-text">
                          <strong>ملاحظة:</strong> {latestStage.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      {document.combinedImageUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={document.combinedImageUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="ml-2 h-4 w-4" />
                            عرض الصورة
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 arabic-text">مراحل التتبع</span>
                      <span className="text-sm text-gray-500">
                        {document.stages?.length || 0} مرحلة
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          document.status === 'completed' ? 'bg-green-500' :
                          document.status === 'sent_to_point_of_sale' ? 'bg-orange-500' :
                          document.status === 'received_from_manufacturer' ? 'bg-purple-500' :
                          document.status === 'submitted_to_manufacturer' ? 'bg-blue-500' :
                          'bg-yellow-500'
                        )}
                        style={{
                          width: `${
                            document.status === 'completed' ? 100 :
                            document.status === 'sent_to_point_of_sale' ? 80 :
                            document.status === 'received_from_manufacturer' ? 60 :
                            document.status === 'submitted_to_manufacturer' ? 40 :
                            20
                          }%`
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

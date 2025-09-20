import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { 
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Edit,
  Save,
  Calendar,
  User,
  MapPin,
  Phone,
  Eye,
  Share2,
  Package,
  History
} from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CompositeImageDisplay } from '@/components/ui/CompositeImageDisplay'
import { useUserData } from '@/hooks/useUserData'
import { formatDate, isAdmin, isSuperAdmin } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DocumentStatusHistory {
  id: string
  documentId: string
  previousStatus: string | null
  newStatus: string
  notes: string
  changedAt: any
  changedBy: string
}

interface UpdateStatusFormData {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  notes: string
  completedAt?: string
}

export function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [document, setDocument] = useState<DocumentTracking | null>(null)
  const [statusHistory, setStatusHistory] = useState<DocumentStatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusForm, setShowStatusForm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<UpdateStatusFormData>()

  const watchedStatus = watch('status')

  useEffect(() => {
    if (id && userData) {
      loadDocumentData()
    }
  }, [id, userData])

  useEffect(() => {
    if (watchedStatus === 'completed') {
      setValue('completedAt', new Date().toISOString().split('T')[0])
    } else {
      setValue('completedAt', '')
    }
  }, [watchedStatus, setValue])

  const loadDocumentData = async () => {
    if (!id) return

    try {
      setLoading(true)
      
      // Load real document tracking data from Firebase
      const docRef = doc(db, 'document_tracking', id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        console.log('Document not found')
        setDocument(null)
        return
      }
      
      const documentData = {
        id: docSnap.id,
        ...docSnap.data(),
        // Ensure stages is always an array
        stages: docSnap.data().stages || []
      } as DocumentTracking
      
      // إذا لم يكن اسم الوكيل موجوداً، حمله من مجموعة الوكلاء
      if (documentData.agentId && !documentData.agentName) {
        try {
          const agentRef = doc(db, 'agents', documentData.agentId)
          const agentSnap = await getDoc(agentRef)
          if (agentSnap.exists()) {
            documentData.agentName = agentSnap.data().name
          }
        } catch (error) {
          console.error('Error loading agent name:', error)
        }
      }
      
      setDocument(documentData)
      
      // For now, we'll use the stages as status history
      // In a real implementation, you might have a separate collection for detailed history
      const historyFromStages = documentData.stages.map((stage, index) => ({
        id: `stage-${index}`,
        documentId: id,
        previousStatus: index > 0 ? documentData.stages[index - 1].status : null,
        newStatus: stage.status,
        notes: stage.notes || '',
        changedAt: stage.date,
        changedBy: stage.updatedBy
      }))
      
      setStatusHistory(historyFromStages.reverse()) // Most recent first
      
      // Set form default values
      setValue('status', documentData.status as any)
      setValue('notes', '')
      
    } catch (error) {
      console.error('Error loading document data:', error)
      setDocument(null)
    } finally {
      setLoading(false)
    }
  }

  // Function to advance to next stage automatically
  const advanceToNextStage = async () => {
    if (!document || !userData) return

    try {
      setLoading(true)

      // Define the progression order
      const stageProgression: Record<string, string> = {
        'pending_submission': 'submitted_to_manufacturer',
        'submitted_to_manufacturer': 'received_from_manufacturer', 
        'received_from_manufacturer': 'sent_to_point_of_sale',
        'sent_to_point_of_sale': 'completed'
      }

      const nextStatus = stageProgression[document.status]
      
      if (!nextStatus) {
        toast.error('الوثيقة في آخر مرحلة بالفعل')
        return
      }

      // Create new stage
      const newStage = {
        status: nextStatus as any,
        date: new Date(),
        updatedBy: userData.id,
        notes: getStageDescription(nextStatus)
      }

      // Update document
      await updateDoc(doc(db, 'document_tracking', document.id), {
        status: nextStatus as any,
        stages: [...document.stages, newStage],
        updatedAt: new Date(),
        updatedBy: userData.id
      })

      toast.success('تم تحديث حالة الوثيقة بنجاح')
      
      // Reload data
      await loadDocumentData()
      
    } catch (error) {
      console.error('Error advancing stage:', error)
      toast.error('فشل في تحديث حالة الوثيقة')
    } finally {
      setLoading(false)
    }
  }

  const getStageDescription = (status: string): string => {
    const descriptions: Record<string, string> = {
      'submitted_to_manufacturer': 'تم إرسال بيانات البصمة للشركة المصنعة',
      'received_from_manufacturer': 'تم استلام الجواب من الشركة المصنعة',
      'sent_to_point_of_sale': 'تم إرسال الجواب إلى نقطة البيع',
      'completed': 'تم إنجاز جميع المراحل'
    }
    return descriptions[status] || 'تحديث الحالة'
  }

  const onSubmit = async (data: UpdateStatusFormData) => {
    if (!document || !userData) return

    try {
      setUpdating(true)

      // Create new stage entry
      const newStage = {
        status: data.status as any,
        date: new Date(),
        updatedBy: userData.id,
        notes: data.notes
      }

      // Update document with new stage
      const updatedStages = [...document.stages, newStage]
      
      const updateData = {
        status: data.status as any,
        stages: updatedStages,
        updatedAt: new Date(),
        updatedBy: userData.id
      }

      // Update in Firebase
      await updateDoc(doc(db, 'document_tracking', document.id), updateData)

      toast.success('تم تحديث حالة الوثيقة بنجاح')
      setShowStatusForm(false)
      
      // Reload document data to get updated information
      await loadDocumentData()
      
    } catch (error) {
      console.error('Error updating document status:', error)
      toast.error('حدث خطأ أثناء تحديث حالة الوثيقة')
    } finally {
      setUpdating(false)
    }
  }

  const handleGoBack = () => {
    navigate('/documents')
  }

  const canManageDocuments = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (loading) {
    return <LoadingSpinner text="جاري تحميل تفاصيل الوثيقة..." />
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900 arabic-text mb-4">
          الوثيقة غير موجودة
        </h2>
        <Button onClick={() => navigate('/documents')}>
          العودة لقائمة الوثائق
        </Button>
      </div>
    )
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار'
      case 'in_progress':
        return 'قيد المعالجة'
      case 'completed':
        return 'مكتملة'
      case 'cancelled':
        return 'ملغية'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // For now, we'll use a simple logic based on creation date
  // In a real implementation, you might add estimatedCompletionDate to the DocumentTracking type
  const createdDate = document.createdAt?.toDate()
  const estimatedDue = createdDate ? new Date(createdDate.getTime() + (14 * 24 * 60 * 60 * 1000)) : new Date() // 14 days from creation
  
  const isOverdue = document.status !== 'completed' && new Date() > estimatedDue
  const daysUntilDue = Math.ceil((estimatedDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">تفاصيل الوثيقة</h1>
            <p className="text-gray-600">بصمة الموتور: {document.motorFingerprint}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManageDocuments && document && document.status !== 'completed' && (
            <Button 
              onClick={advanceToNextStage}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <LoadingSpinner className="ml-2 h-4 w-4" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-4 w-4" />
                  تحديث للمرحلة التالية
                </>
              )}
            </Button>
          )}
          {canManageDocuments && (
            <Button onClick={() => setShowStatusForm(!showStatusForm)} variant="outline">
              <Edit className="ml-2 h-4 w-4" />
              تحديث مخصص
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={cn('px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2', getStatusColor(document.status))}>
                {getStatusIcon(document.status)}
                {getStatusLabel(document.status)}
              </div>
              {isOverdue && (
                <div className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  متأخرة بـ {Math.abs(daysUntilDue)} يوم
                </div>
              )}
              {!isOverdue && document.status !== 'completed' && document.status !== 'cancelled' && (
                <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {daysUntilDue > 0 ? `باقي ${daysUntilDue} يوم` : 'مستحقة اليوم'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 arabic-text mb-1">تاريخ الإنشاء</p>
              <p className="font-medium">{formatDate(document.createdAt?.toDate())}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 arabic-text mb-1">آخر تحديث</p>
              <p className="font-medium">{formatDate(document.updatedAt?.toDate())}</p>
            </div>
            {document.status === 'completed' && (
              <div>
                <p className="text-sm text-gray-600 arabic-text mb-1">حالة الوثيقة</p>
                <p className="font-medium text-green-600">مكتملة</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Update Status Form */}
      {showStatusForm && canManageDocuments && (
        <Card>
          <CardHeader>
            <CardTitle className="arabic-text">تحديث حالة الوثيقة</CardTitle>
            <CardDescription className="arabic-text">
              تغيير حالة الوثيقة وإضافة ملاحظات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                    الحالة الجديدة *
                  </label>
                  <select
                    {...register('status', { required: 'الحالة مطلوبة' })}
                    className="w-full form-input input-rtl arabic-text"
                  >
                    <option value="pending">في الانتظار</option>
                    <option value="in_progress">قيد المعالجة</option>
                    <option value="completed">مكتملة</option>
                    <option value="cancelled">ملغية</option>
                  </select>
                  {errors.status && (
                    <p className="text-red-500 text-sm mt-1 arabic-text">{errors.status.message}</p>
                  )}
                </div>

                {/* Completion Date (only if completed) */}
                {watchedStatus === 'completed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                      تاريخ الإنجاز *
                    </label>
                    <Input
                      {...register('completedAt', { 
                        required: watchedStatus === 'completed' ? 'تاريخ الإنجاز مطلوب' : false 
                      })}
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {errors.completedAt && (
                      <p className="text-red-500 text-sm mt-1 arabic-text">{errors.completedAt.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  ملاحظات التحديث *
                </label>
                <textarea
                  {...register('notes', { required: 'الملاحظات مطلوبة' })}
                  placeholder="أدخل ملاحظات حول تحديث حالة الوثيقة..."
                  className="w-full form-input input-rtl arabic-text"
                  rows={3}
                />
                {errors.notes && (
                  <p className="text-red-500 text-sm mt-1 arabic-text">{errors.notes.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowStatusForm(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? (
                    <>
                      <LoadingSpinner className="ml-2 h-4 w-4" />
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2 h-4 w-4" />
                      حفظ التحديث
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Document Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle & Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <Package className="h-5 w-5" />
              معلومات الدراجة والعميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-3 arabic-text">معلومات الدراجة</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">بصمة الموتور:</span> {document.motorFingerprint}
                </p>
                <p className="text-sm">
                  <span className="font-medium">رقم الشاسيه:</span> {document.chassisNumber}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3 arabic-text">معلومات العميل</h3>
              <div className="space-y-2">
                <p className="text-sm arabic-text">
                  <span className="font-medium">الاسم:</span> {document.customerName}
                </p>
                <p className="text-sm">
                  <span className="font-medium">الرقم القومي:</span> {(document as any).customerNationalId || 'غير محدد'}
                </p>
                <p className="text-sm arabic-text">
                  <span className="font-medium">الوكيل:</span> {(document as any).agentName || 'غير محدد'}
                </p>
              </div>
            </div>

            {(document as any).notes && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-2 arabic-text">الملاحظات الحالية</h3>
                <p className="text-sm text-gray-700 arabic-text bg-gray-50 p-3 rounded-lg">
                  {(document as any).notes}
                </p>
              </div>
            )}

            {/* Composite Image Display */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3 arabic-text">الصورة المجمعة للوثائق</h3>
              <CompositeImageDisplay
                compositeImageUrl={(document as any).combinedImageUrl}
                customerIdImage={(document as any).idCardFrontImageUrl}
                motorFingerprintImage={(document as any).motorFingerprintImageUrl}
                chassisNumberImage={(document as any).chassisNumberImageUrl}
                customerName={document.customerName || 'عميل'}
                saleDate={document.createdAt?.toDate ? document.createdAt.toDate() : new Date(document.createdAt)}
                showRegenerateButton={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <History className="h-5 w-5" />
              تاريخ التحديثات
            </CardTitle>
            <CardDescription className="arabic-text">
              سجل جميع التغييرات على حالة الوثيقة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4 arabic-text">لا توجد تحديثات</p>
            ) : (
              <div className="space-y-4">
                {statusHistory.map((history, index) => (
                  <div key={history.id} className="relative">
                    {index < statusHistory.length - 1 && (
                      <div className="absolute right-4 top-8 w-0.5 h-8 bg-gray-200"></div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-2 rounded-full flex-shrink-0',
                        getStatusColor(history.newStatus).replace('text-', 'text-white bg-').split(' ')[0]
                      )}>
                        {getStatusIcon(history.newStatus)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 arabic-text">
                            {history.previousStatus ? 
                              `تغيير من "${getStatusLabel(history.previousStatus)}" إلى "${getStatusLabel(history.newStatus)}"` :
                              `تم إنشاء الوثيقة بحالة "${getStatusLabel(history.newStatus)}"`
                            }
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 arabic-text mt-1">
                          {history.notes}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDate(history.changedAt)} - بواسطة: {history.changedBy === 'admin' ? 'المدير' : 'النظام'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

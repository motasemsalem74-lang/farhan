import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { 
  ArrowLeft, 
  Calculator,
  Save,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
  Calendar,
  User
} from 'lucide-react'
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent, AgentTransaction } from '@/types'
import { formatCurrency, formatDate, isAdmin, isSuperAdmin } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SettlementFormData {
  settlementType: 'full' | 'partial' | 'adjustment'
  amount: number
  description: string
  notes: string
}

interface SettlementSummary {
  currentBalance: number
  totalDebt: number
  totalCredit: number
  pendingTransactions: number
  lastSettlementDate?: Date
  proposedSettlement: number
}

export function AccountSettlementPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [transactions, setTransactions] = useState<AgentTransaction[]>([])
  const [summary, setSummary] = useState<SettlementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<SettlementFormData>({
    defaultValues: {
      settlementType: 'full',
      amount: 0,
      description: '',
      notes: ''
    }
  })

  const watchedType = watch('settlementType')
  const watchedAmount = watch('amount')

  useEffect(() => {
    if (userData && id) {
      loadSettlementData()
    }
  }, [userData, id])

  useEffect(() => {
    if (summary && watchedType === 'full') {
      setValue('amount', Math.abs(summary.currentBalance))
    }
  }, [summary, watchedType, setValue])

  const loadSettlementData = async () => {
    if (!id) return

    try {
      setLoading(true)

      // Load agent data
      const agentDoc = await getDoc(doc(db, 'agents', id))
      if (!agentDoc.exists()) {
        toast.error('لم يتم العثور على الوكيل')
        navigate('/agents')
        return
      }

      const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent
      setAgent(agentData)

      // Load agent transactions
      const transactionsQuery = query(
        collection(db, 'agent_transactions'),
        where('agentId', '==', id),
        orderBy('createdAt', 'desc')
      )
      
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentTransaction[]
      
      setTransactions(transactionsData)

      // Calculate settlement summary
      let totalDebt = 0
      let totalCredit = 0
      let lastSettlementDate: Date | undefined

      transactionsData.forEach(transaction => {
        if (transaction.amount < 0) {
          totalDebt += Math.abs(transaction.amount)
        } else {
          totalCredit += transaction.amount
        }

        // Check for last settlement
        if (transaction.type === 'settlement' && transaction.createdAt) {
          const transactionDate = transaction.createdAt.toDate ? 
            transaction.createdAt.toDate() : 
            new Date(transaction.createdAt)
          
          if (!lastSettlementDate || transactionDate > lastSettlementDate) {
            lastSettlementDate = transactionDate
          }
        }
      })

      const settlementSummary: SettlementSummary = {
        currentBalance: agentData.currentBalance,
        totalDebt,
        totalCredit,
        pendingTransactions: transactionsData.filter(t => t.type !== 'settlement').length,
        lastSettlementDate,
        proposedSettlement: Math.abs(agentData.currentBalance)
      }

      setSummary(settlementSummary)

    } catch (error) {
      console.error('Error loading settlement data:', error)
      toast.error('خطأ في تحميل بيانات التسوية')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: SettlementFormData) => {
    if (!agent || !userData || !summary) return

    setShowConfirmation(true)
  }

  const confirmSettlement = async () => {
    if (!agent || !userData || !summary) return

    try {
      setProcessing(true)
      setShowConfirmation(false)

      const formData = watch()
      
      // Calculate new balance based on settlement type
      let newBalance = 0
      let settlementAmount = 0

      switch (formData.settlementType) {
        case 'full':
          // Full settlement - balance becomes zero
          settlementAmount = Math.abs(agent.currentBalance)
          newBalance = 0
          break
        case 'partial':
          // Partial settlement - reduce debt by specified amount
          if (agent.currentBalance < 0) {
            settlementAmount = Math.min(formData.amount, Math.abs(agent.currentBalance))
            newBalance = agent.currentBalance + settlementAmount
          } else {
            settlementAmount = formData.amount
            newBalance = agent.currentBalance + settlementAmount
          }
          break
        case 'adjustment':
          // Balance adjustment - can be positive or negative
          settlementAmount = formData.amount
          newBalance = formData.amount
          break
      }

      // Create settlement transaction
      const settlementTransaction = {
        agentId: agent.id,
        type: 'settlement',
        amount: agent.currentBalance < 0 ? settlementAmount : -settlementAmount,
        description: formData.description || `تسوية حساب ${formData.settlementType === 'full' ? 'كاملة' : formData.settlementType === 'partial' ? 'جزئية' : 'تعديل رصيد'}`,
        notes: formData.notes,
        previousBalance: agent.currentBalance,
        newBalance: newBalance,
        settlementType: formData.settlementType,
        createdAt: serverTimestamp(),
        createdBy: userData.id
      }

      // Add settlement transaction
      await addDoc(collection(db, 'agent_transactions'), settlementTransaction)

      // Update agent balance
      await updateDoc(doc(db, 'agents', agent.id), {
        currentBalance: newBalance,
        lastSettlementDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: userData.id
      })

      // Create settlement record for audit trail
      const settlementRecord = {
        agentId: agent.id,
        agentName: agent.name,
        settlementType: formData.settlementType,
        previousBalance: agent.currentBalance,
        settlementAmount: settlementAmount,
        newBalance: newBalance,
        description: formData.description,
        notes: formData.notes,
        processedBy: userData.id,
        processedByName: userData.name,
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'account_settlements'), settlementRecord)

      toast.success('تم إجراء تسوية الحساب بنجاح')
      navigate(`/agents/details/${agent.id}`)

    } catch (error) {
      console.error('Error processing settlement:', error)
      toast.error('خطأ في معالجة تسوية الحساب')
    } finally {
      setProcessing(false)
    }
  }

  const getSettlementPreview = () => {
    if (!summary || !agent) return null

    const formData = watch()
    let newBalance = 0
    let settlementAmount = 0

    switch (formData.settlementType) {
      case 'full':
        settlementAmount = Math.abs(agent.currentBalance)
        newBalance = 0
        break
      case 'partial':
        if (agent.currentBalance < 0) {
          settlementAmount = Math.min(formData.amount, Math.abs(agent.currentBalance))
          newBalance = agent.currentBalance + settlementAmount
        } else {
          settlementAmount = formData.amount
          newBalance = agent.currentBalance + settlementAmount
        }
        break
      case 'adjustment':
        settlementAmount = formData.amount
        newBalance = formData.amount
        break
    }

    return { newBalance, settlementAmount }
  }

  const canManageSettlements = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!canManageSettlements) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">غير مصرح</h3>
            <p className="text-red-700">هذه الشاشة مخصصة للمديرين فقط</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="جاري تحميل بيانات التسوية..." />
      </div>
    )
  }

  if (!agent || !summary) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900 arabic-text mb-4">
          لم يتم العثور على الوكيل
        </h2>
        <Button onClick={() => navigate('/agents')}>
          العودة لقائمة الوكلاء
        </Button>
      </div>
    )
  }

  const preview = getSettlementPreview()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/agents/details/${id}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">
              تسوية حساب الوكيل
            </h1>
            <p className="text-gray-600 arabic-text">
              {agent.name} - {agent.phone}
            </p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 arabic-text mb-2">الرصيد الحالي</p>
            <p className={cn(
              'text-3xl font-bold',
              summary.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatCurrency(Math.abs(summary.currentBalance))}
            </p>
            <p className={cn(
              'text-sm',
              summary.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {summary.currentBalance >= 0 ? 'رصيد دائن' : 'رصيد مدين'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="p-3 bg-orange-100 rounded-full w-fit mx-auto mb-4">
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600 arabic-text mb-2">المعاملات المعلقة</p>
            <p className="text-3xl font-bold text-orange-600">{summary.pendingTransactions}</p>
            <p className="text-sm text-orange-600">معاملة</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 arabic-text mb-2">آخر تسوية</p>
            <p className="text-lg font-bold text-purple-600">
              {summary.lastSettlementDate ? formatDate(summary.lastSettlementDate) : 'لا توجد'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            إعداد التسوية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Settlement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 arabic-text">
                نوع التسوية *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="relative">
                  <input
                    {...register('settlementType', { required: 'نوع التسوية مطلوب' })}
                    type="radio"
                    value="full"
                    className="sr-only"
                  />
                  <div className={cn(
                    'p-4 border-2 rounded-lg cursor-pointer transition-colors',
                    watchedType === 'full' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}>
                    <div className="flex items-center gap-3">
                      <CheckCircle className={cn(
                        'h-5 w-5',
                        watchedType === 'full' ? 'text-blue-500' : 'text-gray-400'
                      )} />
                      <div>
                        <p className="font-medium arabic-text">تسوية كاملة</p>
                        <p className="text-sm text-gray-600 arabic-text">إغلاق الحساب بالكامل</p>
                      </div>
                    </div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    {...register('settlementType')}
                    type="radio"
                    value="partial"
                    className="sr-only"
                  />
                  <div className={cn(
                    'p-4 border-2 rounded-lg cursor-pointer transition-colors',
                    watchedType === 'partial' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}>
                    <div className="flex items-center gap-3">
                      <XCircle className={cn(
                        'h-5 w-5',
                        watchedType === 'partial' ? 'text-blue-500' : 'text-gray-400'
                      )} />
                      <div>
                        <p className="font-medium arabic-text">تسوية جزئية</p>
                        <p className="text-sm text-gray-600 arabic-text">دفع جزء من المديونية</p>
                      </div>
                    </div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    {...register('settlementType')}
                    type="radio"
                    value="adjustment"
                    className="sr-only"
                  />
                  <div className={cn(
                    'p-4 border-2 rounded-lg cursor-pointer transition-colors',
                    watchedType === 'adjustment' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={cn(
                        'h-5 w-5',
                        watchedType === 'adjustment' ? 'text-blue-500' : 'text-gray-400'
                      )} />
                      <div>
                        <p className="font-medium arabic-text">تعديل رصيد</p>
                        <p className="text-sm text-gray-600 arabic-text">تعديل الرصيد يدوياً</p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
              {errors.settlementType && (
                <p className="text-red-500 text-sm mt-1 arabic-text">{errors.settlementType.message}</p>
              )}
            </div>

            {/* Amount */}
            {watchedType !== 'full' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  المبلغ (جنيه) *
                </label>
                <Input
                  {...register('amount', { 
                    required: 'المبلغ مطلوب',
                    valueAsNumber: true,
                    min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من صفر' }
                  })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  dir="ltr"
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1 arabic-text">{errors.amount.message}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                وصف التسوية *
              </label>
              <Input
                {...register('description', { required: 'وصف التسوية مطلوب' })}
                placeholder="وصف سبب التسوية..."
                className="input-rtl arabic-text"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1 arabic-text">{errors.description.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                ملاحظات إضافية
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="ملاحظات إضافية..."
                className="w-full form-input input-rtl arabic-text"
              />
            </div>

            {/* Preview */}
            {preview && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-blue-900 mb-3 arabic-text">معاينة التسوية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700 arabic-text">الرصيد الحالي:</p>
                      <p className="font-bold text-blue-900">{formatCurrency(Math.abs(summary.currentBalance))}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 arabic-text">مبلغ التسوية:</p>
                      <p className="font-bold text-blue-900">{formatCurrency(preview.settlementAmount)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 arabic-text">الرصيد الجديد:</p>
                      <p className={cn(
                        'font-bold',
                        preview.newBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {formatCurrency(Math.abs(preview.newBalance))}
                        {preview.newBalance >= 0 ? ' (دائن)' : ' (مدين)'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/agents/details/${id}`)}
              >
                إلغاء
              </Button>
              <Button type="submit">
                <Calculator className="ml-2 h-4 w-4" />
                معاينة التسوية
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmation && preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <h3 className="text-lg font-bold text-gray-900 arabic-text">
                تأكيد تسوية الحساب
              </h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-gray-700 arabic-text">
                هل أنت متأكد من إجراء تسوية الحساب؟
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="arabic-text">الوكيل:</span>
                  <span className="font-medium">{agent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="arabic-text">نوع التسوية:</span>
                  <span className="font-medium">
                    {watchedType === 'full' ? 'تسوية كاملة' : 
                     watchedType === 'partial' ? 'تسوية جزئية' : 'تعديل رصيد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="arabic-text">مبلغ التسوية:</span>
                  <span className="font-medium">{formatCurrency(preview.settlementAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="arabic-text">الرصيد الجديد:</span>
                  <span className={cn(
                    'font-medium',
                    preview.newBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(Math.abs(preview.newBalance))}
                    {preview.newBalance >= 0 ? ' (دائن)' : ' (مدين)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                disabled={processing}
              >
                إلغاء
              </Button>
              <Button 
                onClick={confirmSettlement}
                disabled={processing}
                className="bg-red-600 hover:bg-red-700"
              >
                {processing ? (
                  <>
                    <LoadingSpinner className="ml-2 h-4 w-4" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    تأكيد التسوية
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

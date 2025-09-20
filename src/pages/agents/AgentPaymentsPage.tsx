import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { 
  ArrowLeft, 
  Plus, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  FileText,
  Save,
  AlertCircle
} from 'lucide-react'
import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent, AgentTransaction } from '@/types'
import { formatCurrency, formatDate, isAdmin, isSuperAdmin } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PaymentFormData {
  type: 'payment' | 'adjustment'
  amount: number
  description: string
}

export function AgentPaymentsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [transactions, setTransactions] = useState<AgentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PaymentFormData>({
    defaultValues: {
      type: 'payment',
      amount: 0,
      description: ''
    }
  })

  useEffect(() => {
    if (id && userData) {
      loadAgentPayments()
    }
  }, [id, userData])

  const loadAgentPayments = async () => {
    if (!id) return

    try {
      setLoading(true)
      
      // Load real agent data from Firebase
      const agentDoc = await getDoc(doc(db, 'agents', id))
      if (!agentDoc.exists()) {
        setAgent(null)
        return
      }
      
      const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent
      setAgent(agentData)
      
      // Load real transactions from Firebase
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
      
    } catch (error) {
      console.error('Error loading agent payments:', error)
      toast.error('خطأ في تحميل بيانات المدفوعات')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: PaymentFormData) => {
    if (!agent || !userData) return

    try {
      setSubmitting(true)

      // Create transaction
      const transactionData: Omit<AgentTransaction, 'id'> = {
        agentId: agent.id,
        type: data.type === 'payment' ? 'payment' : 'credit',
        amount: Math.abs(data.amount), // Always positive - payment reduces debt
        description: data.description,
        createdAt: new Date() as any,
        createdBy: userData.id
      }

      // Add to Firestore
      const transactionRef = await addDoc(collection(db, 'agent_transactions'), transactionData)

      // Update agent balance
      const newBalance = agent.currentBalance + transactionData.amount
      
      // Update agent document
      await updateDoc(doc(db, 'agents', agent.id), {
        currentBalance: newBalance,
        updatedAt: new Date()
      })

      // Update local state
      setAgent(prev => prev ? { ...prev, currentBalance: newBalance } : null)
      setTransactions(prev => [{
        ...transactionData,
        id: transactionRef.id
      }, ...prev])

      toast.success('تم إضافة المعاملة بنجاح')
      setShowPaymentForm(false)
      reset()
      
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast.error('حدث خطأ أثناء إضافة المعاملة')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoBack = () => {
    navigate(`/agents/details/${id}`)
  }

  const canManagePayments = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (loading) {
    return <LoadingSpinner text="جاري تحميل بيانات المدفوعات..." />
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          الوكيل غير موجود
        </h2>
        <p className="text-gray-600 arabic-text">
          لم يتم العثور على الوكيل المطلوب
        </p>
        <Button onClick={handleGoBack} className="mt-4">
          العودة
        </Button>
      </div>
    )
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-purple-600'
    if (balance < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getBalanceLabel = (balance: number) => {
    if (balance > 0) return 'دائن'
    if (balance < 0) return 'مدين'
    return 'متوازن'
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'commission':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'payment':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'adjustment':
        return <FileText className="h-4 w-4 text-blue-600" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'commission':
        return 'عمولة'
      case 'payment':
        return 'دفعة'
      case 'adjustment':
        return 'تعديل'
      default:
        return 'معاملة'
    }
  }

  // Calculate statistics
  const totalCommissions = transactions
    .filter(t => t.type === 'commission')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalPayments = transactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const totalAdjustments = transactions
    .filter(t => t.type === 'credit' || t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">
              مدفوعات الوكيل - {agent.name}
            </h1>
            <p className="text-gray-600 arabic-text">إدارة المدفوعات والمعاملات المالية</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManagePayments && (
            <Button onClick={() => setShowPaymentForm(!showPaymentForm)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة معاملة
            </Button>
          )}
        </div>
      </div>

      {/* Current Balance Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 arabic-text mb-2">الرصيد الحالي</p>
              <p className={cn('text-3xl font-bold', getBalanceColor(agent.currentBalance))}>
                {formatCurrency(Math.abs(agent.currentBalance))}
              </p>
              <p className={cn('text-sm', getBalanceColor(agent.currentBalance))}>
                {getBalanceLabel(agent.currentBalance)}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 arabic-text mb-2">إجمالي العمولات</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCommissions)}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 arabic-text mb-2">إجمالي المدفوعات</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalPayments)}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 arabic-text mb-2">التعديلات</p>
              <p className={cn(
                'text-2xl font-bold',
                totalAdjustments >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {formatCurrency(Math.abs(totalAdjustments))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      {showPaymentForm && canManagePayments && (
        <Card>
          <CardHeader>
            <CardTitle className="arabic-text">إضافة معاملة جديدة</CardTitle>
            <CardDescription className="arabic-text">
              إضافة دفعة أو تعديل رصيد الوكيل
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Transaction Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                    نوع المعاملة *
                  </label>
                  <select
                    {...register('type', { required: 'نوع المعاملة مطلوب' })}
                    className="w-full form-input input-rtl arabic-text"
                  >
                    <option value="payment">دفعة من الوكيل</option>
                    <option value="adjustment">تعديل رصيد</option>
                  </select>
                  {errors.type && (
                    <p className="text-red-500 text-sm mt-1 arabic-text">{errors.type.message}</p>
                  )}
                </div>

                {/* Amount */}
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                    الوصف *
                  </label>
                  <Input
                    {...register('description', { required: 'الوصف مطلوب' })}
                    placeholder="وصف المعاملة..."
                    className="input-rtl arabic-text"
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1 arabic-text">{errors.description.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowPaymentForm(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <LoadingSpinner className="ml-2 h-4 w-4" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2 h-4 w-4" />
                      حفظ المعاملة
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <FileText className="h-5 w-5" />
            سجل المعاملات
          </CardTitle>
          <CardDescription className="arabic-text">
            جميع المعاملات المالية للوكيل مرتبة حسب التاريخ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
                لا توجد معاملات
              </h3>
              <p className="text-gray-500 arabic-text">
                لم يتم تسجيل أي معاملات مالية لهذا الوكيل بعد
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-full shadow-sm">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 arabic-text">
                          {transaction.description}
                        </p>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full arabic-text">
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(transaction.createdAt.toDate ? transaction.createdAt.toDate() : transaction.createdAt)}
                        </p>
                        {transaction.saleId && (
                          <p className="text-sm text-blue-600">
                            مرتبطة بالبيع: {transaction.saleId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={cn(
                      'text-lg font-bold',
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-sm text-gray-500 arabic-text">
                      بواسطة: {transaction.createdBy === 'system' ? 'النظام' : 'المدير'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

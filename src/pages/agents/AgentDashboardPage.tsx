import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  FileText,
  Package,
  Eye,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent, AgentTransaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function AgentDashboardPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [transactions, setTransactions] = useState<AgentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userData && userData.role === 'agent') {
      loadAgentData()
    }
  }, [userData])

  const loadAgentData = async () => {
    if (!userData?.id) return

    try {
      setLoading(true)
      
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

      // تحميل معاملات الوكيل
      const transactionsQuery = query(
        collection(db, 'agent_transactions'),
        where('agentId', '==', agentDoc.id),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentTransaction[]
      
      setTransactions(transactionsData)
      
    } catch (error) {
      console.error('Error loading agent data:', error)
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return <LoadingSpinner text="جاري تحميل بيانات الحساب..." />
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          حساب الوكيل غير مكتمل
        </h2>
        <p className="text-gray-600 arabic-text">
          لم يتم ربط حسابك بملف وكيل. يرجى التواصل مع الإدارة.
        </p>
      </div>
    )
  }

  const totalCredits = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const totalDebits = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">
            مرحباً {agent.name}
          </h1>
          <p className="text-gray-600 arabic-text">
            كشف حساب ومعاملات الوكيل مع المؤسسة
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/agent/inventory">
            <Button variant="outline">
              <Package className="ml-2 h-4 w-4" />
              مخزني
            </Button>
          </Link>
          <Link to="/agent/sales">
            <Button variant="outline">
              <CreditCard className="ml-2 h-4 w-4" />
              المبيعات
            </Button>
          </Link>
          <Link to="/agent/documents">
            <Button variant="outline">
              <FileText className="ml-2 h-4 w-4" />
              تتبع الجوابات
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Current Balance */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 arabic-text mb-1">
                الرصيد الحالي
              </p>
              <p className={cn('text-3xl font-bold', getBalanceColor(agent.currentBalance))}>
                {formatCurrency(Math.abs(agent.currentBalance))}
              </p>
              <p className={cn('text-sm', getBalanceColor(agent.currentBalance))}>
                {getBalanceLabel(agent.currentBalance)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Credits */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">
                  إجمالي المقبوضات
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalCredits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Debits */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">
                  إجمالي المدفوعات
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalDebits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between arabic-text">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              كشف الحساب - آخر المعاملات
            </div>
            <span className="text-sm font-normal text-gray-500">
              آخر 20 معاملة
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 arabic-text">لا توجد معاملات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      transaction.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                    )}>
                      {transaction.amount > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 arabic-text">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(transaction.createdAt.toDate())}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-lg font-bold',
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {transaction.amount > 0 ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-gray-500 arabic-text">
                      {transaction.amount > 0 ? 'دائن' : 'مدين'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/agent/inventory">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2 arabic-text">مخزني</h3>
              <p className="text-sm text-gray-600 arabic-text">
                عرض المنتجات المتاحة في مخزنك
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/agent/sales">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <CreditCard className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2 arabic-text">المبيعات</h3>
              <p className="text-sm text-gray-600 arabic-text">
                إدارة المبيعات وعرض الفواتير السابقة
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/agent/documents">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2 arabic-text">تتبع الجوابات</h3>
              <p className="text-sm text-gray-600 arabic-text">
                متابعة حالة الجوابات لفواتيرك
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

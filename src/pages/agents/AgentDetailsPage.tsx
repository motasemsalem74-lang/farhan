import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  CreditCard, 
  Phone, 
  MapPin, 
  User, 
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  FileText,
  AlertCircle
} from 'lucide-react'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent, Sale, AgentTransaction } from '@/types'
import { formatDate, isAdmin, isSuperAdmin } from '@/lib/utils'
import { 
  formatCurrency, 
  formatSaleAmount, 
  formatCommission, 
  formatAgentBalance,
  formatSalesCount,
  safeNumber 
} from '@/lib/numberUtils'
import { cn } from '@/lib/utils'

export function AgentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [recentTransactions, setRecentTransactions] = useState<AgentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && userData) {
      loadAgentData()
    }
  }, [id, userData])

  const loadAgentData = async () => {
    if (!id) return

    try {
      setLoading(true)
      console.log('🔍 [AGENT DETAILS] Loading agent data for ID:', id)
      
      // Load real agent data from Firebase
      const agentDoc = await getDoc(doc(db, 'agents', id))
      if (!agentDoc.exists()) {
        console.error('❌ [AGENT DETAILS] Agent not found with ID:', id)
        setAgent(null)
        return
      }

      const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent
      console.log('✅ [AGENT DETAILS] Agent data loaded:', agentData)
      console.log('💰 [AGENT DETAILS] Current balance:', agentData.currentBalance)
      setAgent(agentData)

      // Load recent sales for this agent
      const salesQuery = query(
        collection(db, 'sales'),
        where('agentId', '==', id),
        orderBy('createdAt', 'desc'),
        limit(5)
      )
      const salesSnapshot = await getDocs(salesQuery)
      const salesData = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[]
      setRecentSales(salesData)

      // Load recent transactions for this agent
      const transactionsQuery = query(
        collection(db, 'agent_transactions'),
        where('agentId', '==', id),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentTransaction[]
      setRecentTransactions(transactionsData)
      
    } catch (error) {
      console.error('Error loading agent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    navigate('/agents')
  }

  const handleManagePayments = () => {
    navigate(`/agents/payments/${id}`)
  }

  const canManageAgents = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (loading) {
    return <LoadingSpinner text="جاري تحميل بيانات الوكيل..." />
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
          العودة للقائمة
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

  const totalSales = recentSales.reduce((sum, sale) => {
    return sum + safeNumber(sale.totalAmount || (sale as any).salePrice)
  }, 0)
  
  const totalCommissions = recentSales.reduce((sum, sale) => {
    return sum + safeNumber(sale.totalCommission || (sale as any).agentCommission)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">تفاصيل الوكيل</h1>
            <p className="text-gray-600 arabic-text">عرض معلومات وحساب الوكيل</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManageAgents && (
            <>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/agents/settlement/${id}`)}
                className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
              >
                <CreditCard className="ml-2 h-4 w-4" />
                تسوية الحساب
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/agents/statement/${id}`)}
              >
                <FileText className="ml-2 h-4 w-4" />
                كشف الحساب
              </Button>
              {!agent?.hasUserAccount && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/agents/sales/${id}`)}
                >
                  <Package className="ml-2 h-4 w-4" />
                  بيع نيابة عن الوكيل
                </Button>
              )}
              <Button variant="outline" onClick={handleManagePayments}>
                <CreditCard className="ml-2 h-4 w-4" />
                إدارة المدفوعات
              </Button>
              <Button onClick={() => navigate(`/agents/edit/${id}`)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل البيانات
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Agent Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <User className="h-5 w-5" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 arabic-text">الحالة:</span>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  agent.isActive ? 'bg-green-500' : 'bg-red-500'
                )}></div>
                <span className={cn(
                  'text-sm font-medium',
                  agent.isActive ? 'text-green-600' : 'text-red-600'
                )}>
                  {agent.isActive ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{agent.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm arabic-text">{agent.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-sm arabic-text">
                  {agent.hasUserAccount ? 'لديه حساب مستخدم' : 'وكيل أوفلاين'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm arabic-text">
                  انضم في {formatDate(agent.createdAt.toDate())}
                </span>
              </div>
            </div>

            {agent.notes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600 arabic-text">
                  <strong>ملاحظات:</strong> {agent.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <CreditCard className="h-5 w-5" />
              الملخص المالي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 arabic-text mb-1">الرصيد الحالي</p>
              <p className={cn('text-3xl font-bold', getBalanceColor(agent.currentBalance))}>
                {formatCurrency(Math.abs(agent.currentBalance))}
              </p>
              <p className={cn('text-sm', getBalanceColor(agent.currentBalance))}>
                {getBalanceLabel(agent.currentBalance)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-gray-600 arabic-text">نسبة العمولة</p>
                <p className="text-lg font-bold text-blue-600">{agent.commissionRate || 5}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 arabic-text">إجمالي العمولات</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalCommissions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <Package className="h-5 w-5" />
              ملخص المبيعات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 arabic-text">عدد المبيعات</p>
                <p className="text-2xl font-bold text-blue-600">{recentSales.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 arabic-text">إجمالي قيمة المبيعات</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between arabic-text">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                المبيعات الأخيرة
              </div>
              <Link to={`/sales?agent=${agent.id}`} className="text-sm text-blue-600 hover:underline">
                عرض الكل
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-gray-500 text-center py-4 arabic-text">لا توجد مبيعات</p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{sale.invoiceNumber}</p>
                      <p className="text-sm text-gray-600 arabic-text">{sale.customerName}</p>
                      <p className="text-xs text-gray-500">{formatDate(sale.createdAt.toDate())}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatSaleAmount(sale)}
                      </p>
                      <p className="text-sm text-blue-600">
                        عمولة: {formatCommission(sale)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between arabic-text">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                المعاملات الأخيرة
              </div>
              <Button variant="ghost" size="sm" onClick={handleManagePayments}>
                عرض الكل
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4 arabic-text">لا توجد معاملات</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                        <p className="text-sm font-medium text-gray-900 arabic-text">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.createdAt.toDate())}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'font-bold',
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
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
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Download, 
  TrendingUp,
  TrendingDown,
  Users,
  Filter,
  BarChart3,
  Target
} from 'lucide-react'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
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

interface BalanceAnalytics {
  totalAgents: number
  activeAgents: number
  debtorAgents: number
  creditorAgents: number
  totalDebtAmount: number
  totalCreditAmount: number
  netPosition: number
  averageBalance: number
  highRiskCount: number
  overdueCount: number
}

interface AgentBalanceDetail extends Agent {
  netBalance: number
  lastTransactionDate?: Date
  lastPaymentDate?: Date
  daysSinceLastTransaction?: number
  daysSinceLastPayment?: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  transactionCount: number
  profitability: number
}

export function AdvancedBalanceReportPage() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  const [agents, setAgents] = useState<AgentBalanceDetail[]>([])
  const [analytics, setAnalytics] = useState<BalanceAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [filters, setFilters] = useState({
    search: '',
    riskLevel: 'all',
    balanceType: 'all',
    sortBy: 'balance',
    sortOrder: 'desc' as 'asc' | 'desc'
  })

  useEffect(() => {
    if (userData) {
      loadBalanceData()
    }
  }, [userData])

  const loadBalanceData = async () => {
    try {
      setLoading(true)

      // Load all agents
      const agentsQuery = query(collection(db, 'agents'), orderBy('name'))
      const agentsSnapshot = await getDocs(agentsQuery)
      const agentsData = agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Agent[]

      // Load all agent transactions
      const transactionsQuery = query(
        collection(db, 'agent_transactions'),
        orderBy('createdAt', 'desc')
      )
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentTransaction[]

      // Process detailed balance information
      const agentBalanceDetails = agentsData.map(agent => {
        const agentTransactions = transactionsData.filter(t => t.agentId === agent.id)
        
        let lastTransactionDate: Date | undefined
        let lastPaymentDate: Date | undefined
        let profitability = 0
        
        agentTransactions.forEach(transaction => {
          const transactionDate = transaction.createdAt?.toDate ? 
            transaction.createdAt.toDate() : 
            transaction.createdAt ? new Date(transaction.createdAt) : new Date()
          
          if (!lastTransactionDate || transactionDate > lastTransactionDate) {
            lastTransactionDate = transactionDate
          }
          
          if (transaction.type === 'commission') {
            profitability += transaction.amount
          }
          
          if (transaction.type === 'payment' && (!lastPaymentDate || transactionDate > lastPaymentDate)) {
            lastPaymentDate = transactionDate
          }
        })

        const netBalance = agent.currentBalance
        const daysSinceLastTransaction = lastTransactionDate ? 
          Math.floor((new Date().getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24)) : 
          undefined
        const daysSinceLastPayment = lastPaymentDate ? 
          Math.floor((new Date().getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)) : 
          undefined

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
        if (netBalance < 0) {
          const debtAmount = Math.abs(netBalance)
          if (debtAmount > 200000) riskLevel = 'critical'
          else if (debtAmount > 100000) riskLevel = 'high'
          else if (debtAmount > 50000) riskLevel = 'medium'
        }

        if (daysSinceLastPayment && daysSinceLastPayment > 90 && netBalance < 0) {
          riskLevel = riskLevel === 'critical' ? 'critical' : 
                     riskLevel === 'high' ? 'critical' : 'high'
        }

        return {
          ...agent,
          netBalance,
          lastTransactionDate,
          lastPaymentDate,
          daysSinceLastTransaction,
          daysSinceLastPayment,
          riskLevel,
          transactionCount: agentTransactions.length,
          profitability
        } as AgentBalanceDetail
      })

      setAgents(agentBalanceDetails)

      // Calculate analytics
      const analytics: BalanceAnalytics = {
        totalAgents: agentBalanceDetails.length,
        activeAgents: agentBalanceDetails.filter(a => a.daysSinceLastTransaction && a.daysSinceLastTransaction <= 30).length,
        debtorAgents: agentBalanceDetails.filter(a => a.netBalance < 0).length,
        creditorAgents: agentBalanceDetails.filter(a => a.netBalance > 0).length,
        totalDebtAmount: agentBalanceDetails.reduce((sum, a) => sum + (a.netBalance < 0 ? Math.abs(a.netBalance) : 0), 0),
        totalCreditAmount: agentBalanceDetails.reduce((sum, a) => sum + (a.netBalance > 0 ? a.netBalance : 0), 0),
        netPosition: agentBalanceDetails.reduce((sum, a) => sum + a.netBalance, 0),
        averageBalance: agentBalanceDetails.reduce((sum, a) => sum + a.netBalance, 0) / agentBalanceDetails.length,
        highRiskCount: agentBalanceDetails.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length,
        overdueCount: agentBalanceDetails.filter(a => a.daysSinceLastPayment && a.daysSinceLastPayment > 60 && a.netBalance < 0).length
      }

      setAnalytics(analytics)

    } catch (error) {
      console.error('Error loading balance data:', error)
      toast.error('خطأ في تحميل بيانات الأرصدة')
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = agents.filter(agent => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!agent.name.toLowerCase().includes(searchLower) && 
          !agent.phone.includes(filters.search)) {
        return false
      }
    }
    
    if (filters.riskLevel !== 'all' && agent.riskLevel !== filters.riskLevel) {
      return false
    }
    
    if (filters.balanceType === 'debtors' && agent.netBalance >= 0) return false
    if (filters.balanceType === 'creditors' && agent.netBalance <= 0) return false
    
    return true
  })

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1
    switch (filters.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name) * order
      case 'balance':
        return (Math.abs(a.netBalance) - Math.abs(b.netBalance)) * order
      case 'profitability':
        return (a.profitability - b.profitability) * order
      default:
        return (a.netBalance - b.netBalance) * order
    }
  })

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'حرج جداً'
      case 'high': return 'عالي'
      case 'medium': return 'متوسط'
      default: return 'منخفض'
    }
  }

  const canManageAgents = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!canManageAgents) {
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
        <LoadingSpinner text="جاري تحميل التقرير المتقدم..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/agents')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">
              تقرير الأرصدة المتقدم
            </h1>
            <p className="text-gray-600 arabic-text">
              تحليل شامل ومتقدم لأرصدة ومديونيات جميع الوكلاء
            </p>
          </div>
        </div>
        <Button onClick={() => toast.info('جاري تطوير تصدير التقرير...')}>
          <Download className="ml-2 h-4 w-4" />
          تصدير التقرير
        </Button>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الوكلاء</p>
                  <p className="text-2xl font-bold text-blue-600">{analytics.totalAgents}</p>
                  <p className="text-sm text-blue-600">النشطون: {analytics.activeAgents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المديونيات</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.debtorAgents}</p>
                  <p className="text-sm text-red-600">{formatCurrency(analytics.totalDebtAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الأرصدة الدائنة</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.creditorAgents}</p>
                  <p className="text-sm text-green-600">{formatCurrency(analytics.totalCreditAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 arabic-text">صافي المركز المالي</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    analytics.netPosition >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(Math.abs(analytics.netPosition))}
                  </p>
                  <p className={cn(
                    'text-sm',
                    analytics.netPosition >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {analytics.netPosition >= 0 ? 'موجب' : 'سالب'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلترة وتحليل متقدم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              type="text"
              placeholder="البحث في الوكلاء..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />

            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="w-full form-input input-rtl arabic-text"
            >
              <option value="all">جميع مستويات المخاطر</option>
              <option value="critical">حرج جداً</option>
              <option value="high">عالي</option>
              <option value="medium">متوسط</option>
              <option value="low">منخفض</option>
            </select>

            <select
              value={filters.balanceType}
              onChange={(e) => setFilters(prev => ({ ...prev, balanceType: e.target.value }))}
              className="w-full form-input input-rtl arabic-text"
            >
              <option value="all">جميع أنواع الأرصدة</option>
              <option value="debtors">المدينون فقط</option>
              <option value="creditors">الدائنون فقط</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="w-full form-input input-rtl arabic-text"
            >
              <option value="balance">الرصيد</option>
              <option value="name">الاسم</option>
              <option value="profitability">الربحية</option>
            </select>

            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
              className="w-full form-input input-rtl arabic-text"
            >
              <option value="desc">تنازلي</option>
              <option value="asc">تصاعدي</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            النتائج ({sortedAgents.length} وكيل)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedAgents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 arabic-text">
              لا توجد نتائج تطابق معايير البحث
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      الوكيل
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      الرصيد الحالي
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      مستوى المخاطر
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      المعاملات
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      الربحية
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      آخر نشاط
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 arabic-text">
                            {agent.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {agent.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className={cn(
                          'text-sm font-bold',
                          agent.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatCurrency(Math.abs(agent.netBalance))}
                        </div>
                        <div className={cn(
                          'text-xs',
                          agent.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {agent.netBalance >= 0 ? 'دائن' : 'مدين'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-semibold rounded-full border',
                          getRiskColor(agent.riskLevel)
                        )}>
                          {getRiskLabel(agent.riskLevel)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {agent.transactionCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(agent.profitability)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {agent.lastTransactionDate ? (
                          <div>
                            <div>{formatDate(agent.lastTransactionDate)}</div>
                            <div className="text-xs">
                              ({agent.daysSinceLastTransaction} يوم)
                            </div>
                          </div>
                        ) : (
                          'لا توجد'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

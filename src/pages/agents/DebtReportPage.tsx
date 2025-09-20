import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Download, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  DollarSign,
  Calendar,
  FileText,
  Eye,
  CreditCard,
  Filter
} from 'lucide-react'
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore'
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

interface DebtSummary {
  totalDebtors: number
  totalCreditors: number
  totalDebtAmount: number
  totalCreditAmount: number
  netAmount: number
  highRiskDebtors: Agent[]
  overduePayments: number
}

interface AgentDebtInfo extends Agent {
  debtAmount: number
  creditAmount: number
  netBalance: number
  lastPaymentDate?: Date
  daysSinceLastPayment?: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export function DebtReportPage() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  const [agents, setAgents] = useState<AgentDebtInfo[]>([])
  const [transactions, setTransactions] = useState<AgentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null)
  
  const [filters, setFilters] = useState({
    search: '',
    riskLevel: 'all',
    balanceType: 'all', // all, debtors, creditors
    sortBy: 'balance',
    sortOrder: 'desc'
  })

  useEffect(() => {
    if (userData) {
      loadDebtData()
    }
  }, [userData])

  const loadDebtData = async () => {
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

      setTransactions(transactionsData)

      // Process debt information for each agent
      const agentDebtInfo = agentsData.map(agent => {
        const agentTransactions = transactionsData.filter(t => t.agentId === agent.id)
        
        // Calculate debt and credit amounts
        let debtAmount = 0
        let creditAmount = 0
        let lastPaymentDate: Date | undefined
        
        agentTransactions.forEach(transaction => {
          if (transaction.amount < 0) {
            debtAmount += Math.abs(transaction.amount)
          } else {
            creditAmount += transaction.amount
          }
          
          // Track last payment
          if (transaction.type === 'payment' && transaction.createdAt) {
            const transactionDate = transaction.createdAt.toDate ? 
              transaction.createdAt.toDate() : 
              new Date(transaction.createdAt)
            
            if (!lastPaymentDate || transactionDate > lastPaymentDate) {
              lastPaymentDate = transactionDate
            }
          }
        })

        const netBalance = agent.currentBalance
        const daysSinceLastPayment = lastPaymentDate ? 
          Math.floor((new Date().getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)) : 
          undefined

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
        if (netBalance < 0) {
          const debtAmount = Math.abs(netBalance)
          if (debtAmount > 100000) riskLevel = 'critical'
          else if (debtAmount > 50000) riskLevel = 'high'
          else if (debtAmount > 20000) riskLevel = 'medium'
        }

        // Consider days since last payment
        if (daysSinceLastPayment && daysSinceLastPayment > 60 && netBalance < 0) {
          riskLevel = riskLevel === 'critical' ? 'critical' : 
                     riskLevel === 'high' ? 'critical' : 'high'
        }

        return {
          ...agent,
          debtAmount,
          creditAmount,
          netBalance,
          lastPaymentDate,
          daysSinceLastPayment,
          riskLevel
        } as AgentDebtInfo
      })

      setAgents(agentDebtInfo)

      // Calculate summary
      const summary: DebtSummary = {
        totalDebtors: agentDebtInfo.filter(a => a.netBalance < 0).length,
        totalCreditors: agentDebtInfo.filter(a => a.netBalance > 0).length,
        totalDebtAmount: agentDebtInfo.reduce((sum, a) => sum + (a.netBalance < 0 ? Math.abs(a.netBalance) : 0), 0),
        totalCreditAmount: agentDebtInfo.reduce((sum, a) => sum + (a.netBalance > 0 ? a.netBalance : 0), 0),
        netAmount: agentDebtInfo.reduce((sum, a) => sum + a.netBalance, 0),
        highRiskDebtors: agentDebtInfo.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical'),
        overduePayments: agentDebtInfo.filter(a => a.daysSinceLastPayment && a.daysSinceLastPayment > 30 && a.netBalance < 0).length
      }

      setDebtSummary(summary)

    } catch (error) {
      console.error('Error loading debt data:', error)
      toast.error('خطأ في تحميل بيانات المديونيات')
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
      case 'lastPayment':
        const aDate = a.lastPaymentDate?.getTime() || 0
        const bDate = b.lastPaymentDate?.getTime() || 0
        return (aDate - bDate) * order
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
      case 'critical': return 'حرج'
      case 'high': return 'عالي'
      case 'medium': return 'متوسط'
      default: return 'منخفض'
    }
  }

  const exportDebtReport = async () => {
    try {
      const reportData = {
        summary: debtSummary,
        agents: sortedAgents,
        generatedAt: new Date().toISOString(),
        generatedBy: userData?.name || 'غير معروف'
      }

      const reportContent = `
تقرير المديونيات الشامل
تاريخ التقرير: ${formatDate(new Date())}
المُعد بواسطة: ${userData?.name || 'غير معروف'}

ملخص المديونيات:
- إجمالي المدينين: ${debtSummary?.totalDebtors || 0} وكيل
- إجمالي الدائنين: ${debtSummary?.totalCreditors || 0} وكيل
- إجمالي المديونيات: ${formatCurrency(debtSummary?.totalDebtAmount || 0)}
- إجمالي الأرصدة الدائنة: ${formatCurrency(debtSummary?.totalCreditAmount || 0)}
- صافي المبلغ: ${formatCurrency(debtSummary?.netAmount || 0)}
- الوكلاء عالي المخاطر: ${debtSummary?.highRiskDebtors.length || 0} وكيل
- المدفوعات المتأخرة: ${debtSummary?.overduePayments || 0} وكيل

تفاصيل الوكلاء:
${sortedAgents.map(agent => `
- ${agent.name}:
  الرصيد: ${formatCurrency(agent.netBalance)}
  مستوى المخاطر: ${getRiskLabel(agent.riskLevel)}
  آخر دفعة: ${agent.lastPaymentDate ? formatDate(agent.lastPaymentDate) : 'لا توجد'}
  الهاتف: ${agent.phone}
`).join('')}
      `

      console.log('Debt Report:', reportContent)
      toast.success('تم إنشاء تقرير المديونيات بنجاح')

    } catch (error) {
      console.error('Error exporting debt report:', error)
      toast.error('خطأ في تصدير التقرير')
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
        <LoadingSpinner text="جاري تحميل تقرير المديونيات..." />
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
              تقرير المديونيات الشامل
            </h1>
            <p className="text-gray-600 arabic-text">
              نظرة شاملة على مديونيات وأرصدة جميع الوكلاء
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportDebtReport}>
            <Download className="ml-2 h-4 w-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {debtSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المدينين</p>
                  <p className="text-2xl font-bold text-red-600">{debtSummary.totalDebtors}</p>
                  <p className="text-sm text-red-600">{formatCurrency(debtSummary.totalDebtAmount)}</p>
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
                  <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الدائنين</p>
                  <p className="text-2xl font-bold text-green-600">{debtSummary.totalCreditors}</p>
                  <p className="text-sm text-green-600">{formatCurrency(debtSummary.totalCreditAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 arabic-text">عالي المخاطر</p>
                  <p className="text-2xl font-bold text-orange-600">{debtSummary.highRiskDebtors.length}</p>
                  <p className="text-sm text-orange-600">وكيل</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 arabic-text">صافي المبلغ</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    debtSummary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(Math.abs(debtSummary.netAmount))}
                  </p>
                  <p className={cn(
                    'text-sm',
                    debtSummary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {debtSummary.netAmount >= 0 ? 'رصيد دائن' : 'رصيد مدين'}
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
            فلترة وترتيب البيانات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Input
                type="text"
                placeholder="البحث في الوكلاء..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>

            <div>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="all">جميع المستويات</option>
                <option value="critical">حرج</option>
                <option value="high">عالي</option>
                <option value="medium">متوسط</option>
                <option value="low">منخفض</option>
              </select>
            </div>

            <div>
              <select
                value={filters.balanceType}
                onChange={(e) => setFilters(prev => ({ ...prev, balanceType: e.target.value }))}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="all">جميع الأرصدة</option>
                <option value="debtors">المدينون فقط</option>
                <option value="creditors">الدائنون فقط</option>
              </select>
            </div>

            <div>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="balance">الرصيد</option>
                <option value="name">الاسم</option>
                <option value="lastPayment">آخر دفعة</option>
              </select>
            </div>

            <div>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="desc">تنازلي</option>
                <option value="asc">تصاعدي</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            قائمة الوكلاء ({sortedAgents.length} وكيل)
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
                      آخر دفعة
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider arabic-text">
                      الإجراءات
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
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {agent.lastPaymentDate ? (
                          <div>
                            <div>{formatDate(agent.lastPaymentDate)}</div>
                            <div className="text-xs">
                              ({agent.daysSinceLastPayment} يوم)
                            </div>
                          </div>
                        ) : (
                          'لا توجد'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/agents/details/${agent.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/agents/statement/${agent.id}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/agents/payments/${agent.id}`)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        </div>
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

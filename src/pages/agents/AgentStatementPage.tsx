import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Filter,
  FileText,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Package,
  DollarSign,
  FileSpreadsheet,
  Printer
} from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { useAuth } from '@/hooks/useAuth'
import { useAgentPermissions } from '@/lib/agentPermissions'
import { Agent, AgentTransaction } from '@/types'
import { formatDate } from '@/lib/utils'
import { 
  formatCurrency, 
  safeNumber
} from '@/lib/numberUtils'
import { cn } from '@/lib/utils'
import { 
  printReport, 
  exportToCSV, 
  ExportData, 
  ExportOptions, 
  TableColumn 
} from '@/lib/modernExport'

interface StatementFilter {
  startDate: string
  endDate: string
  transactionType: 'all' | 'debt_increase' | 'debt_decrease' | 'debt' | 'commission' | 'payment' | 'adjustment' | 'sale' | 'credit' | 'debit'
}

interface StatementSummary {
  totalDebit: number // إجمالي المدين (ما على الوكيل)
  totalCredit: number // إجمالي الدائن (ما للوكيل)
  netBalance: number // الرصيد الصافي
  transactionCount: number
}

export function AgentStatementPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const { userData: authUserData } = useAuth()
  const { 
    getAgentById, 
    getAgentTransactions 
  } = useAgentPermissions()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [transactions, setTransactions] = useState<AgentTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<AgentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatementFilter>({
    startDate: '',
    endDate: '',
    transactionType: 'all'
  })

  useEffect(() => {
    if (id && userData) {
      // التحقق من الصلاحيات - إذا كان المستخدم وكيل، يجب أن يرى كشف حسابه فقط
      if (authUserData?.role === 'agent' && authUserData.id !== id) {
        toast.error('لا يمكنك الوصول لكشف حساب وكيل آخر')
        navigate('/dashboard')
        return
      }
      loadAgentData()
    }
  }, [id, userData, authUserData, navigate])

  useEffect(() => {
    applyFilters()
  }, [transactions, filter])

  const loadAgentData = async () => {
    if (!id) {
      console.log('❌ [AGENT STATEMENT] No agent ID provided')
      return
    }

    try {
      setLoading(true)
      console.log('🔍 [AGENT STATEMENT] Loading agent data for ID:', id)
      
      // استخدام نظام الصلاحيات الجديد
      const agentData = await getAgentById(id)
      if (!agentData) {
        console.log('❌ [AGENT STATEMENT] Agent not found:', id)
        setAgent(null)
        toast.error('لم يتم العثور على بيانات الوكيل')
        return
      }
      
      console.log('✅ [AGENT STATEMENT] Agent data loaded:', agentData)
      console.log('💰 [AGENT STATEMENT] Agent current balance:', agentData.currentBalance)
      setAgent(agentData as any) // تحويل النوع مؤقتاً

      // تحميل المعاملات باستخدام نظام الصلاحيات
      console.log('📊 [AGENT STATEMENT] Loading transactions...')
      const transactionsData = await getAgentTransactions(id)
      
      console.log('✅ [AGENT STATEMENT] Transactions loaded:', transactionsData.length, 'transactions')
      console.log('📋 [AGENT STATEMENT] Transaction details:', transactionsData)
      
      // تحليل أنواع المعاملات
      const transactionTypes = transactionsData.reduce((acc: any, t: any) => {
        acc[t.type] = (acc[t.type] || 0) + 1
        return acc
      }, {})
      console.log('📊 [AGENT STATEMENT] Transaction types breakdown:', transactionTypes)
      
      // حساب إجمالي المبالغ
      const totalAmount = transactionsData.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
      console.log('💰 [AGENT STATEMENT] Total transactions amount:', totalAmount)
      
      setTransactions(transactionsData as any) // تحويل النوع مؤقتاً
      
    } catch (error) {
      console.error('Error loading agent data:', error)
      toast.error('خطأ في تحميل بيانات الوكيل')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // إخفاء المعاملات المكررة والغير مرغوب فيها
    console.log('🔍 [AGENT STATEMENT] Filtering unwanted transactions...')
    
    // إخفاء معاملات العمولة والمديونية المنفصلة (المكررة)
    // نبقي فقط على المعاملات الأساسية: debit, debt_increase, payment, adjustment
    filtered = filtered.filter(transaction => {
      const shouldHide = (
        transaction.type === 'commission' || // إخفاء معاملات العمولة المنفصلة
        transaction.type === 'debt' || // إخفاء معاملات المديونية المنفصلة
        transaction.type === 'sale' || // إخفاء معاملات البيع المكررة
        (transaction.amount === 0) // إخفاء المعاملات بمبلغ صفر
      )
      
      if (shouldHide) {
        console.log('🚫 [AGENT STATEMENT] Hiding transaction:', transaction.type, transaction.description, transaction.amount)
      }
      
      return !shouldHide
    })

    console.log('✅ [AGENT STATEMENT] Filtered transactions count:', filtered.length)

    // Filter by date range
    if (filter.startDate) {
      const startDate = new Date(filter.startDate)
      filtered = filtered.filter(transaction => {
        const transactionDate = transaction.createdAt instanceof Timestamp 
          ? transaction.createdAt.toDate() 
          : new Date(transaction.createdAt)
        return transactionDate >= startDate
      })
    }

    if (filter.endDate) {
      const endDate = new Date(filter.endDate)
      endDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(transaction => {
        const transactionDate = transaction.createdAt instanceof Timestamp 
          ? transaction.createdAt.toDate() 
          : new Date(transaction.createdAt)
        return transactionDate <= endDate
      })
    }

    // Filter by transaction type
    if (filter.transactionType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filter.transactionType)
    }

    setFilteredTransactions(filtered)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <Package className="h-4 w-4 text-purple-500" />
      case 'debt_increase':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'debt_decrease':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'commission':
        return <DollarSign className="h-4 w-4 text-blue-500" />
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-500" />
      case 'credit':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'debit':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'adjustment':
        return <FileText className="h-4 w-4 text-orange-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'sale':
        return 'مبيعات'
      case 'debt_increase':
        return 'زيادة مديونية'
      case 'debt_decrease':
        return 'تقليل مديونية'
      case 'debt':
        return 'مديونية'
      case 'commission':
        return 'عمولة'
      case 'payment':
        return 'دفعة'
      case 'credit':
        return 'رصيد دائن'
      case 'debit':
        return 'رصيد مدين'
      case 'adjustment':
        return 'تسوية'
      default:
        return 'معاملة'
    }
  }

  const getAmountColor = (amount: number) => {
    if (amount > 0) return 'text-green-600'
    if (amount < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const calculateSummary = (): StatementSummary => {
    let totalDebit = 0  // إجمالي المدين (ما على الوكيل)
    let totalCredit = 0 // إجمالي الدائن (ما للوكيل)
    
    filteredTransactions.forEach(transaction => {
      const amount = safeNumber(transaction.amount)
      
      if (amount < 0) {
        // مدين - ما على الوكيل (مديونية)
        totalDebit += Math.abs(amount)
      } else if (amount > 0) {
        // دائن - ما للوكيل (عمولات، دفعات)
        totalCredit += amount
      }
    })

    return {
      totalDebit,
      totalCredit,
      netBalance: totalCredit - totalDebit, // الرصيد الصافي
      transactionCount: filteredTransactions.length
    }
  }

  const generatePDFReport = async () => {
    try {
      toast.info('جاري إنشاء تقرير PDF...')
      
      const summary = calculateSummary()
      
      // إعداد أعمدة الجدول
      const columns: TableColumn[] = [
        { key: 'date', label: 'التاريخ', align: 'right', width: '15%' },
        { key: 'type', label: 'نوع المعاملة', align: 'right', width: '20%' },
        { key: 'description', label: 'البيان', align: 'right', width: '30%' },
        { 
          key: 'debit', 
          label: 'مدين', 
          align: 'center', 
          width: '12%',
          format: (value) => value ? formatCurrency(value) : '-'
        },
        { 
          key: 'credit', 
          label: 'دائن', 
          align: 'center', 
          width: '12%',
          format: (value) => value ? formatCurrency(value) : '-'
        },
        { 
          key: 'balance', 
          label: 'الرصيد', 
          align: 'center', 
          width: '11%',
          format: (value) => value !== undefined ? formatCurrency(value) : '-'
        }
      ]
      
      // إعداد بيانات الجدول
      const rows = filteredTransactions.map(transaction => ({
        date: formatDate(transaction.createdAt instanceof Timestamp 
          ? transaction.createdAt.toDate() 
          : new Date(transaction.createdAt)
        ),
        type: getTransactionTypeLabel(transaction.type),
        description: transaction.description || '-',
        debit: transaction.amount < 0 ? Math.abs(transaction.amount) : null,
        credit: transaction.amount > 0 ? transaction.amount : null,
        balance: transaction.newBalance
      }))
      
      // إعداد الإجماليات
      const totals = {
        date: '',
        type: '',
        description: 'الإجمالي',
        debit: summary.totalDebit,
        credit: summary.totalCredit,
        balance: agent?.currentBalance || 0
      }
      
      // إعداد بيانات التصدير
      const exportData: ExportData = {
        headers: columns,
        rows: rows,
        totals: totals,
        summary: {
          totalDebit: summary.totalDebit,
          totalCredit: summary.totalCredit,
          netBalance: summary.netBalance,
          transactionCount: summary.transactionCount,
          currentBalance: agent?.currentBalance || 0
        }
      }
      
      // إعداد خيارات التصدير
      const exportOptions: ExportOptions = {
        title: `كشف حساب الوكيل - ${agent?.name}`,
        subtitle: `الفترة: ${filter.startDate || 'من البداية'} إلى ${filter.endDate || 'حتى الآن'}`,
        companyName: 'شركة الفرحان للموتوسيكلات',
        companyLogo: '🏍️',
        reportDate: new Date(),
        watermark: 'الفرحان',
        filters: {
          agentName: agent?.name,
          agentPhone: agent?.phone,
          startDate: filter.startDate || 'من البداية',
          endDate: filter.endDate || 'حتى الآن',
          transactionType: getTransactionTypeLabel(filter.transactionType === 'all' ? 'all' : filter.transactionType),
          transactionCount: summary.transactionCount
        }
      }
      
      // طباعة التقرير
      printReport(exportData, exportOptions)
      
      toast.success('تم إنشاء تقرير PDF بنجاح!')
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('خطأ في إنشاء التقرير')
    }
  }

  const exportToExcel = async () => {
    try {
      toast.info('جاري تصدير Excel...')
      
      const summary = calculateSummary()
      
      // إعداد أعمدة الجدول
      const columns: TableColumn[] = [
        { key: 'date', label: 'التاريخ', align: 'right' },
        { key: 'type', label: 'نوع المعاملة', align: 'right' },
        { key: 'description', label: 'البيان', align: 'right' },
        { 
          key: 'debit', 
          label: 'مدين', 
          align: 'center',
          format: (value) => value ? formatCurrency(value) : ''
        },
        { 
          key: 'credit', 
          label: 'دائن', 
          align: 'center',
          format: (value) => value ? formatCurrency(value) : ''
        },
        { 
          key: 'balance', 
          label: 'الرصيد', 
          align: 'center',
          format: (value) => value !== undefined ? formatCurrency(value) : ''
        }
      ]
      
      // إعداد بيانات الجدول
      const rows = filteredTransactions.map(transaction => ({
        date: formatDate(transaction.createdAt instanceof Timestamp 
          ? transaction.createdAt.toDate() 
          : new Date(transaction.createdAt)
        ),
        type: getTransactionTypeLabel(transaction.type),
        description: transaction.description || '-',
        debit: transaction.amount < 0 ? Math.abs(transaction.amount) : null,
        credit: transaction.amount > 0 ? transaction.amount : null,
        balance: transaction.newBalance
      }))
      
      // إعداد الإجماليات
      const totals = {
        date: '',
        type: '',
        description: 'الإجمالي',
        debit: summary.totalDebit,
        credit: summary.totalCredit,
        balance: agent?.currentBalance || 0
      }
      
      // إعداد بيانات التصدير
      const exportData: ExportData = {
        headers: columns,
        rows: rows,
        totals: totals
      }
      
      // تصدير CSV
      const filename = `كشف_حساب_${agent?.name}_${new Date().toISOString().split('T')[0]}`
      exportToCSV(exportData, filename)
      
      toast.success('تم تصدير Excel بنجاح!')
      
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('خطأ في تصدير Excel')
    }
  }

  if (loading) {
    return <LoadingSpinner text="جاري تحميل كشف الحساب..." />
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900 arabic-text mb-4">
          الوكيل غير موجود
        </h2>
        <Button onClick={() => navigate('/agents')}>
          العودة لقائمة الوكلاء
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/agents/details/${id}`)}
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">
              كشف حساب الوكيل
            </h1>
            <p className="text-gray-600 arabic-text">
              {agent.name} - {agent.phone}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDFReport} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            طباعة PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            الرصيد الحالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className={cn('text-4xl font-bold', getAmountColor(agent.currentBalance))}>
              {formatCurrency(Math.abs(agent.currentBalance))}
            </p>
            <p className={cn('text-lg', getAmountColor(agent.currentBalance))}>
              {agent.currentBalance >= 0 ? 'رصيد دائن' : 'رصيد مدين'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلترة المعاملات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">من تاريخ</label>
              <Input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
              <Input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع المعاملة</label>
              <select
                value={filter.transactionType}
                onChange={(e) => setFilter(prev => ({ ...prev, transactionType: e.target.value as any }))}
                className="form-select w-full"
              >
                <option value="all">جميع المعاملات</option>
                <option value="sale">مبيعات</option>
                <option value="payment">مدفوعات</option>
                <option value="debt_increase">زيادة مديونية</option>
                <option value="debt_decrease">تقليل مديونية</option>
                <option value="debt">مديونية</option>
                <option value="commission">عمولة</option>
                <option value="credit">رصيد دائن</option>
                <option value="debit">رصيد مدين</option>
                <option value="adjustment">تسوية</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilter({ startDate: '', endDate: '', transactionType: 'all' })}
                className="w-full"
              >
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Account Statement Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              كشف الحساب ({filteredTransactions.length} معاملة)
            </div>
            <div className="flex gap-2">
              <Button
                onClick={generatePDFReport}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Printer className="h-4 w-4" />
                طباعة PDF
              </Button>
              <Button
                onClick={exportToExcel}
                className="flex items-center gap-2"
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4" />
                تصدير Excel
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد معاملات في الفترة المحددة
            </div>
          ) : (
            <>
              {/* Statement Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-right arabic-text font-semibold">التاريخ</th>
                      <th className="border border-gray-300 px-4 py-3 text-right arabic-text font-semibold">البيان</th>
                      <th className="border border-gray-300 px-4 py-3 text-center arabic-text font-semibold">مدين</th>
                      <th className="border border-gray-300 px-4 py-3 text-center arabic-text font-semibold">دائن</th>
                      <th className="border border-gray-300 px-4 py-3 text-center arabic-text font-semibold">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction, index) => {
                      const isDebit = transaction.amount < 0
                      const isCredit = transaction.amount > 0
                      
                      return (
                        <tr key={transaction.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-3 text-sm">
                            {formatDate(transaction.createdAt instanceof Timestamp 
                              ? transaction.createdAt.toDate() 
                              : new Date(transaction.createdAt)
                            )}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm arabic-text">
                            <div>
                              <span className="font-medium">{getTransactionTypeLabel(transaction.type)}</span>
                              <br />
                              <span className="text-gray-600">{transaction.description}</span>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            {isDebit ? (
                              <span className="font-semibold text-red-600">
                                {formatCurrency(Math.abs(transaction.amount))}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            {isCredit ? (
                              <span className="font-semibold text-green-600">
                                {formatCurrency(transaction.amount)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            {transaction.newBalance !== undefined ? (
                              <span className={cn('font-semibold', getAmountColor(transaction.newBalance))}>
                                {formatCurrency(transaction.newBalance)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 font-bold">
                      <td colSpan={2} className="border border-gray-300 px-4 py-3 text-right arabic-text font-bold">
                        الإجمالي
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-red-600 font-bold">
                        {formatCurrency(calculateSummary().totalDebit)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-green-600 font-bold">
                        {formatCurrency(calculateSummary().totalCredit)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-bold">
                        <span className={cn('font-bold', getAmountColor(agent?.currentBalance || 0))}>
                          {formatCurrency(agent?.currentBalance || 0)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600 arabic-text">إجمالي المدين</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(calculateSummary().totalDebit)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600 arabic-text">إجمالي الدائن</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(calculateSummary().totalCredit)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600 arabic-text">الرصيد الصافي</p>
                    <p className={cn('text-2xl font-bold', getAmountColor(agent?.currentBalance || 0))}>
                      {formatCurrency(agent?.currentBalance || 0)}
                    </p>
                    <p className={cn('text-sm', getAmountColor(agent?.currentBalance || 0))}>
                      {(agent?.currentBalance || 0) >= 0 ? 'رصيد دائن' : 'رصيد مدين'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

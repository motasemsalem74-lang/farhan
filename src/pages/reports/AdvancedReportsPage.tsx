import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Package, 
  Users, 
  FileText,
  DollarSign,
  Filter,
  RefreshCw,
  Eye,
  Zap,
  Warehouse,
  ShoppingCart,
  TrendingDown,
  Activity,
  Building2,
  Percent,
  Calculator
} from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { formatCurrency, isAdmin, isSuperAdmin } from '@/lib/utils'
import { 
  generateComprehensiveReport, 
  exportToExcel,
  exportToPDF,
  AdvancedReportFilters,
  ComprehensiveReport
} from '@/lib/advancedReports'
import {
  SimpleLineChart,
  ComparisonCard,
  DonutChart,
  SimpleBarChart,
  InsightCard,
  MetricsGrid
} from '@/components/ui/AdvancedCharts'

type TabType = 'overview' | 'sales' | 'inventory' | 'agents' | 'documents'

export default function AdvancedReportsPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ComprehensiveReport | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  const [filters, setFilters] = useState<AdvancedReportFilters>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    period: 'monthly',
    comparison: 'previous_period'
  })

  const handleFilterChange = (key: keyof AdvancedReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Auto-generate report on component mount
  useEffect(() => {
    console.log('🔄 Auto-generating report on page load...')
    generateReport()
  }, [])

  const generateReport = async () => {
    if (!user || !userData) {
      console.log('❌ User or userData not available, but continuing with report generation')
    }

    console.log('🚀 Starting report generation...')

    setLoading(true)
    try {
      const data = await generateComprehensiveReport(filters)
      console.log('📊 [UI] Report data received:', data)
      console.log('📊 [UI] Sales summary:', data?.sales?.summary)
      console.log('📊 [UI] Inventory summary:', data?.inventory?.summary)
      console.log('📊 [UI] Agents summary:', data?.agents?.summary)
      
      // Debug specific fields
      console.log('🔍 [UI] Sales fields check:', {
        totalSales: data?.sales?.summary?.totalSales,
        totalAmount: data?.sales?.summary?.totalAmount,
        companyShare: data?.sales?.summary?.companyShare,
        agentCommissions: data?.sales?.summary?.agentCommissions,
        totalProfit: data?.sales?.summary?.totalProfit
      })
      
      console.log('🔍 [UI] Inventory fields check:', {
        totalItems: data?.inventory?.summary?.totalItems,
        availableItems: data?.inventory?.summary?.availableItems,
        companyItems: data?.inventory?.summary?.companyItems,
        agentItems: data?.inventory?.summary?.agentItems
      })
      
      setReportData(data)
      toast.success('تم إنشاء التقرير بنجاح')
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('حدث خطأ في إنشاء التقرير')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    if (!reportData) return
    const filename = `تقرير-متقدم-${new Date().toISOString().split('T')[0]}`
    exportToExcel(reportData, filename)
  }

  const handleExportPDF = () => {
    if (!reportData) return
    const filename = `تقرير-متقدم-${new Date().toISOString().split('T')[0]}`
    exportToPDF(reportData, filename)
  }

  const getTabLabel = (tab: TabType): string => {
    const labels = {
      overview: 'النظرة العامة',
      sales: 'المبيعات',
      inventory: 'المخزون',
      agents: 'الوكلاء',
      documents: 'الوثائق'
    }
    return labels[tab]
  }

  const getTabIcon = (tab: TabType) => {
    const icons = {
      overview: <Activity className="h-4 w-4" />,
      sales: <ShoppingCart className="h-4 w-4" />,
      inventory: <Warehouse className="h-4 w-4" />,
      agents: <Users className="h-4 w-4" />,
      documents: <FileText className="h-4 w-4" />
    }
    return icons[tab]
  }

  useEffect(() => {
    if (user && userData && (isAdmin(userData.role) || isSuperAdmin(userData.role))) {
      generateReport()
    }
  }, [user, userData])

  if (!user || !userData) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="جاري التحقق من الصلاحيات..." />
      </div>
    )
  }

  if (!isAdmin(userData.role) && !isSuperAdmin(userData.role)) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-xl mb-4">⚠️ ليس لديك صلاحية لعرض هذه الصفحة</div>
        <p className="text-gray-600">يجب أن تكون مديراً أو مديراً عاماً للوصول إلى التقارير المتقدمة</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">📊 التقارير والتحليلات المتقدمة</h1>
          <p className="text-gray-600 arabic-text">تقارير شاملة وتحليلات تفاعلية لأداء المؤسسة</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            تحديث التقرير
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={!reportData}>
            <Download className="ml-2 h-4 w-4" />
            تصدير Excel
          </Button>
          <Button onClick={handleExportPDF} disabled={!reportData}>
            <Download className="ml-2 h-4 w-4" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Filter className="h-5 w-5" />
            فلاتر التقرير المتقدمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                من تاريخ
              </label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                إلى تاريخ
              </label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                الفترة
              </label>
              <select
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="quarterly">ربع سنوي</option>
                <option value="yearly">سنوي</option>
                <option value="custom">مخصص</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                المقارنة
              </label>
              <select
                value={filters.comparison}
                onChange={(e) => handleFilterChange('comparison', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="none">بدون مقارنة</option>
                <option value="previous_period">الفترة السابقة</option>
                <option value="same_period_last_year">نفس الفترة العام الماضي</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 rtl:space-x-reverse">
          {(['overview', 'sales', 'inventory', 'agents', 'documents'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm arabic-text
                ${activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {getTabIcon(tab)}
              {getTabLabel(tab)}
            </button>
          ))}
        </nav>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="جاري تحليل البيانات وإنشاء التقارير المتقدمة..." />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* إجمالي المبيعات */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المبيعات</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData?.sales?.summary?.totalRecords || reportData?.sales?.summary?.totalSales || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">عملية بيع</p>
                      </div>
                      <ShoppingCart className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* قيمة المبيعات */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">قيمة المبيعات</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(reportData?.sales?.summary?.totalValue || reportData?.sales?.summary?.totalAmount || 0)}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">إجمالي القيمة</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* حصة المؤسسة */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">حصة المؤسسة</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(reportData?.sales?.summary?.companyShare || 0)}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">نصيب الشركة</p>
                      </div>
                      <Building2 className="h-8 w-8 text-emerald-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* عمولات الوكلاء */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">عمولات الوكلاء</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(reportData?.sales?.summary?.agentCommissions || 0)}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">إجمالي العمولات</p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">إجمالي الأرباح</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(reportData.sales?.summary?.totalProfit || 0)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">هامش الربح</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData.sales?.summary?.totalValue && reportData.sales?.summary?.totalProfit 
                            ? `${((reportData.sales.summary.totalProfit / reportData.sales.summary.totalValue) * 100).toFixed(1)}%`
                            : '0%'}
                        </p>
                      </div>
                      <Percent className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">متوسط قيمة البيع</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(reportData.sales?.summary?.averageValue || 0)}
                        </p>
                      </div>
                      <Calculator className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">اتجاه المبيعات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleLineChart
                      data={reportData.sales?.timeSeries || []}
                      xKey="date"
                      yKey="value"
                      color="#3B82F6"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">توزيع المبيعات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      data={reportData.sales?.categoryBreakdown || []}
                      nameKey="name"
                      valueKey="value"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(reportData.insights || []).map((insight, index) => (
                  <InsightCard
                    key={index}
                    title={insight.title}
                    description={insight.description}
                    type={insight.type}
                    value={insight.value}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Sales Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* إجمالي المبيعات */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المبيعات</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData?.sales?.summary?.totalRecords || reportData?.sales?.summary?.totalSales || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">عملية بيع</p>
                      </div>
                      <ShoppingCart className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* قيمة المبيعات */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">قيمة المبيعات</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(reportData?.sales?.summary?.totalValue || reportData?.sales?.summary?.totalAmount || 0)}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">إجمالي القيمة</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* متوسط قيمة البيع */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">متوسط قيمة البيع</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(reportData?.sales?.summary?.averageValue || 0)}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">متوسط الطلب</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* عمولات الوكلاء */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">عمولات الوكلاء</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(reportData?.sales?.summary?.agentCommissions || 0)}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">إجمالي العمولات</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sales Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">اتجاه المبيعات الشهرية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleLineChart
                      data={reportData.sales?.timeSeries || []}
                      xKey="date"
                      yKey="value"
                      color="#10B981"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">المبيعات حسب الفئة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart
                      data={reportData.sales?.categoryBreakdown || []}
                      xKey="name"
                      yKey="value"
                      color="#3B82F6"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(reportData.sales?.comparisons || []).map((comparison, index) => (
                  <ComparisonCard
                    key={index}
                    title={comparison.title}
                    current={comparison.current}
                    previous={comparison.previous}
                    change={comparison.change}
                    format="currency"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Inventory Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* إجمالي الأصناف المتاحة */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الأصناف المتاحة</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData?.inventory?.summary?.totalRecords || reportData?.inventory?.summary?.totalItems || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">صنف متاح</p>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* مخازن المؤسسة */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">مخازن المؤسسة</p>
                        <p className="text-2xl font-bold text-green-600">
                          {reportData?.inventory?.summary?.companyItems || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">المخزن الرئيسي والمعرض</p>
                      </div>
                      <Building2 className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* مخازن الوكلاء */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">مخازن الوكلاء</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {reportData?.inventory?.summary?.agentItems || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">مخازن الوكلاء</p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* قيمة المخزون */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">قيمة المخزون المتاح</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(reportData?.inventory?.summary?.totalValue || 0)}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">إجمالي القيمة</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Warehouse Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">نسبة مخازن المؤسسة</p>
                        <p className="text-2xl font-bold text-green-600">
                          {reportData.inventory?.summary?.totalItems 
                            ? `${((reportData.inventory.summary.companyItems || 0) / reportData.inventory.summary.totalItems * 100).toFixed(1)}%`
                            : '0%'}
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">نسبة مخازن الوكلاء</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {reportData.inventory?.summary?.totalItems 
                            ? `${((reportData.inventory.summary.agentItems || 0) / reportData.inventory.summary.totalItems * 100).toFixed(1)}%`
                            : '0%'}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Inventory Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">حركة المخزون</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleLineChart
                      data={reportData.inventory?.timeSeries || []}
                      xKey="date"
                      yKey="value"
                      color="#8B5CF6"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">توزيع المخزون</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      data={reportData.inventory?.categoryBreakdown || []}
                      nameKey="name"
                      valueKey="value"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Top Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="arabic-text">الأصناف الأكثر مبيعاً</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(reportData.inventory?.topItems || []).slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium arabic-text">{item.name}</p>
                            <p className="text-sm text-gray-500 arabic-text">الكمية المباعة: {item.soldQuantity}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-green-600">{formatCurrency(item.revenue)}</p>
                          <p className="text-sm text-gray-500">الإيرادات</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Agents Tab */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              {/* Agents Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* إجمالي الوكلاء */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الوكلاء</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData?.agents?.summary?.totalRecords || reportData?.agents?.summary?.totalAgents || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">وكيل مسجل</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* الوكلاء النشطون */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">الوكلاء النشطون</p>
                        <p className="text-2xl font-bold text-green-600">
                          {reportData?.agents?.summary?.activeAgents || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">وكيل نشط</p>
                      </div>
                      <Activity className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* إجمالي العمولات */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي العمولات</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(Math.abs(reportData?.agents?.summary?.totalValue || 0))}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">عمولات مستحقة</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* إجمالي المديونية */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المديونية</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(Math.abs(reportData?.agents?.summary?.totalDebt || reportData?.agents?.summary?.totalValue || 0))}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">مديونية على الوكلاء</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Agents Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">أداء الوكلاء</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart
                      data={reportData.agents?.performanceData || []}
                      xKey="name"
                      yKey="value"
                      color="#F59E0B"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">توزيع العمولات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      data={reportData.agents?.commissionBreakdown || []}
                      nameKey="name"
                      valueKey="value"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Documents Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* إجمالي الوثائق */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الوثائق</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData?.documents?.summary?.totalRecords || reportData?.documents?.summary?.totalDocuments || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">وثيقة مسجلة</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* وثائق مكتملة */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">وثائق مكتملة</p>
                        <p className="text-2xl font-bold text-green-600">
                          {reportData?.documents?.summary?.completedDocuments || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">وثيقة منجزة</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* وثائق معلقة */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">وثائق معلقة</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {reportData?.documents?.summary?.pendingDocuments || 0}
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">في انتظار المعالجة</p>
                      </div>
                      <Eye className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* متوسط المعالجة */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 arabic-text">متوسط المعالجة</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {Math.round(reportData?.documents?.summary?.averageValue || reportData?.documents?.summary?.averageProcessingTime || 0)} يوم
                        </p>
                        <p className="text-xs text-gray-500 arabic-text">متوسط زمن المعالجة</p>
                      </div>
                      <Activity className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Documents Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">معالجة الوثائق</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleLineChart
                      data={reportData.documents?.timeSeries || []}
                      xKey="date"
                      yKey="value"
                      color="#EF4444"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text">حالة الوثائق</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      data={reportData.documents?.statusBreakdown || []}
                      nameKey="name"
                      valueKey="value"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">📊 لا توجد بيانات متاحة</div>
          <p className="text-gray-400 arabic-text">اضغط على "تحديث التقرير" لإنشاء تقرير جديد</p>
        </div>
      )}
    </div>
  )
}

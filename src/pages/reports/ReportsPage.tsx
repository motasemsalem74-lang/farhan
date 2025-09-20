import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Zap
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

export function ReportsPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ComprehensiveReport | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory' | 'agents' | 'documents'>('overview')
  const [filters, setFilters] = useState<AdvancedReportFilters>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    reportType: 'comprehensive',
    period: 'monthly',
    comparison: 'previous_period'
  })

  useEffect(() => {
    if (userData) {
      generateReport()
    }
  }, [userData, filters])

  const generateReport = async () => {
    try {
      setLoading(true)
      console.log('🔄 [REPORTS] Generating comprehensive report with filters:', filters)
      
      // Generate comprehensive report from Firebase data
      const comprehensiveData = await generateComprehensiveReport(filters)
      setReportData(comprehensiveData)
      
      console.log('✅ [REPORTS] Report generated successfully:', comprehensiveData)
      toast.success('تم إنشاء التقرير بنجاح')
      
    } catch (error) {
      console.error('❌ [REPORTS] Error generating report:', error)
      toast.error('حدث خطأ أثناء إنشاء التقرير')
    } finally {
      setLoading(false)
    }
  }

    const handleExportExcel = () => {
    if (!reportData) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }
    
    try {
      const success = exportToExcel(reportData, `تقرير-شامل-${filters.dateFrom}-${filters.dateTo}`)
      if (success) {
        toast.success('تم تصدير التقرير بصيغة Excel بنجاح')
      } else {
        toast.error('فشل في تصدير التقرير')
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('خطأ في تصدير التقرير')
    }
  }
  
  const handleExportPDF = () => {
    if (!reportData) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }
    
    try {
      const success = exportToPDF(reportData, `تقرير-شامل-${filters.dateFrom}-${filters.dateTo}`)
      if (success) {
        toast.success('تم فتح نافذة الطباعة - يمكنك حفظها كملف PDF')
      } else {
        toast.error('فشل في فتح نافذة الطباعة')
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast.error('خطأ في تصدير التقرير')
    }
  }
  
  const handleFilterChange = (key: keyof AdvancedReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'overview': return 'نظرة عامة'
      case 'sales': return 'المبيعات'
      case 'inventory': return 'المخزون'
      case 'agents': return 'الوكلاء'
      case 'documents': return 'الوثائق'
      default: return 'غير محدد'
    }
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'overview': return <BarChart3 className="h-4 w-4" />
      case 'sales': return <DollarSign className="h-4 w-4" />
      case 'inventory': return <Package className="h-4 w-4" />
      case 'agents': return <Users className="h-4 w-4" />
      case 'documents': return <FileText className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
    }
  }


  const canAccessReports = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (!canAccessReports) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          غير مصرح لك بالوصول
        </h2>
        <p className="text-gray-600 arabic-text">
          ليس لديك صلاحية للوصول لنظام التقارير
        </p>
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
            onClick={() => navigate('/reports/advanced')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
          >
            <Zap className="h-4 w-4" />
            التقارير المتقدمة
          </Button>
          <Button
            variant="outline"
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <BarChart3 className="ml-2 h-4 w-4" />
                    تحليل البيانات
                  </>
                )}
              </Button>
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
          {/* Sales Report */}
          {filters.reportType === 'sales' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المبيعات</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData.sales.totalSales}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المبلغ</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.sales.totalAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي العمولات</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.sales.totalCommissions)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">متوسط قيمة الطلب</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(reportData.sales.averageOrderValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Inventory Report */}
          {filters.reportType === 'inventory' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الأصناف</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData.inventory.totalItems}</p>
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
                      <p className="text-sm font-medium text-gray-600 arabic-text">المباع</p>
                      <p className="text-2xl font-bold text-green-600">{reportData.inventory.soldItems}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Package className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">المتاح</p>
                      <p className="text-2xl font-bold text-yellow-600">{reportData.inventory.availableItems}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">قيمة المخزون</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.inventory.totalValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Agents Report */}
          {filters.reportType === 'agents' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الوكلاء</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData.agents.totalAgents}</p>
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
                      <p className="text-sm font-medium text-gray-600 arabic-text">الوكلاء النشطون</p>
                      <p className="text-2xl font-bold text-green-600">{reportData.agents.activeAgents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي العمولات</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.agents.totalCommissions)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المديونية</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.agents.totalDebt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Documents Report */}
          {filters.reportType === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الوثائق</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData.documents.totalDocuments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FileText className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">في الانتظار</p>
                      <p className="text-2xl font-bold text-yellow-600">{reportData.documents.pendingDocuments}</p>
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
                      <p className="text-sm font-medium text-gray-600 arabic-text">مكتملة</p>
                      <p className="text-2xl font-bold text-green-600">{reportData.documents.completedDocuments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">متوسط المعالجة</p>
                      <p className="text-2xl font-bold text-purple-600">{reportData.documents.averageProcessingTime} يوم</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-600 arabic-text">متأخرة</p>
                      <p className="text-2xl font-bold text-red-600">{reportData.documents.overdueDocuments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
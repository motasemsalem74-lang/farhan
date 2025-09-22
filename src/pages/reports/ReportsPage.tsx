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
  Zap,
  AlertCircle,
  Building2,
  UserCheck,
  Calendar,
  PieChart,
  Activity
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
  const [reportData, setReportData] = useState<any>(null)
  const [activeSection, setActiveSection] = useState<'company' | 'agents' | 'comparison'>('company')
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold arabic-text mb-2">📊 التقارير المالية الشاملة</h1>
            <p className="text-blue-100 arabic-text">تحليل مفصل لأداء المؤسسة والوكلاء مع فصل الحسابات</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={generateReport}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              تحديث التقرير
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleExportExcel} 
              disabled={!reportData}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="ml-2 h-4 w-4" />
              Excel
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleExportPDF} 
              disabled={!reportData}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Download className="ml-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gray-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Filter className="h-5 w-5 text-blue-600" />
            فلاتر التقرير المتقدمة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 arabic-text">
                <Calendar className="inline h-4 w-4 mr-1" />
                من تاريخ
              </label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 arabic-text">
                <Calendar className="inline h-4 w-4 mr-1" />
                إلى تاريخ
              </label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 arabic-text">
                <Activity className="inline h-4 w-4 mr-1" />
                الفترة
              </label>
              <select
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                className="w-full form-input input-rtl arabic-text rounded-md border-gray-300"
              >
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="quarterly">ربع سنوي</option>
                <option value="yearly">سنوي</option>
                <option value="custom">مخصص</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 arabic-text">
                <PieChart className="inline h-4 w-4 mr-1" />
                المقارنة
              </label>
              <select
                value={filters.comparison}
                onChange={(e) => handleFilterChange('comparison', e.target.value)}
                className="w-full form-input input-rtl arabic-text rounded-md border-gray-300"
              >
                <option value="none">بدون مقارنة</option>
                <option value="previous_period">الفترة السابقة</option>
                <option value="same_period_last_year">نفس الفترة العام الماضي</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
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

      {/* Section Navigation */}
      <div className="flex justify-center">
        <div className="bg-white rounded-lg shadow-md p-2 flex gap-2">
          {[
            { key: 'company', label: 'حسابات المؤسسة', icon: Building2, color: 'blue' },
            { key: 'agents', label: 'حسابات الوكلاء', icon: UserCheck, color: 'green' },
            { key: 'comparison', label: 'المقارنات والتحليل', icon: TrendingUp, color: 'purple' }
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key as any)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-md font-medium text-sm arabic-text transition-all
                ${activeSection === key
                  ? `bg-${color}-600 text-white shadow-md`
                  : `text-${color}-600 hover:bg-${color}-50`
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-600 arabic-text">جاري تحليل البيانات وإنشاء التقارير المتقدمة...</p>
            <p className="text-sm text-gray-500 arabic-text mt-2">يرجى الانتظار، هذا قد يستغرق بضع ثوانٍ</p>
          </div>
        </div>
      ) : reportData ? (
        <div className="space-y-8">
          {/* Company Financial Report */}
          {activeSection === 'company' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h2 className="text-2xl font-bold text-blue-900 arabic-text mb-2 flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  التقرير المالي للمؤسسة
                </h2>
                <p className="text-blue-700 arabic-text">الأرباح والخسائر الخاصة بالمؤسسة فقط (بدون عمولات الوكلاء)</p>
              </div>

              {/* Company KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600 arabic-text">إجمالي المبيعات</p>
                        <p className="text-3xl font-bold text-green-900">{reportData?.sales?.totalSales || 0}</p>
                        <p className="text-xs text-green-600 arabic-text mt-1">عدد الفواتير المباعة</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <Package className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 arabic-text">إيرادات المؤسسة</p>
                        <p className="text-3xl font-bold text-blue-900">{formatCurrency((reportData?.sales?.totalAmount || 0) - (reportData?.sales?.totalCommissions || 0))}</p>
                        <p className="text-xs text-blue-600 arabic-text mt-1">بعد خصم عمولات الوكلاء</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <DollarSign className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600 arabic-text">قيمة المخزون</p>
                        <p className="text-3xl font-bold text-purple-900">{formatCurrency(reportData?.inventory?.totalValue || 0)}</p>
                        <p className="text-xs text-purple-600 arabic-text mt-1">إجمالي قيمة المخزون</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <Package className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600 arabic-text">صافي ربح المؤسسة</p>
                        <p className="text-3xl font-bold text-orange-900">
                          {formatCurrency(((reportData?.sales?.totalAmount || 0) - (reportData?.sales?.totalCommissions || 0)) - (reportData?.inventory?.totalValue || 0))}
                        </p>
                        <p className="text-xs text-orange-600 arabic-text mt-1">الربح النهائي للمؤسسة</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-full">
                        <TrendingUp className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Agents Financial Report */}
          {activeSection === 'agents' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h2 className="text-2xl font-bold text-green-900 arabic-text mb-2 flex items-center gap-2">
                  <UserCheck className="h-6 w-6" />
                  تقرير أرباح الوكلاء
                </h2>
                <p className="text-green-700 arabic-text">العمولات والأرباح المستحقة للوكلاء من المبيعات</p>
              </div>

              {/* Agents KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 arabic-text">إجمالي الوكلاء</p>
                        <p className="text-3xl font-bold text-blue-900">{reportData?.agents?.totalAgents || 0}</p>
                        <p className="text-xs text-blue-600 arabic-text mt-1">عدد الوكلاء المسجلين</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600 arabic-text">الوكلاء النشطون</p>
                        <p className="text-3xl font-bold text-green-900">{reportData?.agents?.activeAgents || 0}</p>
                        <p className="text-xs text-green-600 arabic-text mt-1">وكلاء لديهم مبيعات</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <UserCheck className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600 arabic-text">إجمالي العمولات</p>
                        <p className="text-3xl font-bold text-purple-900">{formatCurrency(reportData?.agents?.totalCommissions || 0)}</p>
                        <p className="text-xs text-purple-600 arabic-text mt-1">عمولات مستحقة للوكلاء</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <DollarSign className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600 arabic-text">إجمالي المديونية</p>
                        <p className="text-3xl font-bold text-red-900">{formatCurrency(reportData?.agents?.totalDebt || 0)}</p>
                        <p className="text-xs text-red-600 arabic-text mt-1">مبالغ مستحقة على الوكلاء</p>
                      </div>
                      <div className="p-3 bg-red-100 rounded-full">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Comparison and Analysis */}
          {activeSection === 'comparison' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
                <h2 className="text-2xl font-bold text-purple-900 arabic-text mb-2 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  المقارنات والتحليل المالي
                </h2>
                <p className="text-purple-700 arabic-text">مقارنة الأداء مع الفترات السابقة وتحليل الاتجاهات</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      ملخص أداء المؤسسة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-blue-700 arabic-text">صافي إيرادات المؤسسة</span>
                        <span className="font-bold text-blue-900">{formatCurrency((reportData?.sales?.totalAmount || 0) - (reportData?.sales?.totalCommissions || 0))}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700 arabic-text">صافي الربح</span>
                        <span className="font-bold text-green-900">{formatCurrency(((reportData?.sales?.totalAmount || 0) - (reportData?.sales?.totalCommissions || 0)) - (reportData?.inventory?.totalCost || 0))}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="arabic-text flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      ملخص أداء الوكلاء
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700 arabic-text">إجمالي العمولات</span>
                        <span className="font-bold text-green-900">{formatCurrency(reportData?.agents?.totalCommissions || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-red-700 arabic-text">المديونيات</span>
                        <span className="font-bold text-red-900">{formatCurrency(reportData?.agents?.totalDebt || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">لا توجد بيانات</h3>
          <p className="text-gray-600 arabic-text">اضغط على "تحليل البيانات" لإنشاء التقرير</p>
        </div>
      )}
    </div>
  )
}
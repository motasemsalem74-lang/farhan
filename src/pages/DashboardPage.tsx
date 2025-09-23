import React, { useEffect, useState } from 'react'
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'

import { db } from '@/firebase/firebase-config.template'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/firebase/firebase-config.template'
import { formatCurrency, formatNumber, isAdmin, isSuperAdmin } from '@/lib/utils'

interface DashboardStats {
  totalInventory: number
  todaySales: number
  totalAgents: number
  pendingDocuments: number
  monthlyRevenue: number
  profitMargin: number
}

interface RecentActivity {
  id: string
  type: 'sale' | 'transfer' | 'document_update'
  description: string
  timestamp: Date
  amount?: number
}

export function DashboardPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userData) {
      loadDashboardData()
    }
  }, [userData])

  const loadRealDashboardStats = async (): Promise<DashboardStats> => {
    try {
      // Get inventory count
      const inventoryQuery = query(collection(db, 'inventory_items'))
      const inventorySnapshot = await getDocs(inventoryQuery)
      const totalInventory = inventorySnapshot.size

      // Get today's sales from document_tracking (where sales are actually recorded)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const salesQuery = query(
        collection(db, 'document_tracking'),
        where('createdAt', '>=', Timestamp.fromDate(today))
      )
      const salesSnapshot = await getDocs(salesQuery)
      const todaySales = salesSnapshot.size

      // Get agents count
      const agentsQuery = query(collection(db, 'agents'))
      const agentsSnapshot = await getDocs(agentsQuery)
      const totalAgents = agentsSnapshot.size

      // Get pending documents
      const documentsQuery = query(
        collection(db, 'document_tracking'),
        where('status', 'in', ['pending_submission', 'submitted_to_manufacturer'])
      )
      const documentsSnapshot = await getDocs(documentsQuery)
      const pendingDocuments = documentsSnapshot.size

      // Calculate monthly revenue from document_tracking
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthSalesQuery = query(
        collection(db, 'document_tracking'),
        where('createdAt', '>=', Timestamp.fromDate(monthStart))
      )
      const monthSalesSnapshot = await getDocs(monthSalesQuery)
      const monthlyRevenue = monthSalesSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data()
        const salePrice = typeof data.salePrice === 'string' ? parseFloat(data.salePrice) : (data.salePrice || 0)
        return sum + (isNaN(salePrice) ? 0 : salePrice)
      }, 0)

      return {
        totalInventory,
        todaySales,
        totalAgents,
        pendingDocuments,
        monthlyRevenue,
        profitMargin: monthlyRevenue > 0 ? 15.5 : 0
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      return {
        totalInventory: 0,
        todaySales: 0,
        totalAgents: 0,
        pendingDocuments: 0,
        monthlyRevenue: 0,
        profitMargin: 0
      }
    }
  }

  const loadRecentActivities = async (): Promise<RecentActivity[]> => {
    try {
      // Get recent sales from document_tracking
      const recentSalesQuery = query(
        collection(db, 'document_tracking'),
        orderBy('createdAt', 'desc'),
        limit(5)
      )
      const salesSnapshot = await getDocs(recentSalesQuery)
      
      const activities: RecentActivity[] = salesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          type: 'sale' as const,
          description: `تم بيع ${data.motorFingerprint || 'موتوسيكل'} للعميل ${data.customerName || 'غير محدد'}`,
          timestamp: data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : data.createdAt instanceof Date 
              ? data.createdAt 
              : data.createdAt 
                ? new Date(data.createdAt as any)
                : new Date(),
          amount: data.salePrice || 0
        }
      })

      return activities
    } catch (error) {
      console.error('Error loading recent activities:', error)
      return []
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load real dashboard data from Firebase
      const [dashboardStats, activities] = await Promise.all([
        loadRealDashboardStats(),
        loadRecentActivities()
      ])
      
      setStats(dashboardStats)
      setRecentActivities(activities)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'صباح الخير'
    if (hour < 17) return 'مساء الخير'
    return 'مساء الخير'
  }

  const canViewFinancials = isSuperAdmin(userData.role) || isAdmin(userData.role)

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">
            {getGreeting()}، {userData.displayName}
          </h1>
          <p className="text-gray-600 arabic-text">
            مرحباً بك في نظام إدارة مؤسسة أبو فرحان للنقل الخفيف
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 arabic-text">
            {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="إجمالي المخزون"
          value={formatNumber(stats?.totalInventory || 0)}
          subtitle="صنف متاح"
          icon={Package}
          trend={+5.2}
          color="blue"
        />
        
        <StatsCard
          title="مبيعات اليوم"
          value={formatNumber(stats?.todaySales || 0)}
          subtitle="عملية بيع"
          icon={ShoppingCart}
          trend={+12.1}
          color="green"
        />
        
        {canViewFinancials && (
          <>
            <StatsCard
              title="إيرادات الشهر"
              value={formatCurrency(stats?.monthlyRevenue || 0)}
              subtitle="جنيه مصري"
              icon={TrendingUp}
              trend={+8.3}
              color="purple"
            />
            
            <StatsCard
              title="نسبة الربح"
              value={`${stats?.profitMargin || 0}%`}
              subtitle="من الإيرادات"
              icon={ArrowUpRight}
              trend={+2.1}
              color="orange"
            />
          </>
        )}
        
        {(userData.role === 'super_admin' || userData.role === 'admin') && (
          <StatsCard
            title="عدد الوكلاء"
            value={formatNumber(stats?.totalAgents || 0)}
            subtitle="وكيل نشط"
            icon={Users}
            trend={0}
            color="indigo"
          />
        )}
        
        <StatsCard
          title="وثائق معلقة"
          value={formatNumber(stats?.pendingDocuments || 0)}
          subtitle="في انتظار المعالجة"
          icon={AlertCircle}
          trend={-3}
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات السريعة</CardTitle>
          <CardDescription>
            الإجراءات الأكثر استخداماً في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userData.role !== 'agent' && (
              <Link to="/inventory/add">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm">إضافة صنف</span>
                </Button>
              </Link>
            )}
            
            <Link to="/sales/new">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <ShoppingCart className="h-6 w-6" />
                <span className="text-sm">بيع جديد</span>
              </Button>
            </Link>
            
            <Link to="/customers">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Eye className="h-6 w-6" />
                <span className="text-sm">استعلام عميل</span>
              </Button>
            </Link>
            
            <Link to="/documents">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Calendar className="h-6 w-6" />
                <span className="text-sm">تتبع الوثائق</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>النشاطات الحديثة</CardTitle>
            <CardDescription>
              آخر العمليات التي تمت في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'sale' ? 'bg-green-100 text-green-600' :
                    activity.type === 'transfer' ? 'bg-blue-100 text-blue-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {activity.type === 'sale' && <ShoppingCart className="h-4 w-4" />}
                    {activity.type === 'transfer' && <Package className="h-4 w-4" />}
                    {activity.type === 'document_update' && <Calendar className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 arabic-text">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.timestamp.toLocaleString('ar-EG')}
                    </p>
                  </div>
                  {activity.amount && (
                    <div className="text-left">
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(activity.amount)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>حالة النظام</CardTitle>
            <CardDescription>
              معلومات عن أداء النظام والإشعارات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-800 arabic-text">النظام يعمل بشكل طبيعي</span>
                </div>
                <span className="text-xs text-green-600">متصل</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-blue-800 arabic-text">المزامنة مفعلة</span>
                </div>
                <span className="text-xs text-blue-600">تحديث تلقائي</span>
              </div>
              
              {stats?.pendingDocuments && stats.pendingDocuments > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-yellow-800 arabic-text">
                      يوجد {stats.pendingDocuments} وثيقة في انتظار المعالجة
                    </span>
                  </div>
                  <Link to="/documents">
                    <Button variant="ghost" size="sm">عرض</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  trend: number
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'red'
}

function StatsCard({ title, value, subtitle, icon: Icon, trend, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100',
    indigo: 'text-indigo-600 bg-indigo-100',
    red: 'text-red-600 bg-red-100'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 arabic-text">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {value}
            </p>
            <p className="text-xs text-gray-500 arabic-text">
              {subtitle}
            </p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {trend !== 0 && (
          <div className="mt-4 flex items-center gap-1">
            {trend > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend)}%
            </span>
            <span className="text-xs text-gray-500 arabic-text">من الشهر الماضي</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
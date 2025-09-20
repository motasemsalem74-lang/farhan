import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Users, 
  Plus, 
  Eye,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Phone,
  MapPin,
  AlertCircle
} from 'lucide-react'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent } from '@/types'
import { formatCurrency, isAdmin, isSuperAdmin } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AgentsFilters {
  search: string
  status: 'all' | 'active' | 'inactive'
  accountType: 'all' | 'with_user' | 'offline'
  sortBy: 'name' | 'balance' | 'createdAt'
  sortOrder: 'asc' | 'desc'
}

export function AgentsList() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AgentsFilters>({
    search: '',
    status: 'all',
    accountType: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  })

  useEffect(() => {
    if (userData) {
      loadAgentsData()
    }
  }, [userData, filters])

  const loadAgentsData = async () => {
    try {
      setLoading(true)
      
      // Load real agents data from Firebase
      const agentsQuery = query(
        collection(db, 'agents'),
        orderBy('createdAt', 'desc')
      )
      
      const agentsSnapshot = await getDocs(agentsQuery)
      const agentsData = agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Agent[]
      
      setAgents(agentsData)
    } catch (error) {
      console.error('Error loading agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = agents.filter(agent => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!agent.name.toLowerCase().includes(searchLower) && 
          !agent.phone.includes(filters.search) &&
          !agent.address.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    if (filters.status !== 'all') {
      if (filters.status === 'active' && !agent.isActive) return false
      if (filters.status === 'inactive' && agent.isActive) return false
    }
    
    if (filters.accountType !== 'all') {
      if (filters.accountType === 'with_user' && !agent.hasUserAccount) return false
      if (filters.accountType === 'offline' && agent.hasUserAccount) return false
    }
    
    return true
  })

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1
    switch (filters.sortBy) {
      case 'balance':
        return (a.currentBalance - b.currentBalance) * order
      case 'createdAt':
        return ((a.createdAt as any) - (b.createdAt as any)) * order
      default:
        return a.name.localeCompare(b.name) * order
    }
  })

  const handleFilterChange = (key: keyof AgentsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const canManageAgents = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))
  
  // Calculate statistics
  const totalAgents = filteredAgents.length
  const activeAgents = filteredAgents.filter(agent => agent.isActive).length
  const totalDebt = filteredAgents.reduce((sum, agent) => sum + Math.abs(Math.min(agent.currentBalance, 0)), 0)
  const totalCredit = filteredAgents.reduce((sum, agent) => sum + Math.max(agent.currentBalance, 0), 0)

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">إدارة الوكلاء</h1>
          <p className="text-gray-600 arabic-text">عرض وإدارة جميع الوكلاء في النظام</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageAgents && (
            <>
              <Link to="/agents/advanced-balance-report">
                <Button variant="outline">
                  <TrendingUp className="ml-2 h-4 w-4" />
                  تقرير الأرصدة المتقدم
                </Button>
              </Link>
              <Link to="/agents/debt-report">
                <Button variant="outline">
                  <CreditCard className="ml-2 h-4 w-4" />
                  تقرير المديونيات
                </Button>
              </Link>
              <Link to="/agents/create">
                <Button>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة وكيل جديد
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الوكلاء</p>
                <p className="text-2xl font-bold text-gray-900">{totalAgents}</p>
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
                <p className="text-2xl font-bold text-gray-900">{activeAgents}</p>
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
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي المديونية</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
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
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الأرصدة الدائنة</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalCredit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Input
                type="text"
                placeholder="البحث في الوكلاء..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>

            {/* Account Type Filter */}
            <div>
              <select
                value={filters.accountType}
                onChange={(e) => handleFilterChange('accountType', e.target.value)}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="all">جميع الأنواع</option>
                <option value="with_user">لديه حساب</option>
                <option value="offline">أوفلاين</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-')
                  setFilters(prev => ({
                    ...prev,
                    sortBy: sortBy as any,
                    sortOrder: sortOrder as 'asc' | 'desc'
                  }))
                }}
                className="w-full form-input input-rtl arabic-text"
              >
                <option value="name-asc">الاسم (أ - ي)</option>
                <option value="name-desc">الاسم (ي - أ)</option>
                <option value="balance-asc">الرصيد (الأقل أولاً)</option>
                <option value="balance-desc">الرصيد (الأعلى أولاً)</option>
                <option value="createdAt-desc">الأحدث أولاً</option>
                <option value="createdAt-asc">الأقدم أولاً</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="جاري تحميل الوكلاء..." />
        </div>
      ) : sortedAgents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا يوجد وكلاء
            </h3>
            <p className="text-gray-500 arabic-text">
              لا يوجد وكلاء يطابقون معايير البحث المحددة
            </p>
            {canManageAgents && (
              <div className="mt-6">
                <Link to="/agents/create">
                  <Button>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة وكيل جديد
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} canManage={canManageAgents || false} />
          ))}
        </div>
      )}
    </div>
  )
}

function AgentCard({ agent, canManage }: { agent: Agent; canManage: boolean }) {
  const navigate = useNavigate()
  
  const handleViewDetails = () => {
    navigate(`/agents/details/${agent.id}`)
  }

  const handleManagePayments = () => {
    navigate(`/agents/payments/${agent.id}`)
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-purple-600' // دائن
    if (balance < 0) return 'text-red-600' // مدين
    return 'text-gray-600' // متوازن
  }

  const getBalanceLabel = (balance: number) => {
    if (balance > 0) return 'دائن'
    if (balance < 0) return 'مدين'
    return 'متوازن'
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-3 h-3 rounded-full',
                agent.isActive ? 'bg-green-500' : 'bg-red-500'
              )}></div>
              <div>
                <h3 className="font-medium text-gray-900 arabic-text">
                  {agent.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {agent.hasUserAccount ? 'لديه حساب' : 'أوفلاين'}
                </p>
              </div>
            </div>
            {Math.abs(agent.currentBalance) > 20000 && (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">{agent.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 arabic-text">{agent.address}</span>
            </div>
          </div>

          {/* Financial Info */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 arabic-text">الرصيد الحالي:</span>
              <div className="text-right">
                <p className={cn('font-bold text-lg', getBalanceColor(agent.currentBalance))}>
                  {formatCurrency(Math.abs(agent.currentBalance))}
                </p>
                <p className={cn('text-xs', getBalanceColor(agent.currentBalance))}>
                  {getBalanceLabel(agent.currentBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={handleViewDetails}>
              <Eye className="h-4 w-4" />
              التفاصيل
            </Button>
            {canManage && (
              <Button variant="ghost" size="sm" onClick={handleManagePayments}>
                <CreditCard className="h-4 w-4" />
                المدفوعات
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

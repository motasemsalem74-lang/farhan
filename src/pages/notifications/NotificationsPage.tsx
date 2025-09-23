import React, { useState, useEffect } from 'react'
import { 
  Bell, 
  Filter, 
  Search, 
  Check, 
  CheckCheck, 
  Archive, 
  Trash2, 
  Settings,
  AlertCircle,
  Calendar,
  User,
  Package,
  CreditCard,
  Truck,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select'
import { Checkbox } from '../../components/ui/Checkbox'
import { notificationService } from '../../lib/notificationService'
import { Notification, NotificationType, NotificationPriority } from '../../types/notifications'
import { useAuth } from '../../hooks/useAuth'
import { formatTimeAgo, formatDate } from '../../lib/utils'
import { toast } from 'sonner'

export const NotificationsPage: React.FC = () => {
  const { userData } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read' | 'archived'>('all')
  const [filters, setFilters] = useState({
    type: 'all' as NotificationType | 'all',
    priority: 'all' as NotificationPriority | 'all',
    dateRange: 'all' as 'today' | 'week' | 'month' | 'all'
  })

  useEffect(() => {
    if (!userData?.id) return

    loadNotifications()
    
    // Subscribe to real-time updates
    const unsubscribe = notificationService.subscribeToUserNotifications(
      userData.id,
      (newNotifications) => {
        setNotifications(newNotifications)
      }
    )

    return unsubscribe
  }, [userData?.id])

  useEffect(() => {
    applyFilters()
  }, [notifications, searchTerm, activeTab, filters])

  const loadNotifications = async () => {
    if (!userData?.id) return

    try {
      setLoading(true)
      const allNotifications = await notificationService.getUserNotifications(userData.id, {
        includeExpired: true
      })
      setNotifications(allNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('فشل في تحميل الإشعارات')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...notifications]

    // Filter by tab (status)
    if (activeTab !== 'all') {
      filtered = filtered.filter(notification => notification.status === activeTab)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(term) ||
        notification.message.toLowerCase().includes(term)
      )
    }

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(notification => notification.type === filters.type)
    }

    // Filter by priority
    if (filters.priority !== 'all') {
      filtered = filtered.filter(notification => notification.priority === filters.priority)
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const startDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
      }

      filtered = filtered.filter(notification => {
        let notificationDate: Date
        if (notification.createdAt && typeof notification.createdAt.toDate === 'function') {
          notificationDate = notification.createdAt.toDate()
        } else if (notification.createdAt instanceof Date) {
          notificationDate = notification.createdAt
        } else if (notification.createdAt) {
          notificationDate = new Date(notification.createdAt as any)
        } else {
          notificationDate = new Date()
        }
        return notificationDate >= startDate
      })
    }

    setFilteredNotifications(filtered)
  }

  const handleSelectNotification = (notificationId: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications(prev => [...prev, notificationId])
    } else {
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    } else {
      setSelectedNotifications([])
    }
  }

  const handleBulkAction = async (action: 'read' | 'archive' | 'delete') => {
    if (!userData?.id || selectedNotifications.length === 0) return

    try {
      switch (action) {
        case 'read':
          await notificationService.markMultipleAsRead(selectedNotifications, userData.id)
          toast.success(`تم وضع علامة مقروء على ${selectedNotifications.length} إشعار`)
          break
        case 'archive':
          for (const id of selectedNotifications) {
            await notificationService.archiveNotification(id)
          }
          toast.success(`تم أرشفة ${selectedNotifications.length} إشعار`)
          break
        case 'delete':
          for (const id of selectedNotifications) {
            await notificationService.deleteNotification(id)
          }
          toast.success(`تم حذف ${selectedNotifications.length} إشعار`)
          break
      }
      setSelectedNotifications([])
    } catch (error) {
      toast.error('فشل في تنفيذ العملية')
    }
  }

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'sale_completed': return <CreditCard className="h-4 w-4" />
      case 'inventory_low': return <Package className="h-4 w-4" />
      case 'document_status_changed': return <FileText className="h-4 w-4" />
      case 'agent_payment_due': return <User className="h-4 w-4" />
      case 'warehouse_transfer': return <Truck className="h-4 w-4" />
      case 'system_alert': return <AlertCircle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'sale_completed': return 'عملية بيع'
      case 'inventory_low': return 'مخزون منخفض'
      case 'document_status_changed': return 'تغيير حالة وثيقة'
      case 'agent_payment_due': return 'دفعة وكيل مستحقة'
      case 'warehouse_transfer': return 'نقل مخزون'
      case 'system_alert': return 'تنبيه نظام'
      default: return 'إشعار عام'
    }
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityLabel = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'عاجل'
      case 'high': return 'عالي'
      case 'medium': return 'متوسط'
      case 'low': return 'منخفض'
      default: return 'عادي'
    }
  }

  const getTabCount = (status: 'all' | 'unread' | 'read' | 'archived') => {
    if (status === 'all') return notifications.length
    return notifications.filter(n => n.status === status).length
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
            <p className="text-gray-600">إدارة جميع الإشعارات والتنبيهات</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          إعدادات الإشعارات
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث في الإشعارات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="نوع الإشعار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="sale_completed">عمليات البيع</SelectItem>
                <SelectItem value="inventory_low">مخزون منخفض</SelectItem>
                <SelectItem value="document_status_changed">تغيير حالة وثيقة</SelectItem>
                <SelectItem value="agent_payment_due">دفعات الوكلاء</SelectItem>
                <SelectItem value="warehouse_transfer">نقل المخزون</SelectItem>
                <SelectItem value="system_alert">تنبيهات النظام</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value as any }))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="urgent">عاجل</SelectItem>
                <SelectItem value="high">عالي</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="low">منخفض</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value as any }))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="الفترة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">هذا الأسبوع</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                تم تحديد {selectedNotifications.length} إشعار
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('read')}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  وضع علامة مقروء
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('archive')}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  أرشفة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            جميع الإشعارات
            <Badge variant="secondary">{getTabCount('all')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            غير مقروءة
            <Badge variant="destructive">{getTabCount('unread')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="read" className="gap-2">
            مقروءة
            <Badge variant="secondary">{getTabCount('read')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            مؤرشفة
            <Badge variant="outline">{getTabCount('archived')}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  النتائج ({filteredNotifications.length})
                </CardTitle>
                {filteredNotifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedNotifications.length === filteredNotifications.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-gray-600">تحديد الكل</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد إشعارات</h3>
                  <p className="text-gray-600">لا توجد إشعارات تطابق المعايير المحددة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`
                        p-4 rounded-lg border transition-colors
                        ${notification.status === 'unread' 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedNotifications.includes(notification.id)}
                          onCheckedChange={(checked) => handleSelectNotification(notification.id, checked as boolean)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                                {getTypeIcon(notification.type)}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-gray-900">
                                    {notification.title}
                                  </h3>
                                  {notification.status === 'unread' && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  )}
                                </div>
                                
                                <p className="text-gray-600 text-sm mb-2">
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatTimeAgo(
                                      notification.createdAt && typeof notification.createdAt.toDate === 'function' 
                                        ? notification.createdAt.toDate() 
                                        : notification.createdAt instanceof Date 
                                          ? notification.createdAt 
                                          : new Date(notification.createdAt as any)
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {getTypeLabel(notification.type)}
                                  </Badge>
                                  <Badge className={`text-xs ${getPriorityColor(notification.priority)}`}>
                                    {getPriorityLabel(notification.priority)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {notification.status === 'unread' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => notificationService.markAsRead(notification.id, userData!.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => notificationService.archiveNotification(notification.id)}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {notification.actions.map((action) => (
                                <Button
                                  key={action.id}
                                  variant={action.variant || 'outline'}
                                  size="sm"
                                  className="text-xs"
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

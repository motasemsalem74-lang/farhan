import { useState, useEffect } from 'react'
import { Bell, X, Check, Eye, Trash2, Settings, FileText, Package, DollarSign, AlertCircle } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { 
  notificationSystem, 
  Notification as NotificationData, 
  NotificationType, 
  NotificationStatus, 
  NotificationPriority 
} from '@/lib/notificationSystem'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  useEffect(() => {
    if (!user?.uid) return

    setLoading(true)
    
    // Subscribe to real-time notifications
    const unsubscribe = notificationSystem.subscribeToUserNotifications(
      user.uid,
      (notificationsList) => {
        setNotifications(notificationsList)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [user?.uid])

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationSystem.markAsRead(notificationId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('حدث خطأ أثناء تحديث الإشعار')
    }
  }

  const markAllAsRead = async () => {
    if (!user?.uid) return

    try {
      await notificationSystem.markAllAsRead(user.uid)
      toast.success('تم تمييز جميع الإشعارات كمقروءة')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('حدث خطأ أثناء تحديث الإشعارات')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationSystem.archiveNotification(notificationId)
      toast.success('تم حذف الإشعار')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('حدث خطأ أثناء حذف الإشعار')
    }
  }

  const clearAllNotifications = async () => {
    if (!user?.uid) return

    try {
      const promises = notifications.map(notification => 
        notificationSystem.archiveNotification(notification.id!)
      )
      await Promise.all(promises)
      toast.success('تم مسح جميع الإشعارات')
    } catch (error) {
      console.error('Error clearing notifications:', error)
      toast.error('حدث خطأ أثناء مسح الإشعارات')
    }
  }

  const handleNotificationClick = (notification: NotificationData) => {
    // Mark as read
    if (notification.status === NotificationStatus.UNREAD) {
      markAsRead(notification.id!)
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      console.log('🔗 Navigating to:', notification.actionUrl)
      // تأكد من أن الرابط صحيح
      const url = notification.actionUrl.startsWith('/') ? notification.actionUrl : `/${notification.actionUrl}`
      navigate(url)
      onClose()
    } else {
      console.log('⚠️ No action URL for notification:', notification.title)
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_SALE:
        return <DollarSign className="h-5 w-5 text-green-600" />
      case NotificationType.DOCUMENT_STATUS_UPDATED:
        return <FileText className="h-5 w-5 text-blue-600" />
      case NotificationType.INVENTORY_TRANSFERRED:
      case NotificationType.INVENTORY_WITHDRAWN:
        return <Package className="h-5 w-5 text-purple-600" />
      case NotificationType.PAYMENT_ADDED:
      case NotificationType.PAYMENT_DEDUCTED:
        return <DollarSign className="h-5 w-5 text-orange-600" />
      case NotificationType.SYSTEM_UPDATE:
      case NotificationType.MAINTENANCE:
        return <Settings className="h-5 w-5 text-gray-600" />
      default:
        return <Bell className="h-5 w-5 text-blue-600" />
    }
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'border-l-red-500 bg-red-50'
      case NotificationPriority.HIGH:
        return 'border-l-orange-500 bg-orange-50'
      case NotificationPriority.MEDIUM:
        return 'border-l-blue-500 bg-blue-50'
      case NotificationPriority.LOW:
        return 'border-l-gray-500 bg-gray-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return notification.status === NotificationStatus.UNREAD
    if (filter === 'read') return notification.status === NotificationStatus.READ
    return true
  })

  const unreadCount = notifications.filter(n => n.status === NotificationStatus.UNREAD).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end pt-16 pr-4">
      <Card className="w-96 max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold arabic-text">
            الإشعارات
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {/* Filter Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 text-sm arabic-text ${
                filter === 'all' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-4 py-2 text-sm arabic-text ${
                filter === 'unread' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
            >
              غير مقروء ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`flex-1 px-4 py-2 text-sm arabic-text ${
                filter === 'read' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
            >
              مقروء ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Action Buttons */}
          {notifications.length > 0 && (
            <div className="flex gap-2 p-3 border-b bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-xs"
              >
                <Check className="ml-1 h-3 w-3" />
                تمييز الكل كمقروء
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs text-red-600"
              >
                <Trash2 className="ml-1 h-3 w-3" />
                مسح الكل
              </Button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner text="جاري تحميل الإشعارات..." />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 arabic-text">
                {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 
                 filter === 'read' ? 'لا توجد إشعارات مقروءة' : 
                 'لا توجد إشعارات'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer border-l-4 ${
                      notification.status === NotificationStatus.UNREAD 
                        ? getPriorityColor(notification.priority)
                        : 'border-l-gray-300 bg-white'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm arabic-text text-gray-800">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 ml-2">
                            {notification.status === NotificationStatus.UNREAD && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id!)
                                }}
                                className="p-1 h-auto"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id!)
                              }}
                              className="p-1 h-auto text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 arabic-text mt-1">
                          {notification.message}
                        </p>
                        
                        {notification.senderName && (
                          <p className="text-xs text-gray-500 mt-1">
                            من: {notification.senderName}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {notification.createdAt?.toDate ? 
                            notification.createdAt.toDate().toLocaleString('ar-SA') :
                            new Date(notification.createdAt).toLocaleString('ar-SA')
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs arabic-text"
              onClick={() => {
                // Navigate to notification settings
                onClose()
              }}
            >
              <Settings className="ml-1 h-3 w-3" />
              إعدادات الإشعارات
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function NotificationBell() {
  const [user] = useAuthState(auth)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!user?.uid) return

    // Subscribe to real-time notifications (unread only)
    const unsubscribe = notificationSystem.subscribeToUserNotifications(
      user.uid,
      (notificationsList) => {
        // Filter only unread notifications for the bell
        const unreadNotifications = notificationsList.filter(
          n => n.status === NotificationStatus.UNREAD
        )
        setNotifications(unreadNotifications)
      }
    )

    return unsubscribe
  }, [user?.uid])

  const unreadCount = notifications.length

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

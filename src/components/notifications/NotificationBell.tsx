import React, { useState, useEffect } from 'react'
import { Bell, BellRing, Check, Archive, Trash2, Settings } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { ScrollArea } from '../ui/scroll-area'
import { formatTimeAgo } from '@/lib/utils'
import { notificationService } from '../../lib/notificationService'
import { Notification } from '../../types/notifications'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'

interface NotificationBellProps {
  className?: string
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const { userData } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userData?.id) return

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToUserNotifications(
      userData.id,
      (newNotifications) => {
        setNotifications(newNotifications)
        const unread = newNotifications.filter(n => n.status === 'unread').length
        setUnreadCount(unread)
      }
    )

    return unsubscribe
  }, [userData?.id])

  const handleMarkAsRead = async (notificationId: string) => {
    if (!userData?.id) return

    try {
      await notificationService.markAsRead(notificationId, userData.id)
      toast.success('تم وضع علامة مقروء')
    } catch (error) {
      toast.error('فشل في تحديث الإشعار')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!userData?.id) return

    try {
      setLoading(true)
      const unreadIds = notifications
        .filter(n => n.status === 'unread')
        .map(n => n.id)
      
      if (unreadIds.length > 0) {
        await notificationService.markMultipleAsRead(unreadIds, userData.id)
        toast.success(`تم وضع علامة مقروء على ${unreadIds.length} إشعار`)
      }
    } catch (error) {
      toast.error('فشل في تحديث الإشعارات')
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async (notificationId: string) => {
    try {
      await notificationService.archiveNotification(notificationId)
      toast.success('تم أرشفة الإشعار')
    } catch (error) {
      toast.error('فشل في أرشفة الإشعار')
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!userData?.id) return

    try {
      // Track click
      await notificationService.trackClick(notification.id, userData.id)
      
      // Mark as read if unread
      if (notification.status === 'unread') {
        await notificationService.markAsRead(notification.id, userData.id)
      }

      // Handle action if exists
      if (notification.actions && notification.actions.length > 0) {
        const primaryAction = notification.actions[0]
        handleNotificationAction(primaryAction, notification)
      }
    } catch (error) {
      console.error('Error handling notification click:', error)
    }
  }

  const handleNotificationAction = (action: any, notification: Notification) => {
    switch (action.action) {
      case 'navigate_to_sale':
        if (notification.relatedEntityId) {
          window.location.href = `/sales/${notification.relatedEntityId}`
        }
        break
      case 'navigate_to_inventory':
        window.location.href = '/inventory'
        break
      case 'navigate_to_agents':
        window.location.href = '/agents'
        break
      default:
        console.log('Unknown action:', action.action)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-blue-600 bg-blue-50'
      case 'low': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale_completed': return '💰'
      case 'inventory_low': return '📦'
      case 'document_status_changed': return '📄'
      case 'agent_payment_due': return '💳'
      case 'warehouse_transfer': return '🚚'
      case 'system_alert': return '⚠️'
      default: return '📢'
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96">
        <DropdownMenuHeader className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-medium">الإشعارات</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} جديد
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="h-8 px-2"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </DropdownMenuHeader>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    group relative p-3 rounded-lg mb-2 cursor-pointer transition-colors
                    ${notification.status === 'unread' 
                      ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg flex-shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(notification.priority)}`}
                          >
                            {notification.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.createdAt.toDate())}
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {notification.status === 'unread' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchive(notification.id)
                            }}
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {notification.actions.slice(0, 2).map((action) => (
                            <Button
                              key={action.id}
                              variant={action.variant || 'outline'}
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNotificationAction(action, notification)
                              }}
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
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => {
                  setIsOpen(false)
                  window.location.href = '/notifications'
                }}
              >
                عرض جميع الإشعارات
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

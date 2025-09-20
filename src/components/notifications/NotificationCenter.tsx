import { useState, useEffect } from 'react'
import { Bell, X, Check, Eye, Trash2, Settings } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where } from 'firebase/firestore'
import { toast } from 'sonner'

import { auth, db } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { NotificationData, setupForegroundMessageListener } from '@/lib/notifications'
import { useUserData } from '@/hooks/useUserData'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  useEffect(() => {
    if (!user?.uid) return

    // Setup FCM when component mounts
    setupForegroundMessageListener()
    
    // Don't request notification permission automatically
    // Let user request it manually when needed
    
    // Listen to notifications
    const notificationsRef = collection(db, 'users', user.uid, 'notifications')
    const q = query(notificationsRef, orderBy('timestamp', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList: NotificationData[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        notificationsList.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as NotificationData)
      })
      setNotifications(notificationsList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  const markAsRead = async (notificationId: string) => {
    if (!user?.uid) return

    try {
      const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId)
      await updateDoc(notificationRef, { read: true })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user?.uid) return

    try {
      const unreadNotifications = notifications.filter(n => !n.read)
      const promises = unreadNotifications.map(notification => 
        updateDoc(doc(db, 'users', user.uid!, 'notifications', notification.id), { read: true })
      )
      await Promise.all(promises)
      toast.success('تم تمييز جميع الإشعارات كمقروءة')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('حدث خطأ أثناء تحديث الإشعارات')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!user?.uid) return

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notifications', notificationId))
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
        deleteDoc(doc(db, 'users', user.uid!, 'notifications', notification.id))
      )
      await Promise.all(promises)
      toast.success('تم مسح جميع الإشعارات')
    } catch (error) {
      console.error('Error clearing notifications:', error)
      toast.error('حدث خطأ أثناء مسح الإشعارات')
    }
  }

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'sale':
        return '💰'
      case 'document':
        return '📄'
      case 'agent':
        return '👤'
      case 'system':
        return '⚙️'
      case 'reminder':
        return '⏰'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: NotificationData['type']) => {
    switch (type) {
      case 'sale':
        return 'text-green-600'
      case 'document':
        return 'text-blue-600'
      case 'agent':
        return 'text-purple-600'
      case 'system':
        return 'text-orange-600'
      case 'reminder':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read
    if (filter === 'read') return notification.read
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

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
                    className={`p-3 border-b hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-lg flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`font-medium text-sm arabic-text ${getNotificationColor(notification.type)}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 h-auto"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 h-auto text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 arabic-text mt-1">
                          {notification.body}
                        </p>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.timestamp).toLocaleString('ar-SA')}
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

    const notificationsRef = collection(db, 'users', user.uid, 'notifications')
    const q = query(
      notificationsRef, 
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList: NotificationData[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        notificationsList.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as NotificationData)
      })
      setNotifications(notificationsList)
    })

    return () => unsubscribe()
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

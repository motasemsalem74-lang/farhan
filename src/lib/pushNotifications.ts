import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'
import { toast } from 'sonner'

/**
 * مدير الإشعارات الخارجية (Push Notifications)
 */
class PushNotificationManager {
  private messaging: any = null
  private currentToken: string | null = null

  /**
   * تهيئة FCM
   */
  async initialize(): Promise<void> {
    try {
      if (typeof window === 'undefined') return

      // Check if messaging is supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('❌ Push notifications not supported')
        return
      }

      this.messaging = getMessaging()
      
      // Request permission and get token
      await this.requestPermission()
      
      // Listen for foreground messages
      this.setupForegroundListener()
      
      console.log('✅ Push notifications initialized')
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error)
    }
  }

  /**
   * طلب إذن الإشعارات
   */
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted')
        await this.getRegistrationToken()
        return true
      } else {
        console.log('❌ Notification permission denied')
        return false
      }
    } catch (error) {
      console.error('❌ Error requesting permission:', error)
      return false
    }
  }

  /**
   * الحصول على FCM Token
   */
  async getRegistrationToken(): Promise<string | null> {
    try {
      if (!this.messaging) return null

      const token = await getToken(this.messaging)

      if (token) {
        console.log('✅ FCM Token received:', token)
        this.currentToken = token
        await this.saveTokenToDatabase(token)
        return token
      } else {
        console.log('❌ No registration token available')
        return null
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error)
      return null
    }
  }

  /**
   * حفظ Token في قاعدة البيانات
   */
  private async saveTokenToDatabase(token: string): Promise<void> {
    try {
      const userId = localStorage.getItem('currentUserId')
      if (!userId) return

      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token,
        lastTokenUpdate: new Date()
      })

      console.log('✅ FCM token saved to database')
    } catch (error) {
      console.error('❌ Error saving FCM token:', error)
    }
  }

  /**
   * إعداد مستمع الإشعارات في المقدمة
   */
  private setupForegroundListener(): void {
    if (!this.messaging) return

    onMessage(this.messaging, (payload) => {
      console.log('📱 Foreground message received:', payload)
      
      const { notification, data } = payload
      
      // عرض toast فقط للإشعارات المهمة
      const priority = data?.priority || 'medium'
      if (priority === 'high' || priority === 'urgent') {
        toast.info(notification?.title || 'إشعار مهم', {
          description: notification?.body || '',
          action: data?.actionUrl ? {
            label: 'عرض',
            onClick: () => {
              window.location.href = data.actionUrl
            }
          } : undefined,
          duration: 6000
        })
      } else {
        // للإشعارات العادية، فقط تحديث العداد بدون toast
        console.log('📋 Normal priority notification received silently')
      }
    })
  }

  /**
   * إرسال إشعار خارجي
   */
  async sendPushNotification(data: {
    userIds: string[]
    title: string
    body: string
    actionUrl?: string
    data?: any
  }): Promise<void> {
    try {
      // This would typically be done on the server side
      // For now, we'll save the notification request to Firestore
      // and let a Cloud Function handle the actual sending
      
      await addDoc(collection(db, 'push_notification_requests'), {
        userIds: data.userIds,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl,
        data: data.data,
        createdAt: new Date(),
        status: 'pending'
      })

      console.log('✅ Push notification request created')
    } catch (error) {
      console.error('❌ Error sending push notification:', error)
    }
  }

  /**
   * الحصول على Token الحالي
   */
  getCurrentToken(): string | null {
    return this.currentToken
  }

  /**
   * التحقق من دعم الإشعارات
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }
}

// إنشاء instance واحد
export const pushNotificationManager = new PushNotificationManager()

// تصدير الكلاس
export { PushNotificationManager }

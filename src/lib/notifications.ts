import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore'
import { toast } from 'sonner'

import { db, messaging } from '@/firebase/firebase-config.template'

// Your web app's Firebase configuration VAPID key
const VAPID_KEY = 'BNxWjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrKjZrK'

export interface NotificationData {
  id: string
  title: string
  body: string
  type: 'sale' | 'document' | 'agent' | 'system' | 'reminder'
  data?: Record<string, any>
  timestamp: Date
  read: boolean
  userId: string
}

export interface FCMToken {
  token: string
  userId: string
  deviceInfo: {
    userAgent: string
    platform: string
    timestamp: Date
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  try {
    // Check if notifications are supported
    if (!('Notification' in window) || !messaging) {
      console.warn('This browser does not support notifications or messaging is not available')
      return null
    }

    // Request permission
    const permission = await Notification.requestPermission()
    
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return null
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    })

    if (token) {
      // Save token to Firestore
      await saveFCMToken(token, userId)
      console.log('FCM token obtained:', token)
      return token
    } else {
      console.warn('No registration token available')
      return null
    }
  } catch (error) {
    console.error('Error getting notification permission:', error)
    return null
  }
}

/**
 * Save FCM token to Firestore
 */
async function saveFCMToken(token: string, userId: string): Promise<void> {
  try {
    const tokenData: FCMToken = {
      token,
      userId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date()
      }
    }

    // Update user document with FCM token
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(tokenData)
    })

    console.log('FCM token saved to Firestore')
  } catch (error) {
    console.error('Error saving FCM token:', error)
  }
}

/**
 * Setup foreground message listener
 */
export function setupForegroundMessageListener(): void {
  if (!messaging) {
    console.warn('Messaging not available')
    return
  }
  
  onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload)
    
    const { notification, data } = payload
    
    if (notification) {
      // Show toast notification
      toast(notification.title || 'إشعار جديد', {
        description: notification.body,
        action: data?.actionUrl ? {
          label: 'عرض',
          onClick: () => {
            window.location.href = data.actionUrl
          }
        } : undefined
      })

      // Show browser notification if page is not focused
      if (document.hidden) {
        showBrowserNotification(notification.title || 'إشعار جديد', {
          body: notification.body || '',
          icon: '/logo-192x192.png',
          badge: '/logo-192x192.png',
          tag: data?.notificationId || 'default',
          data: data
        } as NotificationOptions)
      }
    }
  })
}

/**
 * Show browser notification
 */
function showBrowserNotification(title: string, options: NotificationOptions): void {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, options)
    })
  } else {
    new Notification(title, options)
  }
}

/**
 * Send notification to specific user (admin function)
 */
export async function sendNotificationToUser(
  userId: string,
  notification: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'>
): Promise<void> {
  try {
    // This would typically be done on the server side
    // For demo purposes, we'll just save to Firestore
    const notificationData: NotificationData = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      timestamp: new Date(),
      read: false,
      userId
    }

    // Save notification to user's notifications collection
    const userNotificationsRef = doc(db, 'users', userId, 'notifications', notificationData.id)
    await setDoc(userNotificationsRef, notificationData)

    console.log('Notification sent to user:', userId)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

/**
 * Send notification to all users with specific roles
 */
export async function sendNotificationToRoles(
  roles: string[],
  notification: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'>
): Promise<void> {
  try {
    // This would typically be done on the server side with Cloud Functions
    // For demo purposes, we'll show how it would work
    console.log('Sending notification to roles:', roles, notification)
    
    toast.success('تم إرسال الإشعار بنجاح')
  } catch (error) {
    console.error('Error sending notification to roles:', error)
    toast.error('حدث خطأ أثناء إرسال الإشعار')
  }
}

/**
 * Notification templates for common scenarios
 */
export const NotificationTemplates = {
  newSale: (agentName: string, amount: number): Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'> => ({
    title: 'مبيعة جديدة',
    body: `تم تسجيل مبيعة جديدة بواسطة ${agentName} بقيمة ${amount.toLocaleString('ar-SA')} ريال`,
    type: 'sale',
    data: { agentName, amount }
  }),

  documentReady: (documentId: string, customerName: string): Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'> => ({
    title: 'وثيقة جاهزة',
    body: `وثيقة العميل ${customerName} جاهزة للاستلام`,
    type: 'document',
    data: { documentId, customerName }
  }),

  documentOverdue: (documentId: string, customerName: string, daysPast: number): Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'> => ({
    title: 'وثيقة متأخرة',
    body: `وثيقة العميل ${customerName} متأخرة ${daysPast} أيام`,
    type: 'document',
    data: { documentId, customerName, daysPast }
  }),

  agentPayment: (agentName: string, amount: number): Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'> => ({
    title: 'دفعة وكيل',
    body: `تم استلام دفعة من الوكيل ${agentName} بقيمة ${amount.toLocaleString('ar-SA')} ريال`,
    type: 'agent',
    data: { agentName, amount }
  }),

  lowStock: (itemName: string, quantity: number): Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'> => ({
    title: 'مخزون منخفض',
    body: `الصنف ${itemName} أوشك على النفاد (${quantity} قطعة متبقية)`,
    type: 'system',
    data: { itemName, quantity }
  }),

  systemMaintenance: (startTime: Date, duration: string): Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'> => ({
    title: 'صيانة النظام',
    body: `سيتم إجراء صيانة للنظام في ${startTime.toLocaleString('ar-SA')} لمدة ${duration}`,
    type: 'system',
    data: { startTime, duration }
  })
}

/**
 * Schedule notification (would typically use server-side scheduling)
 */
export function scheduleNotification(
  notification: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'userId'>,
  scheduleTime: Date,
  userId: string
): void {
  const now = new Date()
  const delay = scheduleTime.getTime() - now.getTime()

  if (delay > 0) {
    setTimeout(() => {
      sendNotificationToUser(userId, notification)
    }, delay)
    
    console.log(`Notification scheduled for ${scheduleTime.toLocaleString('ar-SA')}`)
  } else {
    console.warn('Cannot schedule notification in the past')
  }
}

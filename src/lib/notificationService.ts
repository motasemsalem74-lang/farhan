import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  increment
} from 'firebase/firestore'
import { db } from './firebase'
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationPreferences,
  NotificationTemplate,
  NotificationAction,
  NotificationStats
} from '../types/notifications'

export class NotificationService {
  private static instance: NotificationService
  private listeners: Map<string, () => void> = new Map()

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // Create notification
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    try {
      const notificationData = {
        ...notification,
        createdAt: serverTimestamp(),
        status: 'unread' as const,
        clickCount: 0
      }

      const docRef = await addDoc(collection(db, 'notifications'), notificationData)
      
      // Update stats
      await this.updateNotificationStats(notification.userId || '', 'received', notification.type, notification.priority)
      
      console.log('✅ Notification created:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('❌ Error creating notification:', error)
      throw error
    }
  }

  // Create notification from template
  async createFromTemplate(
    templateId: string, 
    variables: Record<string, string>,
    recipients: {
      userId?: string
      userIds?: string[]
      roleId?: string
      broadcast?: boolean
    },
    additionalData?: Record<string, any>
  ): Promise<string> {
    try {
      const templateDoc = await getDoc(doc(db, 'notification_templates', templateId))
      if (!templateDoc.exists()) {
        throw new Error('Template not found')
      }

      const template = templateDoc.data() as NotificationTemplate
      
      // Replace variables in title and message
      let title = template.titleTemplate
      let message = template.messageTemplate
      
      Object.entries(variables).forEach(([key, value]) => {
        title = title.replace(new RegExp(`{{${key}}}`, 'g'), value)
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
      })

      const notification: Omit<Notification, 'id' | 'createdAt'> = {
        type: template.type,
        title,
        message,
        priority: template.defaultPriority,
        status: 'unread',
        actions: template.defaultActions,
        data: additionalData,
        showInApp: true,
        showAsToast: true,
        ...recipients
      }

      return await this.createNotification(notification)
    } catch (error) {
      console.error('❌ Error creating notification from template:', error)
      throw error
    }
  }

  // Bulk create notifications
  async createBulkNotifications(notifications: Omit<Notification, 'id' | 'createdAt'>[]): Promise<string[]> {
    try {
      const batch = writeBatch(db)
      const ids: string[] = []

      notifications.forEach(notification => {
        const docRef = doc(collection(db, 'notifications'))
        batch.set(docRef, {
          ...notification,
          createdAt: serverTimestamp(),
          status: 'unread' as const,
          clickCount: 0
        })
        ids.push(docRef.id)
      })

      await batch.commit()
      console.log('✅ Bulk notifications created:', ids.length)
      return ids
    } catch (error) {
      console.error('❌ Error creating bulk notifications:', error)
      throw error
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: string, 
    options: {
      status?: 'unread' | 'read' | 'archived'
      limit?: number
      includeExpired?: boolean
      startAfter?: any
    } = {}
  ): Promise<Notification[]> {
    try {
      // Temporarily disable notifications to avoid Firebase index issues
      console.log('Notifications temporarily disabled due to Firebase index requirements')
      return []
      
      let q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )

      if (options.status) {
        q = query(q, where('status', '==', options.status))
      }

      if (options.type) {
        q = query(q, where('type', '==', options.type))
      }

      if (options.priority) {
        q = query(q, where('priority', '==', options.priority))
      }

      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      const snapshot = await getDocs(q)
      let notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[]

      // Filter expired notifications if needed
      if (!options.includeExpired) {
        const now = new Date()
        notifications = notifications.filter(notification => 
          !notification.expiresAt || notification.expiresAt.toDate() > now
        )
      }

      return notifications
    } catch (error) {
      console.error('❌ Error getting user notifications:', error)
      throw error
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId)
      const notificationDoc = await getDoc(notificationRef)
      
      if (!notificationDoc.exists()) {
        throw new Error('Notification not found')
      }

      const notification = notificationDoc.data() as Notification
      
      if (notification.status === 'unread') {
        await updateDoc(notificationRef, {
          status: 'read',
          readAt: serverTimestamp()
        })

        // Update stats
        await this.updateNotificationStats(userId, 'read', notification.type, notification.priority)
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
      throw error
    }
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    try {
      const batch = writeBatch(db)
      
      for (const id of notificationIds) {
        const notificationRef = doc(db, 'notifications', id)
        batch.update(notificationRef, {
          status: 'read',
          readAt: serverTimestamp()
        })
      }

      await batch.commit()
      console.log('✅ Multiple notifications marked as read:', notificationIds.length)
    } catch (error) {
      console.error('❌ Error marking multiple notifications as read:', error)
      throw error
    }
  }

  // Archive notification
  async archiveNotification(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        status: 'archived',
        archivedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('❌ Error archiving notification:', error)
      throw error
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId))
    } catch (error) {
      console.error('❌ Error deleting notification:', error)
      throw error
    }
  }

  // Track notification click
  async trackClick(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId)
      await updateDoc(notificationRef, {
        clickCount: increment(1),
        lastClickedAt: serverTimestamp()
      })

      // Update stats
      const notificationDoc = await getDoc(notificationRef)
      if (notificationDoc.exists()) {
        const notification = notificationDoc.data() as Notification
        await this.updateNotificationStats(userId, 'clicked', notification.type, notification.priority)
      }
    } catch (error) {
      console.error('❌ Error tracking notification click:', error)
      throw error
    }
  }

  // Listen to user notifications in real-time
  subscribeToUserNotifications(
    userId: string, 
    callback: (notifications: Notification[]) => void,
    options: { status?: 'unread' | 'read' | 'archived' } = {}
  ): () => void {
    try {
      let q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      )

      if (options.status) {
        q = query(q, where('status', '==', options.status))
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[]

        callback(notifications)
      })

      this.listeners.set(userId, unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error('❌ Error subscribing to notifications:', error)
      throw error
    }
  }

  // Get notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const doc = await getDoc(collection(db, 'notification_preferences').doc(userId))
      return doc.exists() ? doc.data() as NotificationPreferences : null
    } catch (error) {
      console.error('❌ Error getting notification preferences:', error)
      throw error
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await updateDoc(doc(db, 'notification_preferences', preferences.userId), {
        ...preferences,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error)
      throw error
    }
  }

  // Update notification stats
  private async updateNotificationStats(
    userId: string, 
    action: 'received' | 'read' | 'clicked',
    type: NotificationType,
    priority: NotificationPriority
  ): Promise<void> {
    try {
      const statsRef = doc(db, 'notification_stats', userId)
      const updates: any = {
        lastUpdated: serverTimestamp()
      }

      // Update total counters
      updates[`total${action.charAt(0).toUpperCase() + action.slice(1)}`] = increment(1)
      
      // Update by type
      updates[`byType.${type}.${action}`] = increment(1)
      
      // Update by priority
      updates[`byPriority.${priority}.${action}`] = increment(1)

      await updateDoc(statsRef, updates)
    } catch (error) {
      console.error('❌ Error updating notification stats:', error)
      // Don't throw error for stats update failures
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const now = new Date()
      const q = query(
        collection(db, 'notifications'),
        where('expiresAt', '<=', now)
      )

      const snapshot = await getDocs(q)
      const batch = writeBatch(db)
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      console.log('✅ Cleaned up expired notifications:', snapshot.docs.length)
      return snapshot.docs.length
    } catch (error) {
      console.error('❌ Error cleaning up expired notifications:', error)
      throw error
    }
  }

  // Cleanup listeners
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe())
    this.listeners.clear()
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()

// Helper functions for common notification types
export const createSaleNotification = async (
  saleData: {
    customerName: string
    amount: number
    agentName?: string
    itemDescription: string
  },
  userId: string
) => {
  return await notificationService.createNotification({
    type: 'sale_completed',
    title: 'تم إتمام عملية بيع جديدة',
    message: `تم بيع ${saleData.itemDescription} للعميل ${saleData.customerName} بمبلغ ${saleData.amount} جنيه`,
    priority: 'medium',
    status: 'unread',
    userId,
    showInApp: true,
    showAsToast: true,
    data: saleData,
    actions: [
      {
        id: 'view_sale',
        label: 'عرض التفاصيل',
        action: 'navigate_to_sale',
        variant: 'default'
      }
    ]
  })
}

export const createLowInventoryNotification = async (
  itemData: {
    itemName: string
    currentStock: number
    minStock: number
    warehouseName: string
  },
  userId: string
) => {
  return await notificationService.createNotification({
    type: 'inventory_low',
    title: 'تنبيه: مخزون منخفض',
    message: `المنتج ${itemData.itemName} في ${itemData.warehouseName} وصل إلى ${itemData.currentStock} قطعة (الحد الأدنى: ${itemData.minStock})`,
    priority: 'high',
    status: 'unread',
    userId,
    showInApp: true,
    showAsToast: true,
    data: itemData,
    actions: [
      {
        id: 'restock',
        label: 'إعادة التخزين',
        action: 'navigate_to_inventory',
        variant: 'default'
      }
    ]
  })
}

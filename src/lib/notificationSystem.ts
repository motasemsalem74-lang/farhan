import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore'
import { db } from '../firebase/firebase-config.template'
import { toast } from 'sonner'

/**
 * أنواع الإشعارات
 */
export enum NotificationType {
  // إشعارات للمديرين
  NEW_SALE = 'new_sale',                    // بيعة جديدة من وكيل
  DOCUMENT_CREATED = 'document_created',    // وثيقة جديدة
  
  // إشعارات للوكلاء
  DOCUMENT_STATUS_UPDATED = 'document_status_updated',  // تحديث حالة وثيقة
  INVENTORY_TRANSFERRED = 'inventory_transferred',      // تحويل بضاعة
  PAYMENT_ADDED = 'payment_added',                      // إضافة دفعة نقدية
  PAYMENT_DEDUCTED = 'payment_deducted',               // خصم دفعة نقدية
  INVENTORY_WITHDRAWN = 'inventory_withdrawn',          // سحب بضاعة
  
  // إشعارات عامة
  SYSTEM_UPDATE = 'system_update',          // تحديث النظام
  MAINTENANCE = 'maintenance'               // صيانة
}

/**
 * حالات الإشعار
 */
export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived'
}

/**
 * أولوية الإشعار
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * واجهة الإشعار
 */
export interface Notification {
  id?: string
  type: NotificationType
  title: string
  message: string
  recipientId: string           // معرف المستقبل
  recipientRole: string         // دور المستقبل (admin, agent, etc.)
  senderId?: string            // معرف المرسل
  senderName?: string          // اسم المرسل
  status: NotificationStatus
  priority: NotificationPriority
  data?: any                   // بيانات إضافية
  actionUrl?: string           // رابط الإجراء
  createdAt: any
  readAt?: any
  expiresAt?: any
}

/**
 * مدير نظام الإشعارات
 */
class NotificationSystem {
  private listeners: Map<string, () => void> = new Map()

  /**
   * إرسال إشعار جديد
   */
  async sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      console.log('📤 Sending notification:', notification.title, 'to:', notification.recipientId)
      
      const notificationData: Omit<Notification, 'id'> = {
        ...notification,
        status: NotificationStatus.UNREAD,
        createdAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'notifications'), notificationData)
      
      console.log('✅ Notification sent successfully:', docRef.id, notificationData)
      return docRef.id
    } catch (error) {
      console.error('❌ Failed to send notification:', error)
      throw error
    }
  }

  /**
   * إرسال إشعار بيعة جديدة للمديرين
   */
  async notifyNewSale(saleData: {
    agentId: string
    agentName: string
    documentId: string
    customerName: string
    totalAmount: number
    items: any[]
  }): Promise<void> {
    try {
      // الحصول على قائمة المديرين
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['admin', 'super_admin'])
      )
      
      const adminsSnapshot = await getDocs(adminsQuery)
      
      // إرسال إشعار لكل مدير
      const promises = adminsSnapshot.docs.map(adminDoc => {
        const admin = adminDoc.data()
        return this.sendNotification({
          type: NotificationType.NEW_SALE,
          title: '🛒 بيعة جديدة',
          message: `الوكيل ${saleData.agentName} أنشأ بيعة جديدة للعميل ${saleData.customerName} بقيمة ${saleData.totalAmount.toLocaleString()} جنيه`,
          recipientId: adminDoc.id,
          recipientRole: admin.role,
          senderId: saleData.agentId,
          senderName: saleData.agentName,
          priority: NotificationPriority.HIGH,
          actionUrl: `/documents/${saleData.documentId}`,
          data: {
            documentId: saleData.documentId,
            agentId: saleData.agentId,
            customerName: saleData.customerName,
            totalAmount: saleData.totalAmount,
            itemsCount: saleData.items.length
          }
        })
      })

      await Promise.all(promises)
      console.log('✅ New sale notifications sent to all admins')
    } catch (error) {
      console.error('❌ Failed to notify new sale:', error)
      throw error
    }
  }

  /**
   * إرسال إشعار تحديث حالة وثيقة للوكيل
   */
  async notifyDocumentStatusUpdate(updateData: {
    documentId: string
    agentId: string
    agentName: string
    oldStatus: string
    newStatus: string
    updatedBy: string
    updatedByName: string
    customerName?: string
  }): Promise<void> {
    try {
      const statusMessages = {
        'pending': 'في الانتظار',
        'processing': 'قيد التنفيذ',
        'shipped': 'تم الشحن',
        'delivered': 'تم التسليم',
        'cancelled': 'ملغية',
        'returned': 'مرتجعة'
      }

      await this.sendNotification({
        type: NotificationType.DOCUMENT_STATUS_UPDATED,
        title: '📋 تحديث حالة الوثيقة',
        message: `تم تحديث حالة وثيقة ${updateData.customerName || 'العميل'} من "${statusMessages[updateData.oldStatus] || updateData.oldStatus}" إلى "${statusMessages[updateData.newStatus] || updateData.newStatus}"`,
        recipientId: updateData.agentId,
        recipientRole: 'agent',
        senderId: updateData.updatedBy,
        senderName: updateData.updatedByName,
        priority: NotificationPriority.MEDIUM,
        actionUrl: `/documents/${updateData.documentId}`,
        data: {
          documentId: updateData.documentId,
          oldStatus: updateData.oldStatus,
          newStatus: updateData.newStatus,
          customerName: updateData.customerName
        }
      })

      console.log('✅ Document status update notification sent to agent')
    } catch (error) {
      console.error('❌ Failed to notify document status update:', error)
      throw error
    }
  }

  /**
   * إرسال إشعار تحويل بضاعة للوكيل
   */
  async notifyInventoryTransfer(transferData: {
    agentId: string
    agentName: string
    items: Array<{
      name: string
      quantity: number
      unit: string
    }>
    transferredBy: string
    transferredByName: string
    warehouseFrom?: string
    notes?: string
  }): Promise<void> {
    try {
      const itemsList = transferData.items
        .map(item => `${item.quantity} ${item.unit} ${item.name}`)
        .join(', ')

      await this.sendNotification({
        type: NotificationType.INVENTORY_TRANSFERRED,
        title: '📦 تحويل بضاعة',
        message: `تم تحويل بضاعة إليك: ${itemsList}`,
        recipientId: transferData.agentId,
        recipientRole: 'agent',
        senderId: transferData.transferredBy,
        senderName: transferData.transferredByName,
        priority: NotificationPriority.MEDIUM,
        actionUrl: '/inventory',
        data: {
          items: transferData.items,
          warehouseFrom: transferData.warehouseFrom,
          notes: transferData.notes,
          totalItems: transferData.items.length
        }
      })

      console.log('✅ Inventory transfer notification sent to agent')
    } catch (error) {
      console.error('❌ Failed to notify inventory transfer:', error)
      throw error
    }
  }

  /**
   * إرسال إشعار دفعة نقدية للوكيل
   */
  async notifyPaymentUpdate(paymentData: {
    agentId: string
    agentName: string
    amount: number
    type: 'added' | 'deducted'
    newBalance: number
    processedBy: string
    processedByName: string
    reason?: string
    transactionId?: string
  }): Promise<void> {
    try {
      const isAddition = paymentData.type === 'added'
      const title = isAddition ? '💰 إضافة دفعة نقدية' : '💸 خصم دفعة نقدية'
      const action = isAddition ? 'أضيف' : 'خُصم'
      const preposition = isAddition ? 'إلى' : 'من'
      
      await this.sendNotification({
        type: isAddition ? NotificationType.PAYMENT_ADDED : NotificationType.PAYMENT_DEDUCTED,
        title,
        message: `${action} ${paymentData.amount.toLocaleString()} جنيه ${preposition} رصيدك. الرصيد الحالي: ${paymentData.newBalance.toLocaleString()} جنيه`,
        recipientId: paymentData.agentId,
        recipientRole: 'agent',
        senderId: paymentData.processedBy,
        senderName: paymentData.processedByName,
        priority: NotificationPriority.HIGH,
        actionUrl: '/agent/balance',
        data: {
          amount: paymentData.amount,
          type: paymentData.type,
          newBalance: paymentData.newBalance,
          reason: paymentData.reason,
          transactionId: paymentData.transactionId
        }
      })

      console.log('✅ Payment update notification sent to agent')
    } catch (error) {
      console.error('❌ Failed to notify payment update:', error)
      throw error
    }
  }

  /**
   * إرسال إشعار سحب بضاعة من الوكيل
   */
  async notifyInventoryWithdrawal(withdrawalData: {
    agentId: string
    agentName: string
    items: Array<{
      name: string
      quantity: number
      unit: string
    }>
    withdrawnBy: string
    withdrawnByName: string
    reason?: string
    newInventoryValue?: number
  }): Promise<void> {
    try {
      const itemsList = withdrawalData.items
        .map(item => `${item.quantity} ${item.unit} ${item.name}`)
        .join(', ')

      await this.sendNotification({
        type: NotificationType.INVENTORY_WITHDRAWN,
        title: '📤 سحب بضاعة',
        message: `تم سحب بضاعة منك: ${itemsList}`,
        recipientId: withdrawalData.agentId,
        recipientRole: 'agent',
        senderId: withdrawalData.withdrawnBy,
        senderName: withdrawalData.withdrawnByName,
        priority: NotificationPriority.MEDIUM,
        actionUrl: '/inventory',
        data: {
          items: withdrawalData.items,
          reason: withdrawalData.reason,
          newInventoryValue: withdrawalData.newInventoryValue,
          totalItems: withdrawalData.items.length
        }
      })

      console.log('✅ Inventory withdrawal notification sent to agent')
    } catch (error) {
      console.error('❌ Failed to notify inventory withdrawal:', error)
      throw error
    }
  }

  /**
   * الحصول على إشعارات المستخدم
   */
  async getUserNotifications(userId: string, limit_count: number = 20): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit_count)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification))
    } catch (error) {
      console.error('❌ Failed to get user notifications:', error)
      return []
    }
  }

  /**
   * مراقبة إشعارات المستخدم في الوقت الفعلي
   */
  subscribeToUserNotifications(
    userId: string, 
    callback: (notifications: Notification[]) => void
  ): () => void {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('status', '!=', NotificationStatus.ARCHIVED),
      orderBy('status'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification))

      callback(notifications)

      // عرض toast للإشعارات الجديدة غير المقروءة
      const newUnreadNotifications = notifications.filter(
        notif => notif.status === NotificationStatus.UNREAD
      )

      if (newUnreadNotifications.length > 0) {
        const latestNotification = newUnreadNotifications[0]
        this.showNotificationToast(latestNotification)
      }
    })

    // حفظ مرجع لإلغاء الاشتراك
    this.listeners.set(userId, unsubscribe)
    return unsubscribe
  }

  /**
   * عرض toast للإشعار
   */
  private showNotificationToast(notification: Notification): void {
    const priorityConfig = {
      [NotificationPriority.LOW]: { duration: 3000 },
      [NotificationPriority.MEDIUM]: { duration: 5000 },
      [NotificationPriority.HIGH]: { duration: 8000 },
      [NotificationPriority.URGENT]: { duration: 12000 }
    }

    const config = priorityConfig[notification.priority] || { duration: 5000 }

    toast.info(notification.title, {
      description: notification.message,
      duration: config.duration,
      action: notification.actionUrl ? {
        label: 'عرض',
        onClick: () => {
          window.location.href = notification.actionUrl!
          this.markAsRead(notification.id!)
        }
      } : undefined
    })
  }

  /**
   * تحديد الإشعار كمقروء
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        status: NotificationStatus.READ,
        readAt: serverTimestamp()
      })
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error)
    }
  }

  /**
   * أرشفة الإشعار
   */
  async archiveNotification(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        status: NotificationStatus.ARCHIVED
      })
    } catch (error) {
      console.error('❌ Failed to archive notification:', error)
    }
  }

  /**
   * تحديد جميع إشعارات المستخدم كمقروءة
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('status', '==', NotificationStatus.UNREAD)
      )

      const snapshot = await getDocs(q)
      const promises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: NotificationStatus.READ,
          readAt: serverTimestamp()
        })
      )

      await Promise.all(promises)
      console.log('✅ All notifications marked as read')
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error)
    }
  }

  /**
   * إلغاء جميع الاشتراكات
   */
  unsubscribeAll(): void {
    this.listeners.forEach(unsubscribe => unsubscribe())
    this.listeners.clear()
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const notificationSystem = new NotificationSystem()

// تصدير الكلاس والواجهات
export { NotificationSystem }
export type { Notification as NotificationInterface }

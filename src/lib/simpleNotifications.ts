import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'
import { toast } from 'sonner'

/**
 * نظام إشعارات مبسط وموثوق
 */
export class SimpleNotificationSystem {
  /**
   * إرسال إشعار بسيط
   */
  static async sendNotification(data: {
    recipientId: string
    title: string
    message: string
    type: string
    actionUrl?: string
    senderId?: string
    senderName?: string
    priority?: 'low' | 'medium' | 'high'
    data?: any
  }) {
    try {
      console.log('📤 SimpleNotifications: Sending notification:', data.title, 'to:', data.recipientId)

      const notification = {
        recipientId: data.recipientId,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl || '',
        senderId: data.senderId || 'system',
        senderName: data.senderName || 'النظام',
        priority: data.priority || 'medium',
        status: 'unread',
        data: data.data || {},
        createdAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'notifications'), notification)
      console.log('✅ SimpleNotifications: Notification sent successfully:', docRef.id)
      
      return docRef.id
    } catch (error) {
      console.error('❌ SimpleNotifications: Failed to send notification:', error)
      throw error
    }
  }

  /**
   * إشعار بيعة جديدة للمديرين
   */
  static async notifyNewSale(saleData: {
    agentId: string
    agentName: string
    documentId: string
    customerName: string
    totalAmount: number
  }) {
    try {
      console.log('📤 SimpleNotifications: Sending new sale notification')

      // إرسال للمدير الرئيسي (admin@alfarhan.com)
      const adminId = 'eJVyY9OwowchKEMlFLrk4MRiiaq2' // ID المدير الرئيسي
      
      await this.sendNotification({
        recipientId: adminId,
        title: '🛒 بيعة جديدة',
        message: `الوكيل ${saleData.agentName} أنشأ بيعة جديدة للعميل ${saleData.customerName} بقيمة ${saleData.totalAmount.toLocaleString()} جنيه`,
        type: 'new_sale',
        actionUrl: `/documents/${saleData.documentId}`,
        senderId: saleData.agentId,
        senderName: saleData.agentName,
        priority: 'high',
        data: {
          documentId: saleData.documentId,
          agentId: saleData.agentId,
          customerName: saleData.customerName,
          totalAmount: saleData.totalAmount
        }
      })

      console.log('✅ SimpleNotifications: New sale notification sent to admin')
    } catch (error) {
      console.error('❌ SimpleNotifications: Failed to send new sale notification:', error)
      throw error
    }
  }

  /**
   * إشعار تحديث حالة وثيقة للوكيل
   */
  static async notifyDocumentStatusUpdate(data: {
    documentId: string
    agentId: string
    agentName: string
    oldStatus: string
    newStatus: string
    updatedBy: string
    updatedByName: string
    customerName: string
  }) {
    try {
      console.log('📤 SimpleNotifications: Sending document status update notification')

      await this.sendNotification({
        recipientId: data.agentId,
        title: '📄 تحديث حالة الوثيقة',
        message: `تم تحديث حالة وثيقة العميل ${data.customerName} من "${data.oldStatus}" إلى "${data.newStatus}" بواسطة ${data.updatedByName}`,
        type: 'document_status_update',
        actionUrl: `/documents/${data.documentId}`,
        senderId: data.updatedBy,
        senderName: data.updatedByName,
        priority: 'medium',
        data: {
          documentId: data.documentId,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          customerName: data.customerName
        }
      })

      console.log('✅ SimpleNotifications: Document status update notification sent')
    } catch (error) {
      console.error('❌ SimpleNotifications: Failed to send document status update notification:', error)
      throw error
    }
  }

  /**
   * إشعار تحويل مخزون للوكيل
   */
  static async notifyInventoryTransfer(data: {
    agentId: string
    agentName: string
    itemsCount: number
    fromWarehouse: string
    toWarehouse: string
    transferredBy: string
    transferredByName: string
  }) {
    try {
      console.log('📤 SimpleNotifications: Sending inventory transfer notification')

      await this.sendNotification({
        recipientId: data.agentId,
        title: '📦 تحويل مخزون',
        message: `تم تحويل ${data.itemsCount} صنف من ${data.fromWarehouse} إلى ${data.toWarehouse}`,
        type: 'inventory_transfer',
        actionUrl: '/inventory',
        senderId: data.transferredBy,
        senderName: data.transferredByName,
        priority: 'medium',
        data: {
          itemsCount: data.itemsCount,
          fromWarehouse: data.fromWarehouse,
          toWarehouse: data.toWarehouse
        }
      })

      console.log('✅ SimpleNotifications: Inventory transfer notification sent')
    } catch (error) {
      console.error('❌ SimpleNotifications: Failed to send inventory transfer notification:', error)
      throw error
    }
  }

  /**
   * إشعار تغيير رصيد للوكيل
   */
  static async notifyBalanceChange(data: {
    agentId: string
    agentName: string
    amount: number
    operation: 'add' | 'deduct'
    newBalance: number
    description: string
    changedBy: string
    changedByName: string
  }) {
    try {
      console.log('📤 SimpleNotifications: Sending balance change notification')

      const isAddition = data.operation === 'add'
      
      await this.sendNotification({
        recipientId: data.agentId,
        title: isAddition ? '💰 إضافة رصيد' : '💸 خصم رصيد',
        message: `تم ${isAddition ? 'إضافة' : 'خصم'} ${Math.abs(data.amount).toLocaleString()} جنيه ${isAddition ? 'إلى' : 'من'} رصيدك. الرصيد الحالي: ${data.newBalance.toLocaleString()} جنيه`,
        type: isAddition ? 'balance_added' : 'balance_deducted',
        actionUrl: `/agents/payments/${data.agentId}`,
        senderId: data.changedBy,
        senderName: data.changedByName,
        priority: 'high',
        data: {
          amount: data.amount,
          operation: data.operation,
          newBalance: data.newBalance,
          description: data.description
        }
      })

      console.log('✅ SimpleNotifications: Balance change notification sent')
    } catch (error) {
      console.error('❌ SimpleNotifications: Failed to send balance change notification:', error)
      throw error
    }
  }
}

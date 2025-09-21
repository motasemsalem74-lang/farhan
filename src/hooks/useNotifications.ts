import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/firebase/firebase-config.template'
import { 
  notificationSystem, 
  Notification, 
  NotificationStatus 
} from '@/lib/notificationSystem'

/**
 * Hook لإدارة الإشعارات
 */
export function useNotifications() {
  const [user] = useAuthState(auth)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    setLoading(true)

    // Subscribe to real-time notifications
    const unsubscribe = notificationSystem.subscribeToUserNotifications(
      user.uid,
      (notificationsList) => {
        setNotifications(notificationsList)
        setUnreadCount(
          notificationsList.filter(n => n.status === NotificationStatus.UNREAD).length
        )
        setLoading(false)
      }
    )

    return unsubscribe
  }, [user?.uid])

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationSystem.markAsRead(notificationId)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      throw error
    }
  }

  const markAllAsRead = async () => {
    if (!user?.uid) return
    
    try {
      await notificationSystem.markAllAsRead(user.uid)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      throw error
    }
  }

  const archiveNotification = async (notificationId: string) => {
    try {
      await notificationSystem.archiveNotification(notificationId)
    } catch (error) {
      console.error('Failed to archive notification:', error)
      throw error
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    archiveNotification
  }
}

/**
 * Hook لإرسال الإشعارات (للمديرين والنظام)
 */
export function useNotificationSender() {
  const sendNewSaleNotification = async (saleData: {
    agentId: string
    agentName: string
    documentId: string
    customerName: string
    totalAmount: number
    items: any[]
  }) => {
    try {
      await notificationSystem.notifyNewSale(saleData)
    } catch (error) {
      console.error('Failed to send new sale notification:', error)
      throw error
    }
  }

  const sendDocumentStatusUpdate = async (updateData: {
    documentId: string
    agentId: string
    agentName: string
    oldStatus: string
    newStatus: string
    updatedBy: string
    updatedByName: string
    customerName?: string
  }) => {
    try {
      await notificationSystem.notifyDocumentStatusUpdate(updateData)
    } catch (error) {
      console.error('Failed to send document status update notification:', error)
      throw error
    }
  }

  const sendInventoryTransferNotification = async (transferData: {
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
  }) => {
    try {
      await notificationSystem.notifyInventoryTransfer(transferData)
    } catch (error) {
      console.error('Failed to send inventory transfer notification:', error)
      throw error
    }
  }

  const sendPaymentUpdateNotification = async (paymentData: {
    agentId: string
    agentName: string
    amount: number
    type: 'added' | 'deducted'
    newBalance: number
    processedBy: string
    processedByName: string
    reason?: string
    transactionId?: string
  }) => {
    try {
      await notificationSystem.notifyPaymentUpdate(paymentData)
    } catch (error) {
      console.error('Failed to send payment update notification:', error)
      throw error
    }
  }

  const sendInventoryWithdrawalNotification = async (withdrawalData: {
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
  }) => {
    try {
      await notificationSystem.notifyInventoryWithdrawal(withdrawalData)
    } catch (error) {
      console.error('Failed to send inventory withdrawal notification:', error)
      throw error
    }
  }

  return {
    sendNewSaleNotification,
    sendDocumentStatusUpdate,
    sendInventoryTransferNotification,
    sendPaymentUpdateNotification,
    sendInventoryWithdrawalNotification
  }
}

const functions = require('firebase-functions')
const admin = require('firebase-admin')

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Cloud Function لإرسال Push Notifications
 * يتم تشغيلها عند إضافة طلب إشعار جديد
 */
exports.sendPushNotifications = functions.firestore
  .document('push_notification_requests/{requestId}')
  .onCreate(async (snap, context) => {
    try {
      const data = snap.data()
      const { userIds, title, body, actionUrl, data: notificationData } = data

      console.log('📱 Processing push notification request:', context.params.requestId)

      // Get FCM tokens for the users
      const tokens = []
      for (const userId of userIds) {
        try {
          const userDoc = await db.collection('users').doc(userId).get()
          if (userDoc.exists && userDoc.data().fcmToken) {
            tokens.push(userDoc.data().fcmToken)
          }
        } catch (error) {
          console.error(`Error getting FCM token for user ${userId}:`, error)
        }
      }

      if (tokens.length === 0) {
        console.log('❌ No FCM tokens found for users')
        await snap.ref.update({ status: 'failed', error: 'No FCM tokens found' })
        return
      }

      // Prepare the message
      const message = {
        notification: {
          title: title,
          body: body,
          icon: '/logo-192x192.png',
          badge: '/logo-192x192.png'
        },
        data: {
          actionUrl: actionUrl || '/',
          notificationId: notificationData?.notificationId || '',
          type: notificationData?.type || 'general',
          priority: notificationData?.priority || 'medium',
          ...notificationData
        },
        webpush: {
          fcm_options: {
            link: actionUrl || '/'
          },
          notification: {
            icon: '/logo-192x192.png',
            badge: '/logo-192x192.png',
            requireInteraction: true,
            actions: [
              {
                action: 'view',
                title: 'عرض'
              },
              {
                action: 'dismiss',
                title: 'إغلاق'
              }
            ]
          }
        }
      }

      // Send to multiple tokens
      const results = await Promise.allSettled(
        tokens.map(token => 
          admin.messaging().send({
            ...message,
            token: token
          })
        )
      )

      // Process results
      let successCount = 0
      let failureCount = 0
      const failedTokens = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++
          console.log('✅ Message sent successfully:', result.value)
        } else {
          failureCount++
          failedTokens.push(tokens[index])
          console.error('❌ Message failed:', result.reason)
        }
      })

      // Update request status
      await snap.ref.update({
        status: 'completed',
        successCount: successCount,
        failureCount: failureCount,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Clean up invalid tokens
      if (failedTokens.length > 0) {
        console.log('🧹 Cleaning up invalid FCM tokens:', failedTokens.length)
        // Remove invalid tokens from user documents
        for (let i = 0; i < failedTokens.length; i++) {
          const token = failedTokens[i]
          const userIndex = tokens.indexOf(token)
          if (userIndex !== -1 && userIndex < userIds.length) {
            const userId = userIds[userIndex]
            try {
              await db.collection('users').doc(userId).update({
                fcmToken: admin.firestore.FieldValue.delete()
              })
            } catch (error) {
              console.error(`Error removing invalid token for user ${userId}:`, error)
            }
          }
        }
      }

      console.log(`📊 Push notification results: ${successCount} success, ${failureCount} failed`)

    } catch (error) {
      console.error('❌ Error processing push notification request:', error)
      await snap.ref.update({
        status: 'failed',
        error: error.message,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  })

/**
 * دالة مساعدة لإرسال إشعار فوري
 */
exports.sendInstantPushNotification = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { userIds, title, body, actionUrl, notificationData } = data

    // Create push notification request
    await db.collection('push_notification_requests').add({
      userIds: userIds,
      title: title,
      body: body,
      actionUrl: actionUrl,
      data: notificationData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      createdBy: context.auth.uid
    })

    return { success: true, message: 'Push notification request created' }

  } catch (error) {
    console.error('❌ Error creating instant push notification:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

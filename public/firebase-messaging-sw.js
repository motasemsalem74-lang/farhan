// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js')

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBuuM3rbUFdu2MSTEg-w7pB-9l_Q1SOj5M",
  authDomain: "al-farhan-c3a30.firebaseapp.com",
  projectId: "al-farhan-c3a30",
  storageBucket: "al-farhan-c3a30.firebasestorage.app",
  messagingSenderId: "871976480343",
  appId: "1:871976480343:web:baea3ef580b28a3589fd12"
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)

  const { notification, data } = payload
  
  const notificationTitle = notification?.title || 'إشعار جديد'
  const notificationOptions = {
    body: notification?.body || '',
    icon: '/logo-192x192.png',
    badge: '/logo-192x192.png',
    tag: data?.notificationId || 'default',
    data: data,
    actions: [
      {
        action: 'view',
        title: 'عرض'
      },
      {
        action: 'dismiss',
        title: 'إغلاق'
      }
    ],
    requireInteraction: true,
    silent: false
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  if (event.action === 'view') {
    // Open the app or navigate to specific page
    const urlToOpen = event.notification.data?.actionUrl || '/'
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen)
            }
            return
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
    )
  }
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)
  
  // Track notification dismissal if needed
  if (event.notification.data?.trackDismissal) {
    // Send analytics or update read status
  }
})

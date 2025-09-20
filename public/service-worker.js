/**
 * Service Worker for Al Farhan Transport Systems PWA
 * نظام أبو فرحان للنقل الخفيف - Service Worker
 */

const CACHE_NAME = 'al-farhan-v1.0.0'
const OFFLINE_URL = '/offline.html'

// الملفات الأساسية للتخزين المؤقت
const ESSENTIAL_FILES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/logo-192x192.png',
  '/logo-512x512.png'
]

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 PWA: Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 PWA: Caching essential files')
        return cache.addAll(ESSENTIAL_FILES)
      })
      .then(() => {
        console.log('✅ PWA: Service Worker installed successfully')
        // فرض تفعيل Service Worker الجديد فوراً
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ PWA: Service Worker installation failed', error)
      })
  )
})

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 PWA: Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ PWA: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ PWA: Service Worker activated')
        // السيطرة على جميع العملاء فوراً
        return self.clients.claim()
      })
  )
})

// اعتراض طلبات الشبكة
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات غير HTTP/HTTPS
  if (!event.request.url.startsWith('http')) {
    return
  }

  // تجاهل طلبات Firebase وCloudinary
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('cloudinary.com') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('google.com/images')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إرجاع من التخزين المؤقت إذا وُجد
        if (response) {
          return response
        }

        // محاولة جلب من الشبكة
        return fetch(event.request)
          .then((response) => {
            // تخزين الاستجابة الناجحة
            if (response.status === 200) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone)
                })
            }
            return response
          })
          .catch(() => {
            // في حالة فشل الشبكة، إرجاع صفحة offline للتنقل
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL)
            }
            // للموارد الأخرى، إرجاع استجابة فارغة
            return new Response('', { status: 404 })
          })
      })
  )
})

// رسائل من التطبيق الرئيسي
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})

// إشعار بتوفر تحديث
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // إرسال إشعار للتطبيق الرئيسي
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          version: CACHE_NAME
        })
      })
    })
  }
})

console.log('📱 PWA: Service Worker loaded successfully')

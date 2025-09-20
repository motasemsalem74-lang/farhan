/**
 * Service Worker للنظام - نظام أبو فرحان للنقل الخفيف
 * يدعم العمل أوف لاين وcaching للبيانات المهمة
 */

const CACHE_NAME = 'al-farhan-v1.0.0'
const OFFLINE_URL = '/offline.html'

// الملفات الأساسية التي نريد cache-ها دائماً
const ESSENTIAL_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/logo-192x192.png',
  '/logo-512x512.png'
]

// البيانات المهمة للـ cache
const API_CACHE_PATTERNS = [
  '/api/inventory',
  '/api/agents', 
  '/api/sales',
  '/api/customers',
  '/api/warehouses'
]

// استراتيجيات الـ Cache
const CACHE_STRATEGIES = {
  // للملفات الثابتة - Cache First
  STATIC: 'cache-first',
  // للبيانات - Network First مع fallback للـ cache
  API: 'network-first',
  // للصور - Cache First مع update في الخلفية
  IMAGES: 'cache-first-update'
}

declare const self: ServiceWorkerGlobalScope

// تثبيت Service Worker
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('🔧 Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching essential files')
        return cache.addAll(ESSENTIAL_CACHE_URLS)
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete')
        // فرض التفعيل الفوري
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error)
      })
  )
})

// تفعيل Service Worker
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('🚀 Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // حذف الـ caches القديمة
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete')
        // السيطرة على جميع الصفحات فوراً
        return self.clients.claim()
      })
  )
})

// معالجة الطلبات
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // تجاهل الطلبات غير HTTP/HTTPS
  if (!request.url.startsWith('http')) {
    return
  }

  // تجاهل طلبات Firebase Auth
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return
  }

  event.respondWith(handleRequest(request))
})

// دالة معالجة الطلبات الرئيسية
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  
  try {
    // 1. للملفات الثابتة (CSS, JS, Images)
    if (isStaticAsset(url)) {
      return await cacheFirstStrategy(request)
    }
    
    // 2. لطلبات API
    if (isApiRequest(url)) {
      return await networkFirstStrategy(request)
    }
    
    // 3. للصفحات HTML
    if (isNavigationRequest(request)) {
      return await networkFirstWithOfflineFallback(request)
    }
    
    // 4. للصور
    if (isImageRequest(url)) {
      return await cacheFirstStrategy(request)
    }
    
    // 5. الافتراضي - محاولة الشبكة أولاً
    return await networkFirstStrategy(request)
    
  } catch (error) {
    console.error('❌ Service Worker: Request failed', error)
    return await getOfflineResponse(request)
  }
}

// استراتيجية Cache First (للملفات الثابتة)
async function cacheFirstStrategy(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    // تحديث الـ cache في الخلفية
    updateCacheInBackground(request)
    return cachedResponse
  }
  
  const networkResponse = await fetch(request)
  
  if (networkResponse.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, networkResponse.clone())
  }
  
  return networkResponse
}

// استراتيجية Network First (للبيانات)
async function networkFirstStrategy(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // حفظ في الـ cache للاستخدام أوف لاين
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
    
  } catch (error) {
    // في حالة فشل الشبكة، استخدم الـ cache
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      console.log('📱 Service Worker: Serving from cache (offline)', request.url)
      return cachedResponse
    }
    
    throw error
  }
}

// استراتيجية للصفحات مع fallback للصفحة أوف لاين
async function networkFirstWithOfflineFallback(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
    
  } catch (error) {
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // إرجاع صفحة أوف لاين
    const offlineResponse = await caches.match(OFFLINE_URL)
    return offlineResponse || new Response('الصفحة غير متاحة أوف لاين', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

// تحديث الـ cache في الخلفية
function updateCacheInBackground(request: Request): void {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(request, response))
      }
    })
    .catch(() => {
      // تجاهل الأخطاء في التحديث الخلفي
    })
}

// الحصول على استجابة أوف لاين
async function getOfflineResponse(request: Request): Promise<Response> {
  if (isNavigationRequest(request)) {
    const offlineResponse = await caches.match(OFFLINE_URL)
    return offlineResponse || new Response('غير متاح أوف لاين', { status: 503 })
  }
  
  return new Response('غير متاح أوف لاين', {
    status: 503,
    statusText: 'Service Unavailable'
  })
}

// دوال المساعدة للتحقق من نوع الطلب
function isStaticAsset(url: URL): boolean {
  const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.ttf', '.eot']
  return staticExtensions.some(ext => url.pathname.endsWith(ext))
}

function isApiRequest(url: URL): boolean {
  return API_CACHE_PATTERNS.some(pattern => url.pathname.includes(pattern)) ||
         url.pathname.startsWith('/api/')
}

function isNavigationRequest(request: Request): boolean {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
}

function isImageRequest(url: URL): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico']
  return imageExtensions.some(ext => url.pathname.endsWith(ext))
}

// معالجة الرسائل من الصفحة الرئيسية
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting()
        break
        
      case 'CACHE_URLS':
        if (event.data.urls) {
          cacheUrls(event.data.urls)
        }
        break
        
      case 'CLEAR_CACHE':
        clearCache()
        break
        
      case 'GET_CACHE_SIZE':
        getCacheSize().then(size => {
          event.ports[0]?.postMessage({ type: 'CACHE_SIZE', size })
        })
        break
    }
  }
})

// cache URLs محددة
async function cacheUrls(urls: string[]): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(urls)
    console.log('✅ Service Worker: URLs cached successfully', urls)
  } catch (error) {
    console.error('❌ Service Worker: Failed to cache URLs', error)
  }
}

// مسح الـ cache
async function clearCache(): Promise<void> {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
    console.log('✅ Service Worker: All caches cleared')
  } catch (error) {
    console.error('❌ Service Worker: Failed to clear cache', error)
  }
}

// حساب حجم الـ cache
async function getCacheSize(): Promise<number> {
  try {
    const cache = await caches.open(CACHE_NAME)
    const requests = await cache.keys()
    let totalSize = 0
    
    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }
    
    return totalSize
  } catch (error) {
    console.error('❌ Service Worker: Failed to calculate cache size', error)
    return 0
  }
}

// تصدير للاستخدام في TypeScript
export {}

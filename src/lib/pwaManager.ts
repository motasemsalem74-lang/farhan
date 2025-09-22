import { toast } from 'sonner'

/**
 * واجهات TypeScript
 */
interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface CacheInfo {
  name: string
  size: number
  entries: number
}

/**
 * مدير PWA - إدارة Service Worker والـ caching والتحديثات
 */
class PWAManager {
  private swRegistration: ServiceWorkerRegistration | null = null
  private installPrompt: PWAInstallPrompt | null = null
  private isOnline: boolean = navigator.onLine
  private updateAvailable: boolean = false

  /**
   * تهيئة PWA Manager
   */
  async init(): Promise<void> {
    try {
      console.log('🚀 PWA: Initializing...')
      
      // تسجيل Service Worker
      await this.registerServiceWorker()
      
      // إعداد مراقبة الاتصال
      this.setupConnectionMonitoring()
      
      // إعداد prompt التثبيت
      this.setupInstallPrompt()
      
      // إعداد مراقبة التحديثات
      this.setupUpdateMonitoring()
      
      console.log('✅ PWA: Initialization complete')
    } catch (error) {
      console.error('❌ PWA Manager: Initialization failed', error)
    }
  }

  /**
   * تسجيل Service Worker
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        
        console.log('✅ PWA: Service Worker registered', this.swRegistration)
        
        // إعداد مستمعات الأحداث
        this.setupServiceWorkerListeners()
        
      } catch (error) {
        console.error('❌ PWA: Service Worker registration failed', error)
        throw error
      }
    } else {
      throw new Error('Service Worker not supported')
    }
  }

  /**
   * إعداد مستمعات Service Worker
   */
  private setupServiceWorkerListeners(): void {
    if (!this.swRegistration) return

    // مراقبة التحديثات
    this.swRegistration.addEventListener('updatefound', () => {
      const newWorker = this.swRegistration!.installing
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true
            this.showUpdateNotification()
          }
        })
      }
    })

    // مراقبة الرسائل من Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data)
    })
  }

  /**
   * مراقبة حالة الاتصال
   */
  private setupConnectionMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      // تم تعطيل رسالة الاتصال
      // toast.success('تم استعادة الاتصال بالإنترنت', {
      //   description: 'يمكنك الآن مزامنة البيانات'
      // })
      this.syncPendingData()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      // تم تعطيل رسالة انقطاع الاتصال
      // toast.warning('انقطع الاتصال بالإنترنت', {
      //   description: 'ستعمل التطبيق في وضع أوف لاين'
      // })
    })
  }

  /**
   * إعداد مراقبة إمكانية التثبيت
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.installPrompt = e as PWAInstallPrompt
      
      // تأخير بسيط لضمان تحميل التطبيق أولاً
      setTimeout(() => {
        this.showInstallBanner()
      }, 3000) // 3 ثوانِ
    })

    // فحص إضافي بعد تحميل الصفحة للمتصفحات التي لا تدعم beforeinstallprompt
    window.addEventListener('load', () => {
      setTimeout(() => {
        // إذا لم يتم تشغيل beforeinstallprompt، جرب عرض رسالة عامة
        if (!this.installPrompt) {
          this.checkAndShowGenericInstallPrompt()
        }
      }, 5000) // 5 ثوانِ بعد التحميل
    })

    window.addEventListener('appinstalled', () => {
      toast.success('تم تثبيت التطبيق بنجاح!', {
        description: 'يمكنك الآن الوصول للتطبيق من الشاشة الرئيسية'
      })
      this.installPrompt = null
    })
  }

  /**
   * إعداد مراقبة التحديثات
   */
  private setupUpdateMonitoring(): void {
    // فحص التحديثات كل 30 دقيقة
    setInterval(() => {
      this.checkForUpdates()
    }, 30 * 60 * 1000)
  }

  /**
   * عرض إشعار التحديث
   */
  private showUpdateNotification(): void {
    toast.info('يتوفر تحديث جديد للتطبيق', {
      description: 'اضغط هنا لتطبيق التحديث',
      action: {
        label: 'تحديث',
        onClick: () => this.applyUpdate()
      },
      duration: 10000
    })
  }

  /**
   * فحص وعرض رسالة تثبيت عامة للمتصفحات التي لا تدعم beforeinstallprompt
   */
  private checkAndShowGenericInstallPrompt(): void {
    // التحقق من أن التطبيق غير مثبت
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    const isInstalled = isStandalone || isInWebAppiOS
    
    if (isInstalled) {
      console.log('📱 PWA: App already installed, skipping generic prompt')
      return
    }

    // التحقق من أن المتصفح يدعم PWA
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isEdge = /Edg/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    
    if (isChrome || isEdge || isSafari) {
      console.log('📱 PWA: Showing generic install prompt')
      
      toast.info('📱 يمكن تثبيت تطبيق الفرحان!', {
        description: 'استخدم قائمة المتصفح لتثبيت التطبيق على جهازك',
        action: {
          label: '📖 كيفية التثبيت',
          onClick: () => this.showInstallInstructions()
        },
        duration: 20000,
        position: 'top-center'
      })
    }
  }

  /**
   * عرض تعليمات التثبيت
   */
  private showInstallInstructions(): void {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isEdge = /Edg/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    
    let instructions = ''
    
    if (isChrome || isEdge) {
      instructions = 'اضغط على الثلاث نقاط (⋮) في أعلى المتصفح ← اختر "تثبيت التطبيق" أو "Install App"'
    } else if (isSafari) {
      instructions = 'اضغط على زر المشاركة (📤) ← اختر "إضافة إلى الشاشة الرئيسية"'
    } else {
      instructions = 'ابحث عن خيار "تثبيت التطبيق" أو "Add to Home Screen" في قائمة المتصفح'
    }
    
    toast.info('📖 تعليمات التثبيت', {
      description: instructions,
      duration: 15000,
      position: 'top-center'
    })
  }

  /**
   * عرض بانر التثبيت
   */
  private showInstallBanner(): void {
    // التحقق من أن التطبيق غير مثبت
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    const isInstalled = isStandalone || isInWebAppiOS
    
    if (isInstalled) {
      console.log('📱 PWA: App already installed, skipping banner')
      return
    }
    
    console.log('📱 PWA: Install prompt available - showing banner')
    
    toast.info('📱 تطبيق الفرحان متاح للتثبيت!', {
      description: 'ثبت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت',
      action: {
        label: '⬇️ تثبيت الآن',
        onClick: () => this.installApp()
      },
      duration: 25000, // 25 ثانية
      position: 'top-center'
    })
  }

  /**
   * معالجة رسائل Service Worker
   */
  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'CACHE_SIZE':
        console.log('📊 Cache Size:', this.formatBytes(data.size))
        break
        
      case 'SYNC_COMPLETE':
        // تم تعطيل رسالة المزامنة
        // toast.success('تم مزامنة البيانات بنجاح')
        break
        
      case 'SYNC_FAILED':
        // تم تعطيل رسالة فشل المزامنة
        // toast.error('فشل في مزامنة البيانات')
        break
    }
  }

  /**
   * تثبيت التطبيق
   */
  public async installApp(): Promise<boolean> {
    if (!this.installPrompt) {
      toast.warning('التثبيت غير متاح حالياً')
      return false
    }

    try {
      await this.installPrompt.prompt()
      const { outcome } = await this.installPrompt.userChoice
      
      if (outcome === 'accepted') {
        toast.success('جاري تثبيت التطبيق...')
        return true
      } else {
        toast.info('تم إلغاء التثبيت')
        return false
      }
    } catch (error) {
      console.error('❌ PWA: Install failed', error)
      toast.error('فشل في تثبيت التطبيق')
      return false
    }
  }

  /**
   * تطبيق التحديث
   */
  public async applyUpdate(): Promise<void> {
    if (!this.swRegistration || !this.updateAvailable) {
      return
    }

    try {
      // إرسال رسالة لـ Service Worker للتحديث
      this.sendMessageToSW({ type: 'SKIP_WAITING' })
      
      // إعادة تحميل الصفحة بعد ثانية واحدة
      setTimeout(() => {
        window.location.reload()
      }, 1000)
      
      toast.success('جاري تطبيق التحديث...')
    } catch (error) {
      console.error('❌ PWA: Update failed', error)
      toast.error('فشل في تطبيق التحديث')
    }
  }

  /**
   * فحص التحديثات
   */
  public async checkForUpdates(): Promise<void> {
    if (!this.swRegistration) return

    try {
      await this.swRegistration.update()
    } catch (error) {
      console.error('❌ PWA: Update check failed', error)
    }
  }

  /**
   * cache URLs محددة
   */
  public async cacheUrls(urls: string[]): Promise<void> {
    this.sendMessageToSW({
      type: 'CACHE_URLS',
      urls
    })
  }

  /**
   * مسح الـ cache
   */
  public async clearCache(): Promise<void> {
    this.sendMessageToSW({ type: 'CLEAR_CACHE' })
    toast.success('تم مسح البيانات المحفوظة')
  }

  /**
   * الحصول على معلومات الـ cache
   */
  public async getCacheInfo(): Promise<CacheInfo[]> {
    if (!('caches' in window)) {
      return []
    }

    try {
      const cacheNames = await caches.keys()
      const cacheInfos: CacheInfo[] = []

      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const requests = await cache.keys()
        let size = 0

        for (const request of requests) {
          const response = await cache.match(request)
          if (response) {
            const blob = await response.blob()
            size += blob.size
          }
        }

        cacheInfos.push({
          name,
          size,
          entries: requests.length
        })
      }

      return cacheInfos
    } catch (error) {
      console.error('❌ PWA: Failed to get cache info', error)
      return []
    }
  }

  /**
   * مزامنة البيانات المعلقة
   */
  private async syncPendingData(): Promise<void> {
    // هنا يمكن إضافة منطق مزامنة البيانات المحفوظة محلياً
    // مع الخادم عند استعادة الاتصال
    try {
      // مثال: مزامنة البيانات المحفوظة في localStorage
      const pendingData = localStorage.getItem('pendingSync')
      if (pendingData) {
        // إرسال البيانات للخادم
        // await syncWithServer(JSON.parse(pendingData))
        localStorage.removeItem('pendingSync')
        // تم تعطيل رسالة المزامنة
        // toast.success('تم مزامنة البيانات المحفوظة')
      }
    } catch (error) {
      console.error('❌ PWA: Sync failed', error)
      // تم تعطيل رسالة فشل المزامنة
      // toast.error('فشل في مزامنة البيانات')
    }
  }

  /**
   * إرسال رسالة لـ Service Worker
   */
  private sendMessageToSW(message: any): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message)
    }
  }

  /**
   * تنسيق حجم البايتات
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * التحقق من حالة الاتصال
   */
  public get isConnected(): boolean {
    return this.isOnline
  }

  /**
   * التحقق من إمكانية التثبيت
   */
  public get canInstall(): boolean {
    return this.installPrompt !== null
  }

  /**
   * التحقق من توفر تحديث
   */
  public get hasUpdate(): boolean {
    return this.updateAvailable
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const pwaManager = new PWAManager()

// تصدير الكلاس للاستخدام المتقدم
export { PWAManager }
export type { CacheInfo }

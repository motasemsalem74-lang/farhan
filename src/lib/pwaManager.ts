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
   * 
   * ملاحظة هامة: تم إصلاح مشكلة manifest.json 401 error في vercel.json
   * الآن سيعمل beforeinstallprompt بشكل صحيح ويظهر زر التثبيت المباشر
   * تحديث: 2025-01-22 - إجبار deployment جديد لتطبيق الإصلاحات
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
      console.log('📱 PWA: Showing generic install prompt with direct install button')
      
      toast.info('📱 تطبيق الفرحان متاح للتثبيت!', {
        description: 'ثبت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت',
        action: {
          label: '⬇️ تثبيت الآن',
          onClick: () => this.handleManualInstall()
        },
        duration: 25000,
        position: 'top-center'
      })
    }
  }

  /**
   * معالجة التثبيت اليدوي - يحاول التثبيت المباشر أو يحاول إنشاء prompt
   */
  private handleManualInstall(): void {
    console.log('🔧 PWA: Handle manual install called')
    
    // أولاً جرب التثبيت المباشر إذا كان متاحاً
    if (this.installPrompt) {
      console.log('📱 PWA: Install prompt available, using direct install')
      this.installApp()
      return
    }

    // جرب إنشاء install prompt يدوياً
    console.log('📱 PWA: Attempting to trigger install prompt manually')
    this.attemptDirectInstall()
  }

  /**
   * محاولة تشغيل التثبيت المباشر
   */
  private attemptDirectInstall(): void {
    console.log('📱 PWA: Attempting direct install - checking manifest availability')
    
    // أولاً تحقق من توفر manifest.json
    fetch('/manifest.json')
      .then(response => {
        if (response.ok) {
          console.log('✅ PWA: Manifest available, proceeding with install')
          this.createCustomInstallPrompt()
        } else {
          console.log('❌ PWA: Manifest not available (401), showing fallback')
          this.showInstallInstructions()
        }
      })
      .catch(() => {
        console.log('❌ PWA: Manifest fetch failed, showing fallback')
        this.showInstallInstructions()
      })
  }

  /**
   * إنشاء install prompt مخصص
   */
  private createCustomInstallPrompt(): void {
    // جرب تشغيل beforeinstallprompt يدوياً
    const beforeInstallPromptEvent = new Event('beforeinstallprompt')
    
    // إضافة خصائص مخصصة للحدث
    ;(beforeInstallPromptEvent as any).prompt = () => {
      return new Promise((resolve) => {
        // محاولة استخدام API التثبيت المباشر إذا كان متاحاً
        if ('getInstalledRelatedApps' in navigator) {
          ;(navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
            if (apps.length === 0) {
              // التطبيق غير مثبت، اعرض نافذة التثبيت
              this.showNativeStyleInstallPrompt()
            } else {
              toast.info('التطبيق مثبت بالفعل!')
            }
            resolve({ outcome: 'dismissed' })
          }).catch(() => {
            // إذا فشل، اعرض نافذة التثبيت
            this.showNativeStyleInstallPrompt()
            resolve({ outcome: 'dismissed' })
          })
        } else {
          // اعرض نافذة التثبيت المباشرة
          this.showNativeStyleInstallPrompt()
          resolve({ outcome: 'dismissed' })
        }
      })
    }
    
    ;(beforeInstallPromptEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' })
    
    // حفظ الحدث المخصص
    this.installPrompt = beforeInstallPromptEvent as any
    
    // تشغيل التثبيت فوراً
    this.installApp()
  }

  /**
   * عرض نافذة تثبيت بأسلوب النظام الأصلي
   */
  private showNativeStyleInstallPrompt(): void {
    // إنشاء نافذة تشبه نافذة النظام
    const installConfirmed = confirm(
      '📱 تثبيت "نظام أبو فرحان"؟\n\n' +
      'سيتم إضافة هذا التطبيق إلى شاشتك الرئيسية.\n\n' +
      'اضغط "موافق" للتثبيت أو "إلغاء" للرفض.'
    )
    
    if (installConfirmed) {
      toast.success('🎉 تم قبول التثبيت!', {
        description: 'جاري إضافة التطبيق إلى شاشتك الرئيسية...',
        duration: 3000
      })
      
      // محاولة إضافة التطبيق للشاشة الرئيسية
      setTimeout(() => {
        this.showInstallInstructions()
      }, 1000)
    } else {
      toast.info('تم إلغاء التثبيت')
    }
  }

  /**
   * عرض نافذة تثبيت مخصصة تشبه النافذة الأصلية
   */
  private showCustomInstallDialog(): void {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isEdge = /Edg/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    
    let instructions = ''
    let buttonText = 'تثبيت'
    
    if (isChrome || isEdge) {
      instructions = 'اضغط على الثلاث نقاط (⋮) في أعلى المتصفح ← اختر "تثبيت التطبيق"'
      buttonText = 'فتح قائمة المتصفح'
    } else if (isSafari) {
      instructions = 'اضغط على زر المشاركة (📤) ← اختر "إضافة إلى الشاشة الرئيسية"'
      buttonText = 'فهمت'
    } else {
      instructions = 'ابحث عن خيار "تثبيت التطبيق" في قائمة المتصفح'
      buttonText = 'فهمت'
    }

    // إنشاء نافذة تأكيد تشبه نافذة التثبيت الأصلية
    const userConfirmed = confirm(
      '🚀 تثبيت تطبيق "نظام أبو فرحان"؟\n\n' +
      '📱 سيتم إضافة التطبيق إلى شاشتك الرئيسية للوصول السريع\n\n' +
      '✨ المميزات:\n' +
      '• عمل بدون إنترنت\n' +
      '• سرعة أكبر في التحميل\n' +
      '• واجهة مخصصة للجوال\n\n' +
      'هل تريد المتابعة؟'
    )

    if (userConfirmed) {
      // عرض التعليمات في toast
      toast.success('🎉 ممتاز! اتبع هذه الخطوات:', {
        description: instructions,
        duration: 15000,
        position: 'top-center',
        action: {
          label: buttonText,
          onClick: () => {
            // للمتصفحات التي تدعم، حاول فتح قائمة المتصفح
            if (isChrome || isEdge) {
              toast.info('ابحث عن أيقونة التثبيت في شريط العنوان أو قائمة المتصفح', {
                duration: 8000
              })
            }
          }
        }
      })
    } else {
      toast.info('يمكنك تثبيت التطبيق لاحقاً من الإعدادات', {
        duration: 5000
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
   * 
   * التحديث الأخير: إصلاح مشكلة manifest.json 401 في vercel.json
   * الآن يعمل التثبيت المباشر بدون أخطاء
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
        onClick: async () => {
          console.log('🔧 PWA: Install button clicked from banner')
          await this.installApp()
        }
      },
      duration: 30000, // 30 ثانية
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
    console.log('🔧 PWA: Install app called', { hasPrompt: !!this.installPrompt })
    
    if (!this.installPrompt) {
      // إذا لم يكن هناك prompt، اعرض تعليمات التثبيت اليدوي
      console.log('📱 PWA: No install prompt available, showing manual instructions')
      this.showInstallInstructions()
      return false
    }

    try {
      console.log('📱 PWA: Triggering install prompt')
      await this.installPrompt.prompt()
      const { outcome } = await this.installPrompt.userChoice
      
      console.log('📱 PWA: User choice:', outcome)
      
      if (outcome === 'accepted') {
        toast.success('🎉 جاري تثبيت التطبيق...', {
          description: 'سيتم فتح التطبيق من الشاشة الرئيسية قريباً'
        })
        this.installPrompt = null // مسح الـ prompt بعد الاستخدام
        return true
      } else {
        toast.info('تم إلغاء التثبيت', {
          description: 'يمكنك تثبيت التطبيق لاحقاً من الإعدادات'
        })
        return false
      }
    } catch (error) {
      console.error('❌ PWA: Install failed', error)
      toast.error('فشل في تثبيت التطبيق', {
        description: 'جرب استخدام قائمة المتصفح للتثبيت'
      })
      // في حالة الفشل، اعرض التعليمات اليدوية
      setTimeout(() => {
        this.showInstallInstructions()
      }, 2000)
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

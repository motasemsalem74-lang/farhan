/**
 * نظام التخزين المحلي للعمل أوف لاين
 * يدير حفظ واسترجاع البيانات المهمة محلياً
 */

// import { toast } from 'sonner' // تم تعطيل الرسائل

interface CachedData {
  data: any
  timestamp: number
  expiry?: number
}

interface SyncQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  collection: string
  data: any
  timestamp: number
}

class OfflineStorage {
  private readonly CACHE_PREFIX = 'al_farhan_'
  private readonly SYNC_QUEUE_KEY = 'sync_queue'
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 ساعة
  
  /**
   * حفظ البيانات في التخزين المحلي
   */
  public setItem<T>(key: string, data: T, expiry?: number): void {
    try {
      const cachedData: CachedData = {
        data,
        timestamp: Date.now(),
        expiry: expiry || (Date.now() + this.CACHE_EXPIRY)
      }
      
      localStorage.setItem(
        this.CACHE_PREFIX + key,
        JSON.stringify(cachedData)
      )
    } catch (error) {
      console.error('❌ OfflineStorage: Failed to save data', error)
    }
  }

  /**
   * استرجاع البيانات من التخزين المحلي
   */
  public getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.CACHE_PREFIX + key)
      
      if (!item) {
        return null
      }
      
      const cachedData: CachedData = JSON.parse(item)
      
      // فحص انتهاء الصلاحية
      if (cachedData.expiry && Date.now() > cachedData.expiry) {
        this.removeItem(key)
        return null
      }
      
      return cachedData.data as T
    } catch (error) {
      console.error('❌ OfflineStorage: Failed to get data', error)
      return null
    }
  }

  /**
   * حذف البيانات من التخزين المحلي
   */
  public removeItem(key: string): void {
    try {
      localStorage.removeItem(this.CACHE_PREFIX + key)
    } catch (error) {
      console.error('❌ OfflineStorage: Failed to remove data', error)
    }
  }

  /**
   * مسح جميع البيانات المحفوظة
   */
  public clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
      // تم تعطيل رسالة مسح البيانات
      // toast.success('تم مسح جميع البيانات المحفوظة')
    } catch (error) {
      console.error('❌ OfflineStorage: Failed to clear data', error)
    }
  }

  /**
   * الحصول على حجم البيانات المحفوظة
   */
  public getStorageSize(): number {
    try {
      let totalSize = 0
      const keys = Object.keys(localStorage)
      
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const item = localStorage.getItem(key)
          if (item) {
            totalSize += new Blob([item]).size
          }
        }
      })
      
      return totalSize
    } catch (error) {
      console.error('❌ OfflineStorage: Failed to calculate size', error)
      return 0
    }
  }

  /**
   * حفظ بيانات المخزون
   */
  public cacheInventory(inventory: any[]): void {
    this.setItem('inventory_items', inventory)
    console.log('📦 Cached inventory items:', inventory.length)
  }

  /**
   * استرجاع بيانات المخزون
   */
  public getCachedInventory(): any[] | null {
    return this.getItem<any[]>('inventory_items')
  }

  /**
   * حفظ بيانات الوكلاء
   */
  public cacheAgents(agents: any[]): void {
    this.setItem('agents', agents)
    console.log('👥 Cached agents:', agents.length)
  }

  /**
   * استرجاع بيانات الوكلاء
   */
  public getCachedAgents(): any[] | null {
    return this.getItem<any[]>('agents')
  }

  /**
   * حفظ بيانات العملاء
   */
  public cacheCustomers(customers: any[]): void {
    this.setItem('customers', customers)
    console.log('🧑‍🤝‍🧑 Cached customers:', customers.length)
  }

  /**
   * استرجاع بيانات العملاء
   */
  public getCachedCustomers(): any[] | null {
    return this.getItem<any[]>('customers')
  }

  /**
   * حفظ بيانات المبيعات
   */
  public cacheSales(sales: any[]): void {
    this.setItem('sales', sales)
    console.log('💰 Cached sales:', sales.length)
  }

  /**
   * استرجاع بيانات المبيعات
   */
  public getCachedSales(): any[] | null {
    return this.getItem<any[]>('sales')
  }

  /**
   * حفظ بيانات المخازن
   */
  public cacheWarehouses(warehouses: any[]): void {
    this.setItem('warehouses', warehouses)
    console.log('🏪 Cached warehouses:', warehouses.length)
  }

  /**
   * استرجاع بيانات المخازن
   */
  public getCachedWarehouses(): any[] | null {
    return this.getItem<any[]>('warehouses')
  }

  /**
   * حفظ بيانات المستخدم
   */
  public cacheUserData(userData: any): void {
    this.setItem('user_data', userData)
    console.log('👤 Cached user data')
  }

  /**
   * استرجاع بيانات المستخدم
   */
  public getCachedUserData(): any | null {
    return this.getItem<any>('user_data')
  }

  /**
   * حفظ إعدادات التطبيق
   */
  public cacheAppSettings(settings: any): void {
    this.setItem('app_settings', settings, Date.now() + (7 * 24 * 60 * 60 * 1000)) // أسبوع
    console.log('⚙️ Cached app settings')
  }

  /**
   * استرجاع إعدادات التطبيق
   */
  public getCachedAppSettings(): any | null {
    return this.getItem<any>('app_settings')
  }

  /**
   * إضافة عملية للطابور المزامنة
   */
  public addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): void {
    try {
      const queue = this.getSyncQueue()
      const newItem: SyncQueueItem = {
        ...item,
        id: this.generateId(),
        timestamp: Date.now()
      }
      
      queue.push(newItem)
      this.setSyncQueue(queue)
      
      console.log('📤 Added to sync queue:', newItem.type, newItem.collection)
    } catch (error) {
      console.error('❌ OfflineStorage: Failed to add to sync queue', error)
    }
  }

  /**
   * الحصول على طابور المزامنة
   */
  public getSyncQueue(): SyncQueueItem[] {
    return this.getItem<SyncQueueItem[]>(this.SYNC_QUEUE_KEY) || []
  }

  /**
   * تحديث طابور المزامنة
   */
  private setSyncQueue(queue: SyncQueueItem[]): void {
    this.setItem(this.SYNC_QUEUE_KEY, queue)
  }

  /**
   * إزالة عنصر من طابور المزامنة
   */
  public removeFromSyncQueue(id: string): void {
    try {
      const queue = this.getSyncQueue()
      const updatedQueue = queue.filter(item => item.id !== id)
      this.setSyncQueue(updatedQueue)
      
      console.log('✅ Removed from sync queue:', id)
    } catch (error) {
      console.error('❌ OfflineStorage: Failed to remove from sync queue', error)
    }
  }

  /**
   * مسح طابور المزامنة
   */
  public clearSyncQueue(): void {
    this.removeItem(this.SYNC_QUEUE_KEY)
    console.log('🗑️ Sync queue cleared')
  }

  /**
   * معالجة طابور المزامنة عند الاتصال
   */
  public async processSyncQueue(): Promise<void> {
    const queue = this.getSyncQueue()
    
    if (queue.length === 0) {
      return
    }

    console.log('🔄 Processing sync queue:', queue.length, 'items')
    
    for (const item of queue) {
      try {
        await this.syncItem(item)
        this.removeFromSyncQueue(item.id)
      } catch (error) {
        console.error('❌ Failed to sync item:', item, error)
        // الاحتفاظ بالعنصر في الطابور للمحاولة لاحقاً
      }
    }
  }

  /**
   * مزامنة عنصر واحد
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    // هنا يتم تنفيذ المزامنة الفعلية مع Firebase
    // هذا مثال على الهيكل - يحتاج للتطوير حسب احتياجات التطبيق
    
    switch (item.type) {
      case 'create':
        // await createDocument(item.collection, item.data)
        break
        
      case 'update':
        // await updateDocument(item.collection, item.data.id, item.data)
        break
        
      case 'delete':
        // await deleteDocument(item.collection, item.data.id)
        break
    }
  }

  /**
   * حفظ البيانات للاستخدام أوف لاين
   */
  public async cacheEssentialData(): Promise<void> {
    try {
      // هنا يمكن إضافة منطق لجلب وحفظ البيانات المهمة
      // من Firebase عند الاتصال
      
      console.log('📥 Caching essential data for offline use...')
      
      // مثال: حفظ آخر 100 عنصر من المخزون
      // const inventory = await getInventoryItems(100)
      // this.cacheInventory(inventory)
      
      // مثال: حفظ جميع الوكلاء
      // const agents = await getAgents()
      // this.cacheAgents(agents)
      
      // تم تعطيل رسالة حفظ البيانات أوف لاين
      // toast.success('تم حفظ البيانات للاستخدام أوف لاين')
    } catch (error) {
      console.error('❌ OfflineStorage: Failed to cache essential data', error)
      // تم تعطيل رسالة فشل حفظ البيانات أوف لاين
      // toast.error('فشل في حفظ البيانات أوف لاين')
    }
  }

  /**
   * فحص ما إذا كانت البيانات متوفرة أوف لاين
   */
  public hasOfflineData(): boolean {
    const inventory = this.getCachedInventory()
    const agents = this.getCachedAgents()
    const customers = this.getCachedCustomers()
    
    return !!(inventory?.length || agents?.length || customers?.length)
  }

  /**
   * الحصول على إحصائيات البيانات المحفوظة
   */
  public getOfflineStats(): {
    inventory: number
    agents: number
    customers: number
    sales: number
    warehouses: number
    totalSize: string
    syncQueueSize: number
  } {
    return {
      inventory: this.getCachedInventory()?.length || 0,
      agents: this.getCachedAgents()?.length || 0,
      customers: this.getCachedCustomers()?.length || 0,
      sales: this.getCachedSales()?.length || 0,
      warehouses: this.getCachedWarehouses()?.length || 0,
      totalSize: this.formatBytes(this.getStorageSize()),
      syncQueueSize: this.getSyncQueue().length
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
   * توليد معرف فريد
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * فحص صحة البيانات المحفوظة
   */
  public validateCachedData(): boolean {
    try {
      const keys = Object.keys(localStorage)
      let validCount = 0
      let totalCount = 0
      
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          totalCount++
          try {
            const item = localStorage.getItem(key)
            if (item) {
              JSON.parse(item)
              validCount++
            }
          } catch {
            // بيانات تالفة - حذفها
            localStorage.removeItem(key)
          }
        }
      })
      
      console.log(`✅ Validated cache: ${validCount}/${totalCount} items valid`)
      return validCount === totalCount
    } catch (error) {
      console.error('❌ OfflineStorage: Validation failed', error)
      return false
    }
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const offlineStorage = new OfflineStorage()

// تصدير الكلاس للاستخدام المتقدم
export { OfflineStorage }
export type { SyncQueueItem, CachedData }

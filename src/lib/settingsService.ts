import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore'
import { db } from './firebase'
import { 
  SystemSettings, 
  UserPreferences, 
  SystemLog, 
  BackupRecord,
  MaintenanceMode,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_USER_PREFERENCES
} from '../types/settings'

export class SettingsService {
  private static instance: SettingsService
  private systemSettings: SystemSettings | null = null
  private userPreferences: Map<string, UserPreferences> = new Map()

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService()
    }
    return SettingsService.instance
  }

  // System Settings Management
  async getSystemSettings(): Promise<SystemSettings> {
    try {
      if (this.systemSettings) {
        return this.systemSettings
      }

      const settingsDoc = await getDoc(doc(db, 'system_settings', 'main'))
      
      if (!settingsDoc.exists()) {
        // Initialize with default settings
        const defaultSettings = {
          id: 'main',
          ...DEFAULT_SYSTEM_SETTINGS,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: 'system'
        }
        
        await setDoc(doc(db, 'system_settings', 'main'), defaultSettings)
        this.systemSettings = defaultSettings as SystemSettings
        return this.systemSettings
      }

      this.systemSettings = { id: settingsDoc.id, ...settingsDoc.data() } as SystemSettings
      return this.systemSettings
    } catch (error) {
      console.error('❌ Error getting system settings:', error)
      throw error
    }
  }

  async updateSystemSettings(updates: Partial<SystemSettings>, updatedBy: string): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy
      }

      await updateDoc(doc(db, 'system_settings', 'main'), updateData)
      
      // Update cached settings
      if (this.systemSettings) {
        this.systemSettings = { ...this.systemSettings, ...updateData } as SystemSettings
      }

      // Log the change
      await this.logSystemActivity('info', 'system', 'System settings updated', {
        updatedFields: Object.keys(updates),
        updatedBy
      })

      console.log('✅ System settings updated')
    } catch (error) {
      console.error('❌ Error updating system settings:', error)
      throw error
    }
  }

  async resetSystemSettings(resetBy: string): Promise<void> {
    try {
      const defaultSettings = {
        id: 'main',
        ...DEFAULT_SYSTEM_SETTINGS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: resetBy
      }

      await setDoc(doc(db, 'system_settings', 'main'), defaultSettings)
      this.systemSettings = defaultSettings as SystemSettings

      await this.logSystemActivity('warning', 'system', 'System settings reset to defaults', {
        resetBy
      })

      console.log('✅ System settings reset to defaults')
    } catch (error) {
      console.error('❌ Error resetting system settings:', error)
      throw error
    }
  }

  // User Preferences Management
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      if (this.userPreferences.has(userId)) {
        return this.userPreferences.get(userId)!
      }

      const preferencesDoc = await getDoc(doc(db, 'user_preferences', userId))
      
      if (!preferencesDoc.exists()) {
        // Initialize with default preferences
        const defaultPreferences = {
          userId,
          ...DEFAULT_USER_PREFERENCES,
          updatedAt: serverTimestamp()
        }
        
        await setDoc(doc(db, 'user_preferences', userId), defaultPreferences)
        this.userPreferences.set(userId, defaultPreferences as UserPreferences)
        return defaultPreferences as UserPreferences
      }

      const preferences = { userId, ...preferencesDoc.data() } as UserPreferences
      this.userPreferences.set(userId, preferences)
      return preferences
    } catch (error) {
      console.error('❌ Error getting user preferences:', error)
      throw error
    }
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      }

      await updateDoc(doc(db, 'user_preferences', userId), updateData)
      
      // Update cached preferences
      if (this.userPreferences.has(userId)) {
        const current = this.userPreferences.get(userId)!
        this.userPreferences.set(userId, { ...current, ...updateData } as UserPreferences)
      }

      console.log('✅ User preferences updated for:', userId)
    } catch (error) {
      console.error('❌ Error updating user preferences:', error)
      throw error
    }
  }

  async resetUserPreferences(userId: string): Promise<void> {
    try {
      const defaultPreferences = {
        userId,
        ...DEFAULT_USER_PREFERENCES,
        updatedAt: serverTimestamp()
      }

      await setDoc(doc(db, 'user_preferences', userId), defaultPreferences)
      this.userPreferences.set(userId, defaultPreferences as UserPreferences)

      console.log('✅ User preferences reset for:', userId)
    } catch (error) {
      console.error('❌ Error resetting user preferences:', error)
      throw error
    }
  }

  // System Logging
  async logSystemActivity(
    level: 'info' | 'warning' | 'error' | 'debug',
    category: 'system' | 'user' | 'security' | 'backup' | 'integration',
    message: string,
    details?: Record<string, any>,
    userId?: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const logData = {
        level,
        category,
        message,
        details: details || {},
        userId,
        ip,
        userAgent,
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'system_logs'), logData)
    } catch (error) {
      console.error('❌ Error logging system activity:', error)
      // Don't throw error for logging failures
    }
  }

  async getSystemLogs(options: {
    level?: 'info' | 'warning' | 'error' | 'debug'
    category?: 'system' | 'user' | 'security' | 'backup' | 'integration'
    userId?: string
    limit?: number
    startDate?: Date
    endDate?: Date
  } = {}): Promise<SystemLog[]> {
    try {
      let q = query(collection(db, 'system_logs'), orderBy('createdAt', 'desc'))

      if (options.level) {
        q = query(q, where('level', '==', options.level))
      }

      if (options.category) {
        q = query(q, where('category', '==', options.category))
      }

      if (options.userId) {
        q = query(q, where('userId', '==', options.userId))
      }

      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      const snapshot = await getDocs(q)
      let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SystemLog[]

      // Filter by date range if specified
      if (options.startDate || options.endDate) {
        logs = logs.filter(log => {
          const logDate = log.createdAt.toDate()
          if (options.startDate && logDate < options.startDate) return false
          if (options.endDate && logDate > options.endDate) return false
          return true
        })
      }

      return logs
    } catch (error) {
      console.error('❌ Error getting system logs:', error)
      throw error
    }
  }

  // Backup Management
  async createBackup(type: 'manual' | 'automatic', collections: string[], createdBy?: string): Promise<string> {
    try {
      const backupData = {
        type,
        status: 'pending' as const,
        collections,
        createdBy,
        createdAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'backup_records'), backupData)
      
      await this.logSystemActivity('info', 'backup', `Backup ${type} initiated`, {
        backupId: docRef.id,
        collections,
        createdBy
      })

      // TODO: Implement actual backup logic here
      // This would typically involve exporting data to cloud storage
      
      console.log('✅ Backup initiated:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('❌ Error creating backup:', error)
      throw error
    }
  }

  async updateBackupStatus(
    backupId: string, 
    status: 'in_progress' | 'completed' | 'failed',
    size?: number,
    location?: string,
    error?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      }

      if (status === 'completed') {
        updateData.completedAt = serverTimestamp()
        if (size) updateData.size = size
        if (location) updateData.location = location
      }

      if (status === 'failed' && error) {
        updateData.error = error
      }

      await updateDoc(doc(db, 'backup_records', backupId), updateData)
      
      await this.logSystemActivity(
        status === 'failed' ? 'error' : 'info', 
        'backup', 
        `Backup ${status}`, 
        { backupId, status, error }
      )

      console.log('✅ Backup status updated:', backupId, status)
    } catch (error) {
      console.error('❌ Error updating backup status:', error)
      throw error
    }
  }

  async getBackupRecords(limitCount: number = 50): Promise<BackupRecord[]> {
    try {
      const q = query(
        collection(db, 'backup_records'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BackupRecord[]
    } catch (error) {
      console.error('❌ Error getting backup records:', error)
      throw error
    }
  }

  // Maintenance Mode
  async setMaintenanceMode(
    enabled: boolean,
    message: string,
    messageEn?: string,
    allowedUsers: string[] = [],
    scheduledStart?: Date,
    scheduledEnd?: Date,
    createdBy: string = 'system'
  ): Promise<void> {
    try {
      const maintenanceData = {
        id: 'main',
        enabled,
        message,
        messageEn,
        allowedUsers,
        scheduledStart: scheduledStart ? scheduledStart : null,
        scheduledEnd: scheduledEnd ? scheduledEnd : null,
        createdBy,
        createdAt: serverTimestamp()
      }

      await setDoc(doc(db, 'maintenance_mode', 'main'), maintenanceData)
      
      await this.logSystemActivity(
        'warning', 
        'system', 
        `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, 
        { message, allowedUsers: allowedUsers.length, createdBy }
      )

      console.log('✅ Maintenance mode updated:', enabled)
    } catch (error) {
      console.error('❌ Error setting maintenance mode:', error)
      throw error
    }
  }

  async getMaintenanceMode(): Promise<MaintenanceMode | null> {
    try {
      const maintenanceDoc = await getDoc(doc(db, 'maintenance_mode', 'main'))
      
      if (!maintenanceDoc.exists()) {
        return null
      }

      return { id: maintenanceDoc.id, ...maintenanceDoc.data() } as MaintenanceMode
    } catch (error) {
      console.error('❌ Error getting maintenance mode:', error)
      throw error
    }
  }

  // Feature Flags
  async isFeatureEnabled(feature: keyof SystemSettings['features']): Promise<boolean> {
    try {
      const settings = await this.getSystemSettings()
      return settings.features[feature] || false
    } catch (error) {
      console.error('❌ Error checking feature flag:', error)
      return false
    }
  }

  async toggleFeature(feature: keyof SystemSettings['features'], enabled: boolean, updatedBy: string): Promise<void> {
    try {
      await this.updateSystemSettings({
        features: {
          ...this.systemSettings?.features,
          [feature]: enabled
        }
      }, updatedBy)

      await this.logSystemActivity('info', 'system', `Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`, {
        feature,
        enabled,
        updatedBy
      })

      console.log('✅ Feature toggled:', feature, enabled)
    } catch (error) {
      console.error('❌ Error toggling feature:', error)
      throw error
    }
  }

  // Real-time subscriptions
  subscribeToSystemSettings(callback: (settings: SystemSettings) => void): () => void {
    return onSnapshot(doc(db, 'system_settings', 'main'), (doc) => {
      if (doc.exists()) {
        const settings = { id: doc.id, ...doc.data() } as SystemSettings
        this.systemSettings = settings
        callback(settings)
      }
    })
  }

  subscribeToUserPreferences(userId: string, callback: (preferences: UserPreferences) => void): () => void {
    return onSnapshot(doc(db, 'user_preferences', userId), (doc) => {
      if (doc.exists()) {
        const preferences = { userId, ...doc.data() } as UserPreferences
        this.userPreferences.set(userId, preferences)
        callback(preferences)
      }
    })
  }

  subscribeToMaintenanceMode(callback: (maintenance: MaintenanceMode | null) => void): () => void {
    return onSnapshot(doc(db, 'maintenance_mode', 'main'), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as MaintenanceMode)
      } else {
        callback(null)
      }
    })
  }

  // Cache management
  clearCache(): void {
    this.systemSettings = null
    this.userPreferences.clear()
  }

  // Validation helpers
  validateSystemSettings(settings: Partial<SystemSettings>): string[] {
    const errors: string[] = []

    if (settings.business) {
      if (settings.business.taxRate < 0 || settings.business.taxRate > 100) {
        errors.push('معدل الضريبة يجب أن يكون بين 0 و 100')
      }
      if (settings.business.defaultCommissionRate < 0 || settings.business.defaultCommissionRate > 100) {
        errors.push('معدل العمولة الافتراضي يجب أن يكون بين 0 و 100')
      }
      if (settings.business.lowStockThreshold < 0) {
        errors.push('حد المخزون المنخفض يجب أن يكون رقم موجب')
      }
    }

    if (settings.security) {
      if (settings.security.passwordMinLength < 6 || settings.security.passwordMinLength > 50) {
        errors.push('الحد الأدنى لطول كلمة المرور يجب أن يكون بين 6 و 50 حرف')
      }
      if (settings.security.sessionTimeout < 30 || settings.security.sessionTimeout > 1440) {
        errors.push('مهلة الجلسة يجب أن تكون بين 30 دقيقة و 24 ساعة')
      }
      if (settings.security.maxLoginAttempts < 3 || settings.security.maxLoginAttempts > 20) {
        errors.push('الحد الأقصى لمحاولات تسجيل الدخول يجب أن يكون بين 3 و 20')
      }
    }

    return errors
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance()

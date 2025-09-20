import { Timestamp } from 'firebase/firestore'

export interface SystemSettings {
  id: string
  
  // Company Information
  companyInfo: {
    name: string
    nameEn?: string
    logo?: string
    address: string
    phone: string
    email: string
    website?: string
    taxNumber?: string
    commercialRegister?: string
  }
  
  // Business Settings
  business: {
    currency: string
    currencySymbol: string
    taxRate: number // percentage
    defaultCommissionRate: number // percentage for agents
    lowStockThreshold: number
    autoGenerateIds: boolean
    idPrefix: string
  }
  
  // Notification Settings
  notifications: {
    enableEmailNotifications: boolean
    enableSmsNotifications: boolean
    enablePushNotifications: boolean
    lowStockAlerts: boolean
    salesAlerts: boolean
    agentPaymentAlerts: boolean
    systemAlerts: boolean
    
    // Email settings
    emailSettings?: {
      smtpHost: string
      smtpPort: number
      smtpUser: string
      smtpPassword: string
      fromEmail: string
      fromName: string
    }
    
    // SMS settings
    smsSettings?: {
      provider: 'twilio' | 'nexmo' | 'local'
      apiKey: string
      apiSecret: string
      fromNumber: string
    }
  }
  
  // Security Settings
  security: {
    passwordMinLength: number
    passwordRequireUppercase: boolean
    passwordRequireLowercase: boolean
    passwordRequireNumbers: boolean
    passwordRequireSymbols: boolean
    sessionTimeout: number // minutes
    maxLoginAttempts: number
    lockoutDuration: number // minutes
    requireTwoFactor: boolean
    allowedIpRanges?: string[]
  }
  
  // Backup Settings
  backup: {
    enableAutoBackup: boolean
    backupFrequency: 'daily' | 'weekly' | 'monthly'
    backupTime: string // HH:mm format
    retentionDays: number
    backupLocation: 'local' | 'cloud'
    cloudProvider?: 'aws' | 'google' | 'azure'
    cloudSettings?: Record<string, any>
  }
  
  // Integration Settings
  integrations: {
    cloudinary: {
      enabled: boolean
      cloudName: string
      apiKey: string
      apiSecret: string
    }
    
    ocr: {
      enabled: boolean
      provider: 'google' | 'aws' | 'azure' | 'local'
      apiKey: string
      endpoint?: string
    }
    
    payment: {
      enabled: boolean
      providers: {
        fawry?: {
          enabled: boolean
          merchantCode: string
          securityKey: string
        }
        paymob?: {
          enabled: boolean
          apiKey: string
          integrationId: string
        }
      }
    }
  }
  
  // UI Settings
  ui: {
    theme: 'light' | 'dark' | 'system'
    primaryColor: string
    language: 'ar' | 'en'
    dateFormat: string
    timeFormat: '12h' | '24h'
    itemsPerPage: number
    showWelcomeMessage: boolean
  }
  
  // Feature Flags
  features: {
    enableAgentSales: boolean
    enableDirectSales: boolean
    enableInventoryTracking: boolean
    enableDocumentTracking: boolean
    enableReports: boolean
    enableNotifications: boolean
    enableUserManagement: boolean
    enableBackup: boolean
    enableIntegrations: boolean
  }
  
  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
  updatedBy: string
  version: string
}

export interface UserPreferences {
  userId: string
  
  // Display preferences
  theme: 'light' | 'dark' | 'system'
  language: 'ar' | 'en'
  dateFormat: string
  timeFormat: '12h' | '24h'
  timezone: string
  
  // Dashboard preferences
  dashboardLayout: 'default' | 'compact' | 'detailed'
  defaultPage: string
  itemsPerPage: number
  
  // Notification preferences
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    desktop: boolean
    sound: boolean
    
    // Type-specific preferences
    sales: boolean
    inventory: boolean
    agents: boolean
    system: boolean
  }
  
  // Quick access
  favoritePages: string[]
  recentlyViewed: {
    type: string
    id: string
    name: string
    viewedAt: Timestamp
  }[]
  
  // Metadata
  updatedAt: Timestamp
}

export interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error' | 'debug'
  category: 'system' | 'user' | 'security' | 'backup' | 'integration'
  message: string
  details?: Record<string, any>
  userId?: string
  ip?: string
  userAgent?: string
  createdAt: Timestamp
}

export interface BackupRecord {
  id: string
  type: 'manual' | 'automatic'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  size?: number // bytes
  location: string
  collections: string[]
  error?: string
  createdBy?: string
  createdAt: Timestamp
  completedAt?: Timestamp
}

export interface MaintenanceMode {
  id: string
  enabled: boolean
  message: string
  messageEn?: string
  allowedUsers: string[] // User IDs who can access during maintenance
  scheduledStart?: Timestamp
  scheduledEnd?: Timestamp
  createdBy: string
  createdAt: Timestamp
}

// Default system settings
export const DEFAULT_SYSTEM_SETTINGS: Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  companyInfo: {
    name: 'شركة الفرحان للموتوسيكلات',
    nameEn: 'Al Farhan Motorcycles Company',
    address: 'القاهرة، مصر',
    phone: '+20123456789',
    email: 'info@alfarhan.com'
  },
  
  business: {
    currency: 'EGP',
    currencySymbol: 'ج.م',
    taxRate: 14,
    defaultCommissionRate: 10,
    lowStockThreshold: 5,
    autoGenerateIds: true,
    idPrefix: 'ALF'
  },
  
  notifications: {
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    enablePushNotifications: true,
    lowStockAlerts: true,
    salesAlerts: true,
    agentPaymentAlerts: true,
    systemAlerts: true
  },
  
  security: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    sessionTimeout: 480, // 8 hours
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    requireTwoFactor: false
  },
  
  backup: {
    enableAutoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    retentionDays: 30,
    backupLocation: 'cloud'
  },
  
  integrations: {
    cloudinary: {
      enabled: true,
      cloudName: '',
      apiKey: '',
      apiSecret: ''
    },
    
    ocr: {
      enabled: true,
      provider: 'google',
      apiKey: ''
    },
    
    payment: {
      enabled: false,
      providers: {}
    }
  },
  
  ui: {
    theme: 'light',
    primaryColor: '#3B82F6',
    language: 'ar',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    itemsPerPage: 20,
    showWelcomeMessage: true
  },
  
  features: {
    enableAgentSales: true,
    enableDirectSales: true,
    enableInventoryTracking: true,
    enableDocumentTracking: true,
    enableReports: true,
    enableNotifications: true,
    enableUserManagement: true,
    enableBackup: true,
    enableIntegrations: true
  },
  
  version: '1.0.0'
}

// Default user preferences
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'userId' | 'updatedAt'> = {
  theme: 'light',
  language: 'ar',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  timezone: 'Africa/Cairo',
  
  dashboardLayout: 'default',
  defaultPage: '/dashboard',
  itemsPerPage: 20,
  
  notifications: {
    email: true,
    sms: false,
    push: true,
    desktop: true,
    sound: true,
    sales: true,
    inventory: true,
    agents: true,
    system: true
  },
  
  favoritePages: [],
  recentlyViewed: []
}

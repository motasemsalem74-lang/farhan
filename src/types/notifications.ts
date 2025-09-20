import { Timestamp } from 'firebase/firestore'

export type NotificationType = 
  | 'sale_completed'
  | 'inventory_low'
  | 'document_status_changed'
  | 'agent_payment_due'
  | 'warehouse_transfer'
  | 'system_alert'
  | 'user_action'
  | 'report_generated'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export type NotificationStatus = 'unread' | 'read' | 'archived'

export interface NotificationAction {
  id: string
  label: string
  action: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  icon?: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  status: NotificationStatus
  
  // Recipients
  userId?: string // For specific user
  userIds?: string[] // For multiple users
  roleId?: string // For all users with specific role
  broadcast?: boolean // For all users
  
  // Metadata
  relatedEntityId?: string // ID of related sale, inventory, etc.
  relatedEntityType?: string // 'sale', 'inventory', 'agent', etc.
  
  // Actions
  actions?: NotificationAction[]
  
  // Timestamps
  createdAt: Timestamp
  readAt?: Timestamp
  archivedAt?: Timestamp
  expiresAt?: Timestamp
  
  // Creator info
  createdBy: string
  createdByName?: string
  
  // Additional data
  data?: Record<string, any>
  
  // UI preferences
  showInApp?: boolean
  showAsToast?: boolean
  playSound?: boolean
  
  // Tracking
  clickCount?: number
  lastClickedAt?: Timestamp
}

export interface NotificationPreferences {
  userId: string
  
  // Global settings
  enableNotifications: boolean
  enableSounds: boolean
  enableToasts: boolean
  
  // Type-specific settings
  typeSettings: Record<NotificationType, {
    enabled: boolean
    priority: NotificationPriority
    showInApp: boolean
    showAsToast: boolean
    playSound: boolean
  }>
  
  // Quiet hours
  quietHours?: {
    enabled: boolean
    startTime: string // HH:mm format
    endTime: string // HH:mm format
    timezone: string
  }
  
  // Auto-archive settings
  autoArchive?: {
    enabled: boolean
    daysAfterRead: number
    daysAfterCreated: number
  }
  
  updatedAt: Timestamp
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  name: string
  titleTemplate: string
  messageTemplate: string
  defaultPriority: NotificationPriority
  defaultActions?: NotificationAction[]
  variables: string[] // Available template variables
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface NotificationStats {
  userId: string
  totalReceived: number
  totalRead: number
  totalArchived: number
  totalClicked: number
  
  // By type
  byType: Record<NotificationType, {
    received: number
    read: number
    clicked: number
  }>
  
  // By priority
  byPriority: Record<NotificationPriority, {
    received: number
    read: number
  }>
  
  lastUpdated: Timestamp
}

import { Timestamp } from 'firebase/firestore'

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee' | 'agent' | 'viewer'

export type Permission = 
  // Sales permissions
  | 'sales.create'
  | 'sales.view'
  | 'sales.edit'
  | 'sales.delete'
  | 'sales.approve'
  
  // Inventory permissions
  | 'inventory.create'
  | 'inventory.view'
  | 'inventory.edit'
  | 'inventory.delete'
  | 'inventory.transfer'
  
  // Agent permissions
  | 'agents.create'
  | 'agents.view'
  | 'agents.edit'
  | 'agents.delete'
  | 'agents.manage_balance'
  
  // Warehouse permissions
  | 'warehouses.create'
  | 'warehouses.view'
  | 'warehouses.edit'
  | 'warehouses.delete'
  | 'warehouses.manage'
  
  // User management permissions
  | 'users.create'
  | 'users.view'
  | 'users.edit'
  | 'users.delete'
  | 'users.manage_roles'
  
  // Financial permissions
  | 'finance.view_reports'
  | 'finance.manage_transactions'
  | 'finance.export_data'
  
  // System permissions
  | 'system.settings'
  | 'system.backup'
  | 'system.logs'
  | 'system.notifications'

export interface Role {
  id: string
  name: string
  displayName: string
  description: string
  permissions: Permission[]
  isSystemRole: boolean // Cannot be deleted or modified
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  avatar?: string
  
  // Role and permissions
  roleId: string
  role?: Role
  customPermissions?: Permission[] // Additional permissions beyond role
  deniedPermissions?: Permission[] // Permissions to deny from role
  
  // Status
  isActive: boolean
  isEmailVerified: boolean
  lastLoginAt?: Timestamp
  
  // Profile information
  department?: string
  position?: string
  employeeId?: string
  
  // Preferences
  language: 'ar' | 'en'
  timezone: string
  theme: 'light' | 'dark' | 'system'
  
  // Security
  requirePasswordChange: boolean
  twoFactorEnabled: boolean
  
  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  
  // Agent specific (if user is an agent)
  agentId?: string
  warehouseId?: string
}

export interface UserSession {
  id: string
  userId: string
  deviceInfo: {
    userAgent: string
    ip: string
    location?: string
    device: string
    browser: string
    os: string
  }
  isActive: boolean
  loginAt: Timestamp
  lastActivityAt: Timestamp
  logoutAt?: Timestamp
}

export interface UserActivity {
  id: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ip: string
  userAgent: string
  createdAt: Timestamp
}

export interface PasswordResetRequest {
  id: string
  userId: string
  token: string
  expiresAt: Timestamp
  isUsed: boolean
  createdAt: Timestamp
}

export interface UserInvitation {
  id: string
  email: string
  roleId: string
  invitedBy: string
  token: string
  expiresAt: Timestamp
  isAccepted: boolean
  acceptedAt?: Timestamp
  createdAt: Timestamp
}

// Permission groups for better organization
export const PERMISSION_GROUPS = {
  sales: {
    name: 'المبيعات',
    permissions: [
      'sales.create',
      'sales.view', 
      'sales.edit',
      'sales.delete',
      'sales.approve'
    ]
  },
  inventory: {
    name: 'المخزون',
    permissions: [
      'inventory.create',
      'inventory.view',
      'inventory.edit', 
      'inventory.delete',
      'inventory.transfer'
    ]
  },
  agents: {
    name: 'الوكلاء',
    permissions: [
      'agents.create',
      'agents.view',
      'agents.edit',
      'agents.delete',
      'agents.manage_balance'
    ]
  },
  warehouses: {
    name: 'المخازن',
    permissions: [
      'warehouses.create',
      'warehouses.view',
      'warehouses.edit',
      'warehouses.delete',
      'warehouses.manage'
    ]
  },
  users: {
    name: 'المستخدمين',
    permissions: [
      'users.create',
      'users.view',
      'users.edit',
      'users.delete',
      'users.manage_roles'
    ]
  },
  finance: {
    name: 'المالية',
    permissions: [
      'finance.view_reports',
      'finance.manage_transactions',
      'finance.export_data'
    ]
  },
  system: {
    name: 'النظام',
    permissions: [
      'system.settings',
      'system.backup',
      'system.logs',
      'system.notifications'
    ]
  }
}

// Default roles with their permissions
export const DEFAULT_ROLES: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    name: 'super_admin',
    displayName: 'مدير عام',
    description: 'صلاحيات كاملة على النظام',
    permissions: Object.values(PERMISSION_GROUPS).flatMap(group => group.permissions) as Permission[],
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'admin',
    displayName: 'مدير',
    description: 'صلاحيات إدارية واسعة',
    permissions: [
      'sales.create', 'sales.view', 'sales.edit', 'sales.approve',
      'inventory.create', 'inventory.view', 'inventory.edit', 'inventory.transfer',
      'agents.create', 'agents.view', 'agents.edit', 'agents.manage_balance',
      'warehouses.view', 'warehouses.edit', 'warehouses.manage',
      'users.view', 'users.edit',
      'finance.view_reports', 'finance.manage_transactions', 'finance.export_data'
    ],
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'manager',
    displayName: 'مدير قسم',
    description: 'إدارة العمليات اليومية',
    permissions: [
      'sales.create', 'sales.view', 'sales.edit',
      'inventory.create', 'inventory.view', 'inventory.edit', 'inventory.transfer',
      'agents.view', 'agents.edit',
      'warehouses.view', 'warehouses.manage',
      'finance.view_reports'
    ],
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'employee',
    displayName: 'موظف',
    description: 'العمليات الأساسية',
    permissions: [
      'sales.create', 'sales.view',
      'inventory.view', 'inventory.edit',
      'agents.view',
      'warehouses.view'
    ],
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'agent',
    displayName: 'وكيل',
    description: 'وكيل مبيعات',
    permissions: [
      'sales.create', 'sales.view',
      'inventory.view'
    ],
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'viewer',
    displayName: 'مشاهد',
    description: 'عرض البيانات فقط',
    permissions: [
      'sales.view',
      'inventory.view',
      'agents.view',
      'warehouses.view'
    ],
    isSystemRole: true,
    isActive: true
  }
]

// Permission labels in Arabic
export const PERMISSION_LABELS: Record<Permission, string> = {
  // Sales
  'sales.create': 'إنشاء مبيعات',
  'sales.view': 'عرض المبيعات',
  'sales.edit': 'تعديل المبيعات',
  'sales.delete': 'حذف المبيعات',
  'sales.approve': 'اعتماد المبيعات',
  
  // Inventory
  'inventory.create': 'إضافة مخزون',
  'inventory.view': 'عرض المخزون',
  'inventory.edit': 'تعديل المخزون',
  'inventory.delete': 'حذف المخزون',
  'inventory.transfer': 'نقل المخزون',
  
  // Agents
  'agents.create': 'إضافة وكلاء',
  'agents.view': 'عرض الوكلاء',
  'agents.edit': 'تعديل الوكلاء',
  'agents.delete': 'حذف الوكلاء',
  'agents.manage_balance': 'إدارة أرصدة الوكلاء',
  
  // Warehouses
  'warehouses.create': 'إنشاء مخازن',
  'warehouses.view': 'عرض المخازن',
  'warehouses.edit': 'تعديل المخازن',
  'warehouses.delete': 'حذف المخازن',
  'warehouses.manage': 'إدارة المخازن',
  
  // Users
  'users.create': 'إضافة مستخدمين',
  'users.view': 'عرض المستخدمين',
  'users.edit': 'تعديل المستخدمين',
  'users.delete': 'حذف المستخدمين',
  'users.manage_roles': 'إدارة الأدوار',
  
  // Finance
  'finance.view_reports': 'عرض التقارير المالية',
  'finance.manage_transactions': 'إدارة المعاملات المالية',
  'finance.export_data': 'تصدير البيانات المالية',
  
  // System
  'system.settings': 'إعدادات النظام',
  'system.backup': 'النسخ الاحتياطي',
  'system.logs': 'سجلات النظام',
  'system.notifications': 'إدارة الإشعارات'
}

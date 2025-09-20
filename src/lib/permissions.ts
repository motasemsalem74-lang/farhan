// نظام الصلاحيات المبسط والعملي

export interface UserRole {
  id: string
  name: string
  displayName: string
  permissions: string[]
  description: string
}

// الأدوار الأساسية في النظام
export const ROLES: UserRole[] = [
  {
    id: 'super_admin',
    name: 'super_admin',
    displayName: 'مدير أعلى',
    description: 'صلاحيات كاملة على النظام',
    permissions: [
      'all' // صلاحية خاصة تعني كل شيء
    ]
  },
  {
    id: 'admin',
    name: 'admin', 
    displayName: 'مدير',
    description: 'إدارة النظام والمستخدمين',
    permissions: [
      'dashboard.view',
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'agents.view',
      'agents.create',
      'agents.edit',
      'inventory.view',
      'inventory.create',
      'inventory.edit',
      'inventory.delete',
      'sales.view',
      'sales.create',
      'documents.view',
      'documents.edit',
      'reports.view',
      'settings.view',
      'settings.edit'
    ]
  },
  {
    id: 'manager',
    name: 'manager',
    displayName: 'مدير عام',
    description: 'إدارة العمليات والتقارير',
    permissions: [
      'dashboard.view',
      'agents.view',
      'agents.create',
      'agents.edit',
      'inventory.view',
      'inventory.create',
      'inventory.edit',
      'sales.view',
      'sales.create',
      'documents.view',
      'documents.edit',
      'reports.view'
    ]
  },
  {
    id: 'agent',
    name: 'agent',
    displayName: 'وكيل',
    description: 'بيع المنتجات من المخزن المخصص',
    permissions: [
      'dashboard.view_own',
      'inventory.view_own',
      'sales.create_own',
      'sales.view_own',
      'documents.view_own',
      'agents.view_own'
    ]
  },
  {
    id: 'employee',
    name: 'employee',
    displayName: 'موظف',
    description: 'عمليات أساسية محدودة',
    permissions: [
      'dashboard.view',
      'inventory.view',
      'sales.view',
      'documents.view'
    ]
  }
]

// الصلاحيات المتاحة في النظام
export const PERMISSIONS = {
  // لوحة التحكم
  'dashboard.view': 'عرض لوحة التحكم',
  'dashboard.view_own': 'عرض لوحة التحكم الخاصة',
  
  // المستخدمين
  'users.view': 'عرض المستخدمين',
  'users.create': 'إضافة مستخدمين',
  'users.edit': 'تعديل المستخدمين',
  'users.delete': 'حذف المستخدمين',
  
  // الوكلاء
  'agents.view': 'عرض جميع الوكلاء',
  'agents.view_own': 'عرض بيانات الوكيل الخاصة',
  'agents.create': 'إضافة وكلاء',
  'agents.edit': 'تعديل الوكلاء',
  'agents.delete': 'حذف الوكلاء',
  
  // المخزون
  'inventory.view': 'عرض جميع المخزون',
  'inventory.view_own': 'عرض مخزون الوكيل فقط',
  'inventory.create': 'إضافة منتجات',
  'inventory.edit': 'تعديل المنتجات',
  'inventory.delete': 'حذف المنتجات',
  
  // المبيعات
  'sales.view': 'عرض جميع المبيعات',
  'sales.view_own': 'عرض مبيعات الوكيل فقط',
  'sales.create': 'إنشاء مبيعات',
  'sales.create_own': 'بيع من مخزون الوكيل فقط',
  
  // الوثائق
  'documents.view': 'عرض جميع الوثائق',
  'documents.view_own': 'عرض وثائق الوكيل فقط',
  'documents.edit': 'تعديل الوثائق',
  
  // التقارير
  'reports.view': 'عرض التقارير',
  
  // الإعدادات
  'settings.view': 'عرض الإعدادات',
  'settings.edit': 'تعديل الإعدادات'
}

// دالة للتحقق من الصلاحيات
export function hasPermission(userRole: string, permission: string): boolean {
  const role = ROLES.find(r => r.name === userRole)
  if (!role) return false
  
  // المدير الأعلى له صلاحية كاملة
  if (role.permissions.includes('all')) return true
  
  // التحقق من الصلاحية المحددة
  return role.permissions.includes(permission)
}

// دالة للحصول على صلاحيات الدور
export function getRolePermissions(roleName: string): string[] {
  const role = ROLES.find(r => r.name === roleName)
  return role?.permissions || []
}

// دالة للحصول على معلومات الدور
export function getRoleInfo(roleName: string): UserRole | null {
  return ROLES.find(r => r.name === roleName) || null
}

// دالة للتحقق من أن المستخدم وكيل
export function isAgent(userRole: string): boolean {
  return userRole === 'agent'
}

// دالة للتحقق من أن المستخدم مدير أو أعلى
export function isAdminOrHigher(userRole: string): boolean {
  return ['super_admin', 'admin', 'manager'].includes(userRole)
}

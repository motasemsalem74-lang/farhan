// نظام الصلاحيات الجديد

export interface UserRole {
  id: string
  name: string
  displayName: string
  permissions: string[]
  description: string
}

// الأدوار المتاحة للإضافة - بدون دور الوكيل
export const USER_ROLES: UserRole[] = [
  {
    id: 'super_admin',
    name: 'super_admin',
    displayName: 'مدير أعلى',
    description: 'صلاحيات كاملة على النظام - يرى كل شيء',
    permissions: ['all']
  },
  {
    id: 'admin_manager',
    name: 'admin_manager',
    displayName: 'مدير إداري',
    description: 'كل الصلاحيات عدا التقارير وإعدادات النظام وإدارة المستخدمين',
    permissions: [
      'agents.view', 'agents.create', 'agents.edit',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.transfer',
      'sales.view', 'sales.create', 'sales.edit', 'sales.view_profits',
      'documents.view', 'documents.edit'
    ]
  },
  {
    id: 'sales_employee',
    name: 'sales_employee',
    displayName: 'موظف بيع',
    description: 'يقدر يعمل فواتير من مخازن الشركة فقط - لا يرى الأرباح أو أسعار الشراء',
    permissions: [
      'sales.create_company_only',
      'inventory.view_company_only'
    ]
  }
]

// دالة للتحقق من الصلاحيات
export function hasPermission(userRole: string, permission: string): boolean {
  const role = USER_ROLES.find(r => r.name === userRole)
  if (!role) return false
  
  // المدير الأعلى له صلاحية كاملة
  if (role.permissions.includes('all')) return true
  
  // التحقق من الصلاحية المحددة
  return role.permissions.includes(permission)
}

// دالة للحصول على معلومات الدور
export function getRoleInfo(roleName: string): UserRole | null {
  return USER_ROLES.find(r => r.name === roleName) || null
}

// دالة للتحقق من إمكانية رؤية الأرباح
export function canViewProfits(userRole: string): boolean {
  return hasPermission(userRole, 'sales.view_profits') || userRole === 'super_admin'
}

// دالة للتحقق من إمكانية البيع من مخازن الشركة فقط
export function canOnlySellFromCompany(userRole: string): boolean {
  return userRole === 'sales_employee'
}

// دالة للتحقق من أن المستخدم مدير أو أعلى
export function isAdminOrHigher(userRole: string): boolean {
  return ['super_admin', 'admin', 'admin_manager'].includes(userRole)
}

// دالة للتحقق من الوصول للتقارير
export function canAccessReports(userRole: string): boolean {
  return userRole === 'super_admin'
}

// دالة للتحقق من الوصول لإعدادات النظام
export function canAccessSettings(userRole: string): boolean {
  return userRole === 'super_admin'
}

// دالة للتحقق من الوصول لإدارة المستخدمين
export function canManageUsers(userRole: string): boolean {
  return userRole === 'super_admin'
}

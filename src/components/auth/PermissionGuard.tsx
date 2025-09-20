import React from 'react'
import { Shield, AlertTriangle, Lock } from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

interface PermissionGuardProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  role?: string
  roles?: string[]
  requireAll?: boolean // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: React.ReactNode
  showFallback?: boolean
  redirectTo?: string
  agentOnly?: boolean // للوكلاء فقط
  adminOnly?: boolean // للمدراء فقط
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions = [],
  role,
  roles = [],
  requireAll = false,
  fallback,
  showFallback = true,
  redirectTo,
  agentOnly = false,
  adminOnly = false
}) => {
  const { userData, hasPermission, hasRole, isAgent, isAdminOrHigher } = useAuth()
  const [hasAccess, setHasAccess] = React.useState<boolean | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const checkAccess = () => {
      if (!userData) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      // التحقق من أن المستخدم نشط
      if (!userData.isActive) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      let allowed = false

      // التحقق من الأدوار الخاصة
      if (agentOnly) {
        allowed = isAgent()
      } else if (adminOnly) {
        allowed = isAdminOrHigher()
      }
      // التحقق من دور محدد
      else if (role) {
        allowed = hasRole(role)
      }
      // التحقق من عدة أدوار
      else if (roles.length > 0) {
        if (requireAll) {
          allowed = roles.every(r => hasRole(r))
        } else {
          allowed = roles.some(r => hasRole(r))
        }
      }
      // التحقق من صلاحية محددة
      else if (permission) {
        allowed = hasPermission(permission)
      }
      // التحقق من عدة صلاحيات
      else if (permissions.length > 0) {
        if (requireAll) {
          allowed = permissions.every(p => hasPermission(p))
        } else {
          allowed = permissions.some(p => hasPermission(p))
        }
      }
      // لا توجد قيود، السماح بالوصول
      else {
        allowed = true
      }

      setHasAccess(allowed)
      setLoading(false)
    }

    checkAccess()
  }, [userData, permission, permissions, role, roles, requireAll, agentOnly, adminOnly, hasPermission, hasRole, isAgent, isAdminOrHigher])

  React.useEffect(() => {
    if (hasAccess === false && redirectTo) {
      window.location.href = redirectTo
    }
  }, [hasAccess, redirectTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (hasAccess === false) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showFallback) {
      return null
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                غير مصرح بالوصول
              </h2>
              <p className="text-gray-600 text-sm">
                ليس لديك الصلاحيات المطلوبة للوصول إلى هذه الصفحة
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">الصلاحيات المطلوبة:</span>
                </div>
                <div className="mt-2 text-xs text-yellow-700">
                  {permission && (
                    <div className="bg-yellow-100 rounded px-2 py-1 inline-block">
                      {permission}
                    </div>
                  )}
                  {permissions.length > 0 && (
                    <div className="space-y-1">
                      {requireAll && (
                        <div className="text-xs text-yellow-600 mb-1">
                          مطلوب جميع الصلاحيات التالية:
                        </div>
                      )}
                      {!requireAll && permissions.length > 1 && (
                        <div className="text-xs text-yellow-600 mb-1">
                          مطلوب إحدى الصلاحيات التالية:
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {permissions.map((perm, index) => (
                          <div
                            key={index}
                            className="bg-yellow-100 rounded px-2 py-1 text-xs"
                          >
                            {perm}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.history.back()}
                >
                  العودة
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  الصفحة الرئيسية
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component for protecting routes
export const withPermission = (
  permission: string,
  fallback?: React.ReactNode
) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    const ProtectedComponent: React.FC<P> = (props) => {
      return (
        <PermissionGuard permission={permission} fallback={fallback}>
          <Component {...props} />
        </PermissionGuard>
      )
    }

    ProtectedComponent.displayName = `withPermission(${Component.displayName || Component.name})`
    return ProtectedComponent
  }
}

// Higher-order component for protecting routes with role
export const withRole = (
  role: string,
  fallback?: React.ReactNode
) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    const ProtectedComponent: React.FC<P> = (props) => {
      return (
        <PermissionGuard role={role} fallback={fallback}>
          <Component {...props} />
        </PermissionGuard>
      )
    }

    ProtectedComponent.displayName = `withRole(${Component.displayName || Component.name})`
    return ProtectedComponent
  }
}

// Higher-order component for agent-only routes
export const withAgentOnly = (
  fallback?: React.ReactNode
) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    const ProtectedComponent: React.FC<P> = (props) => {
      return (
        <PermissionGuard agentOnly fallback={fallback}>
          <Component {...props} />
        </PermissionGuard>
      )
    }

    ProtectedComponent.displayName = `withAgentOnly(${Component.displayName || Component.name})`
    return ProtectedComponent
  }
}

// Higher-order component for admin-only routes
export const withAdminOnly = (
  fallback?: React.ReactNode
) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    const ProtectedComponent: React.FC<P> = (props) => {
      return (
        <PermissionGuard adminOnly fallback={fallback}>
          <Component {...props} />
        </PermissionGuard>
      )
    }

    ProtectedComponent.displayName = `withAdminOnly(${Component.displayName || Component.name})`
    return ProtectedComponent
  }
}

// Component for conditionally rendering based on permissions
interface ConditionalRenderProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  role?: string
  roles?: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
  agentOnly?: boolean
  adminOnly?: boolean
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  permission,
  permissions = [],
  role,
  roles = [],
  requireAll = false,
  fallback = null,
  agentOnly = false,
  adminOnly = false
}) => {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      role={role}
      roles={roles}
      requireAll={requireAll}
      fallback={fallback}
      showFallback={false}
      agentOnly={agentOnly}
      adminOnly={adminOnly}
    >
      {children}
    </PermissionGuard>
  )
}

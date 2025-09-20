import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Lock, UserX } from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { AgentPermissionsService } from '../../lib/agentPermissions'

interface AgentGuardProps {
  children: React.ReactNode
  resourceType?: 'inventory' | 'sales' | 'transactions' | 'documents'
  resourceId?: string
  fallback?: React.ReactNode
  showFallback?: boolean
  requireAgentOnly?: boolean // يتطلب أن يكون المستخدم وكيل
}

interface AgentData {
  id: string
  name: string
  warehouseId: string
  userId?: string
  isActive: boolean
  commissionRate: number
  totalSales: number
  totalCommission: number
}

export const AgentGuard: React.FC<AgentGuardProps> = ({
  children,
  resourceType,
  resourceId,
  fallback,
  showFallback = true,
  requireAgentOnly = false
}) => {
  const { userData, isAgent, isAdminOrHigher } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [agentData, setAgentData] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (!userData) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      try {
        // إذا كان مطلوب وكيل فقط
        if (requireAgentOnly) {
          if (!isAgent()) {
            setHasAccess(false)
            setLoading(false)
            return
          }
        }

        // المديرين لهم صلاحية كاملة (إلا إذا كان مطلوب وكيل فقط)
        if (!requireAgentOnly && isAdminOrHigher()) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        // التحقق من أن المستخدم وكيل
        const agent = await AgentPermissionsService.getAgentData(userData.id)
        
        if (!agent) {
          setHasAccess(false)
          setAgentData(null)
          setLoading(false)
          return
        }

        setAgentData(agent)

        // التحقق من الصلاحية للمورد المحدد
        if (resourceType) {
          const canAccess = await AgentPermissionsService.canAgentAccess(
            userData.id,
            resourceType,
            resourceId
          )
          setHasAccess(canAccess)
        } else {
          // لا يوجد مورد محدد، السماح بالوصول للوكيل النشط
          setHasAccess(agent.isActive)
        }

      } catch (error) {
        console.error('Error checking agent access:', error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [userData, resourceType, resourceId, requireAgentOnly, isAgent, isAdminOrHigher])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">جاري التحقق من الصلاحيات...</span>
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

    // تحديد نوع الخطأ
    let errorTitle = 'غير مصرح بالوصول'
    let errorMessage = 'ليس لديك الصلاحيات المطلوبة للوصول إلى هذا المحتوى'
    let errorIcon = <Lock className="h-8 w-8 text-red-600" />

    if (!userData) {
      errorTitle = 'يجب تسجيل الدخول'
      errorMessage = 'يرجى تسجيل الدخول للوصول إلى هذا المحتوى'
      errorIcon = <UserX className="h-8 w-8 text-red-600" />
    } else if (requireAgentOnly && !isAgent()) {
      errorTitle = 'للوكلاء فقط'
      errorMessage = 'هذا المحتوى متاح للوكلاء فقط'
      errorIcon = <Shield className="h-8 w-8 text-red-600" />
    } else if (!agentData) {
      errorTitle = 'حساب وكيل غير موجود'
      errorMessage = 'لم يتم العثور على حساب وكيل مرتبط بهذا المستخدم'
      errorIcon = <UserX className="h-8 w-8 text-red-600" />
    } else if (!agentData.isActive) {
      errorTitle = 'حساب الوكيل غير نشط'
      errorMessage = 'حساب الوكيل الخاص بك غير نشط. يرجى التواصل مع الإدارة'
      errorIcon = <AlertTriangle className="h-8 w-8 text-yellow-600" />
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                {errorIcon}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {errorTitle}
              </h2>
              <p className="text-gray-600 text-sm">
                {errorMessage}
              </p>
            </div>

            {resourceType && (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">المورد المطلوب:</span>
                  </div>
                  <div className="mt-2 text-xs text-yellow-700">
                    <div className="bg-yellow-100 rounded px-2 py-1 inline-block">
                      {resourceType === 'inventory' && 'المخزون'}
                      {resourceType === 'sales' && 'المبيعات'}
                      {resourceType === 'transactions' && 'المعاملات المالية'}
                      {resourceType === 'documents' && 'الوثائق'}
                    </div>
                    {resourceId && (
                      <div className="mt-1">
                        <span className="text-xs">معرف المورد: </span>
                        <code className="bg-yellow-100 rounded px-1 text-xs">
                          {resourceId}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {agentData && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <p><span className="font-medium">اسم الوكيل:</span> {agentData.name}</p>
                  <p><span className="font-medium">معرف المخزن:</span> {agentData.warehouseId}</p>
                  <p><span className="font-medium">الحالة:</span> {agentData.isActive ? 'نشط' : 'غير نشط'}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center mt-6">
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component للحماية بصلاحيات الوكيل
export const withAgentGuard = (
  resourceType?: 'inventory' | 'sales' | 'transactions' | 'documents',
  resourceId?: string,
  requireAgentOnly?: boolean
) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    const ProtectedComponent: React.FC<P> = (props) => {
      return (
        <AgentGuard 
          resourceType={resourceType} 
          resourceId={resourceId}
          requireAgentOnly={requireAgentOnly}
        >
          <Component {...props} />
        </AgentGuard>
      )
    }

    ProtectedComponent.displayName = `withAgentGuard(${Component.displayName || Component.name})`
    return ProtectedComponent
  }
}

// مكون للعرض الشرطي بناءً على صلاحيات الوكيل
interface AgentConditionalRenderProps {
  children: React.ReactNode
  resourceType?: 'inventory' | 'sales' | 'transactions' | 'documents'
  resourceId?: string
  requireAgentOnly?: boolean
  fallback?: React.ReactNode
}

export const AgentConditionalRender: React.FC<AgentConditionalRenderProps> = ({
  children,
  resourceType,
  resourceId,
  requireAgentOnly = false,
  fallback = null
}) => {
  return (
    <AgentGuard
      resourceType={resourceType}
      resourceId={resourceId}
      requireAgentOnly={requireAgentOnly}
      fallback={fallback}
      showFallback={false}
    >
      {children}
    </AgentGuard>
  )
}

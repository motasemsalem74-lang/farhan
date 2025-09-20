import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { auth } from '../firebase/firebase-config.template'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase-config.template'

interface UserData {
  id: string
  email: string
  name: string
  role: string
  agentId?: string // معرف الوكيل إذا كان المستخدم وكيل
  warehouseId?: string // معرف المخزن المخصص للوكيل
  isActive: boolean
  department?: string
  phone?: string
  permissions?: string[]
  createdAt?: any
  lastLoginAt?: any
  updatedAt?: any
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user)
      if (user) {
        try {
          // جلب بيانات المستخدم من Firestore
          const userDocRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const data = userDoc.data()
            
            // تحديث آخر تسجيل دخول
            await updateDoc(userDocRef, {
              lastLoginAt: serverTimestamp()
            })
            
            setUserData({
              id: user.uid,
              email: user.email || '',
              name: data.name || user.displayName || 'مستخدم',
              role: data.role || 'employee',
              agentId: data.agentId,
              warehouseId: data.warehouseId,
              isActive: data.isActive !== false, // افتراضي true
              department: data.department,
              phone: data.phone,
              permissions: data.permissions || [],
              createdAt: data.createdAt,
              lastLoginAt: data.lastLoginAt,
              updatedAt: data.updatedAt
            })
          } else {
            // إنشاء مستخدم جديد بصلاحيات افتراضية
            const defaultUserData = {
              id: user.uid,
              email: user.email || '',
              name: user.displayName || 'مستخدم جديد',
              role: 'employee',
              isActive: true,
              permissions: [],
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp()
            }
            
            await updateDoc(userDocRef, defaultUserData)
            setUserData(defaultUserData)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          // fallback للبيانات الأساسية
          setUserData({
            id: user.uid,
            email: user.email || '',
            name: user.displayName || 'مستخدم',
            role: 'employee',
            isActive: true
          })
        }
      } else {
        setUserData(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // دالة للتحقق من الصلاحيات
  const hasPermission = (permission: string): boolean => {
    if (!userData) return false
    
    // المدير الأعلى له صلاحية كاملة
    if (userData.role === 'super_admin') return true
    
    // التحقق من الصلاحيات المخصصة
    return userData.permissions?.includes(permission) || false
  }

  // دالة للتحقق من الدور
  const hasRole = (role: string): boolean => {
    return userData?.role === role
  }

  // دالة للتحقق من أن المستخدم وكيل
  const isAgent = (): boolean => {
    return userData?.role === 'agent'
  }

  // دالة للتحقق من أن المستخدم مدير أو أعلى
  const isAdminOrHigher = (): boolean => {
    return ['super_admin', 'admin', 'manager'].includes(userData?.role || '')
  }

  return {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    hasPermission,
    hasRole,
    isAgent,
    isAdminOrHigher
  }
}

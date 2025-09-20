import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/firebase-config.template'
import { User } from '../types'

interface UseUserDataReturn {
  userData: User | null
  loadingUserData: boolean
  error: string | null
  refreshUserData: () => Promise<void>
}

export function useUserData(userId?: string): UseUserDataReturn {
  const [userData, setUserData] = useState<User | null>(null)
  const [loadingUserData, setLoadingUserData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserData = async (uid: string, retryCount = 0) => {
    setLoadingUserData(true)
    setError(null)
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      
      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData({
          id: userDoc.id,
          ...data
        } as User)
      } else {
        setError('بيانات المستخدم غير موجودة')
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err)
      
      // إعادة المحاولة في حالة الأخطاء الداخلية
      if (retryCount < 3 && (err.code === 'internal' || err.message?.includes('internal error'))) {
        console.log(`إعادة محاولة تحميل بيانات المستخدم (${retryCount + 1}/3)`)
        setTimeout(() => {
          fetchUserData(uid, retryCount + 1)
        }, 1000 * (retryCount + 1)) // تأخير متزايد
        return
      }
      
      setError('فشل في تحميل بيانات المستخدم')
    } finally {
      if (retryCount === 0) { // فقط في المحاولة الأولى
        setLoadingUserData(false)
      }
    }
  }

  const refreshUserData = async () => {
    if (userId) {
      await fetchUserData(userId)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchUserData(userId)
    } else {
      setUserData(null)
      setLoadingUserData(false)
    }
  }, [userId])

  return {
    userData,
    loadingUserData,
    error,
    refreshUserData
  }
}
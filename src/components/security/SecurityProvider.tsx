import { createContext, useContext, useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { toast } from 'sonner'

import { auth, db } from '@/firebase/firebase-config.template'
import { useUserData } from '@/hooks/useUserData'

interface SecurityContextType {
  sessionTimeout: number
  lastActivity: Date
  isSessionValid: boolean
  extendSession: () => void
  logSecurityEvent: (event: SecurityEvent) => void
}

interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'session_timeout' | 'suspicious_activity'
  details?: string
  ipAddress?: string
  userAgent?: string
}

const SecurityContext = createContext<SecurityContextType | null>(null)

export function useSecurityContext() {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider')
  }
  return context
}

interface SecurityProviderProps {
  children: React.ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [lastActivity, setLastActivity] = useState(new Date())
  const [sessionTimeout] = useState(30 * 60 * 1000) // 30 minutes
  const [isSessionValid, setIsSessionValid] = useState(true)

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const updateActivity = () => {
      setLastActivity(new Date())
      setIsSessionValid(true)
    }

    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })
    }
  }, [])

  // Check session validity
  useEffect(() => {
    const checkSession = setInterval(() => {
      const now = new Date()
      const timeSinceActivity = now.getTime() - lastActivity.getTime()
      
      if (timeSinceActivity > sessionTimeout) {
        setIsSessionValid(false)
        logSecurityEvent({
          type: 'session_timeout',
          details: `Session expired after ${sessionTimeout / 1000 / 60} minutes of inactivity`
        })
        
        toast.warning('انتهت صلاحية الجلسة بسبب عدم النشاط', {
          action: {
            label: 'تسجيل دخول مجدد',
            onClick: () => window.location.reload()
          }
        })
      }
    }, 60000) // Check every minute

    return () => clearInterval(checkSession)
  }, [lastActivity, sessionTimeout])

  // Monitor failed login attempts
  useEffect(() => {
    if (!user?.uid) return

    const userRef = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(userRef, (doc) => {
      const data = doc.data()
      if (data?.failedLoginAttempts && data.failedLoginAttempts >= 5) {
        logSecurityEvent({
          type: 'suspicious_activity',
          details: `Multiple failed login attempts detected: ${data.failedLoginAttempts}`
        })
      }
    })

    return () => unsubscribe()
  }, [user?.uid])

  const extendSession = () => {
    setLastActivity(new Date())
    setIsSessionValid(true)
  }

  const logSecurityEvent = async (event: SecurityEvent) => {
    if (!user?.uid) return

    try {
      const securityLog = {
        ...event,
        userId: user.uid,
        timestamp: serverTimestamp(),
        ipAddress: await getClientIP(),
        userAgent: navigator.userAgent,
        sessionId: getSessionId()
      }

      // Log to security collection - DISABLED
      // await setDoc(doc(db, 'security_logs', `${user.uid}_${Date.now()}`), securityLog)
      
      console.log('Security event logged (local only):', event.type)
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return 'unknown'
    }
  }

  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('sessionId', sessionId)
    }
    return sessionId
  }

  // Log login event
  useEffect(() => {
    if (user && userData) {
      logSecurityEvent({
        type: 'login',
        details: `User ${userData.displayName} logged in successfully`
      })
    }
  }, [user, userData])

  const contextValue: SecurityContextType = {
    sessionTimeout,
    lastActivity,
    isSessionValid,
    extendSession,
    logSecurityEvent
  }

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  )
}

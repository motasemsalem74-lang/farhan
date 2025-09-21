import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { auth } from './firebase/firebase-config.template'

// Components
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { SplashScreen } from './components/layout/SplashScreen'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { SecurityProvider } from './components/security/SecurityProvider'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardLayout } from './components/layout/DashboardLayout'

// Pages
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { SalesPage } from './pages/sales/SalesPage'
import { CompanySalesPage } from './pages/sales/CompanySalesPage'
import { AgentsPage } from './pages/agents/AgentsPage'
import { AgentMainPage } from './pages/agents/AgentMainPage'
import { DocumentTrackingPage } from './pages/documents/DocumentTrackingPage'
import { CustomerInquiryPage } from './components/customer-inquiry/CustomerInquiryPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import AdvancedReportsPage from './pages/reports/AdvancedReportsPage'
import { SimpleSettingsPage } from './pages/settings/SimpleSettingsPage'
import { UserManagementPage } from './pages/admin/UserManagementPage'

// Hooks
import { useUserData } from './hooks/useUserData'
import { initializeWarehouses } from './utils/initializeWarehouses'
import { useNotifications } from './hooks/useNotifications'
import { pushNotificationManager } from './lib/pushNotifications'

// PWA Support
import { offlineStorage } from './lib/offlineStorage'
import { pwaManager } from './lib/pwaManager'

function App() {
  const [user, loading, error] = useAuthState(auth)
  const { userData, loadingUserData } = useUserData(user?.uid)
  
  // Initialize notifications system
  const { notifications, unreadCount } = useNotifications()
  
  // Debug notifications
  useEffect(() => {
    console.log('🚀 NOTIFICATION SYSTEM LOADED - Version 2.0')
    if (notifications.length > 0) {
      console.log('🔔 Notifications received:', notifications.length, 'unread:', unreadCount)
      console.log('📋 Latest notifications:', notifications.slice(0, 3))
    }
  }, [notifications, unreadCount])
  
  const [showSplash, setShowSplash] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [canInstall, setCanInstall] = useState(false)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // Show splash screen for 2 seconds
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Initialize PWA and warehouses when user is authenticated
  useEffect(() => {
    if (userData) {
      // Initialize warehouses
      initializeWarehouses()
      
      // Initialize Push Notifications
      pushNotificationManager.initialize().then(() => {
        console.log('📱 Push notifications initialized')
        // Store current user ID for FCM token
        localStorage.setItem('currentUserId', userData.id)
      }).catch(error => {
        console.error('❌ Push notifications failed to initialize:', error)
      })
      
      // Initialize PWA features
      try {
        // Cache essential data for offline use
        offlineStorage.cacheUserData(userData)
        
        // Cache essential application data
        offlineStorage.cacheEssentialData()
        
        // Validate cached data
        offlineStorage.validateCachedData()
        
        console.log('✅ PWA: Initialized for user', userData.email || userData.id)
        // تم تعطيل رسالة تحميل البيانات
        // toast.success('تم تحميل البيانات للاستخدام دون اتصال')
      } catch (error) {
        console.error('❌ PWA: Initialization failed', error)
        // تم تعطيل رسالة فشل تحميل البيانات
        // toast.error('فشل في تحميل البيانات للاستخدام دون اتصال')
      }
    }
  }, [userData])

  // Initialize PWA Manager
  useEffect(() => {
    // Monitor PWA status
    const checkPWAStatus = () => {
      setIsOnline(pwaManager.isConnected)
      setCanInstall(pwaManager.canInstall)
      setHasUpdate(pwaManager.hasUpdate)
    }

    // Check status initially and periodically
    checkPWAStatus()
    const statusInterval = setInterval(checkPWAStatus, 5000)

    return () => clearInterval(statusInterval)
  }, [])

  // Handle PWA events
  useEffect(() => {
    const handlePWAInstallAvailable = () => {
      console.log('📱 PWA: Install prompt available')
      setCanInstall(true)
      setShowInstallBanner(true)
      toast.info('يمكنك الآن تثبيت التطبيق على جهازك', {
        action: {
          label: 'تثبيت',
          onClick: async () => {
            const installed = await pwaManager.installApp()
            if (installed) {
              setShowInstallBanner(false)
              setCanInstall(false)
            }
          }
        },
        duration: 10000
      })
    }

    const handlePWAInstalled = () => {
      console.log('✅ PWA: App installed successfully')
      setCanInstall(false)
      setShowInstallBanner(false)
      toast.success('تم تثبيت التطبيق بنجاح!')
    }

    const handlePWAUpdateAvailable = () => {
      console.log('🔄 PWA: Update available')
      setHasUpdate(true)
      toast.info('يتوفر تحديث جديد للتطبيق', {
        action: {
          label: 'تحديث',
          onClick: async () => {
            await pwaManager.applyUpdate()
            setHasUpdate(false)
          }
        },
        duration: 15000
      })
    }

    const handleNetworkStatusChanged = (event: CustomEvent) => {
      const { online } = event.detail
      console.log(`🌐 Network: ${online ? 'Online' : 'Offline'}`)
      setIsOnline(online)
      
      if (online) {
        toast.success('تم استعادة الاتصال بالإنترنت')
        if (userData) {
          // Process sync queue when back online
          offlineStorage.processSyncQueue()
        }
      } else {
        toast.warning('انقطع الاتصال بالإنترنت - يمكنك المتابعة دون اتصال')
      }
    }

    // Listen for PWA events
    window.addEventListener('pwa-install-available', handlePWAInstallAvailable)
    window.addEventListener('pwa-installed', handlePWAInstalled)
    window.addEventListener('pwa-update-available', handlePWAUpdateAvailable)
    window.addEventListener('network-status-changed', handleNetworkStatusChanged as EventListener)

    return () => {
      window.removeEventListener('pwa-install-available', handlePWAInstallAvailable)
      window.removeEventListener('pwa-installed', handlePWAInstalled)
      window.removeEventListener('pwa-update-available', handlePWAUpdateAvailable)
      window.removeEventListener('network-status-changed', handleNetworkStatusChanged as EventListener)
    }
  }, [userData])

  // Show splash screen on app load
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  // Loading state
  if (loading || (user && loadingUserData)) {
    return (
      <div className="min-h-screen flex items-center justify-center al-farhan-gradient">
        <div className="text-center text-white">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center text-red-800 p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">حدث خطأ في الاتصال</h2>
          <p className="mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user || !userData) {
    return <LoginPage />
  }

  // Inactive user
  if (!userData.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <div className="text-center text-yellow-800 p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">حسابك غير مفعل</h2>
          <p className="mb-4">يرجى التواصل مع المدير لتفعيل حسابك</p>
          <button 
            onClick={() => auth.signOut()} 
            className="btn btn-secondary"
          >
            تسجيل خروج
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <SecurityProvider>
        {/* PWA Install Banner */}
        {showInstallBanner && canInstall && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 shadow-lg">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <span className="text-lg">📱</span>
                <div>
                  <p className="font-medium arabic-text">تثبيت التطبيق</p>
                  <p className="text-sm opacity-90 arabic-text">احصل على تجربة أفضل مع التطبيق المثبت</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <button
                  onClick={async () => {
                    const installed = await pwaManager.installApp()
                    if (installed) {
                      setShowInstallBanner(false)
                      setCanInstall(false)
                    }
                  }}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  تثبيت
                </button>
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Network Status Indicator */}
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 z-40 bg-orange-500 text-white p-2 text-center text-sm">
            <span className="arabic-text">🔌 وضع عدم الاتصال - بعض الميزات قد تكون محدودة</span>
          </div>
        )}

        <DashboardLayout 
          user={userData} 
          isOnline={isOnline}
          canInstall={canInstall}
          hasUpdate={hasUpdate}
        >
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<DashboardPage />} />
            
            {/* Inventory Management */}
            <Route path="/inventory/*" element={<InventoryPage />} />
            
            {/* Sales Management */}
            <Route path="/sales/*" element={<SalesPage />} />
            
            {/* Company Sales (Sales Employee only) */}
            <Route path="/sales/create" element={<CompanySalesPage />} />
            
            {/* Agent Management */}
            <Route path="/agents/*" element={<AgentsPage />} />
            
            {/* Agent Online Dashboard */}
            <Route path="/agent/*" element={<AgentMainPage />} />
            
            {/* Document Tracking */}
            <Route path="/documents/*" element={<DocumentTrackingPage />} />
            
            {/* Customer Inquiry */}
            <Route path="/customers/*" element={<CustomerInquiryPage />} />
            
            {/* Reports */}
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/advanced" element={<AdvancedReportsPage />} />
            
            {/* Settings */}
            <Route path="/settings/*" element={<SimpleSettingsPage />} />
            
            {/* User Management (Super Admin only) */}
            {userData.role === 'super_admin' && (
              <Route path="/admin/*" element={<UserManagementPage />} />
            )}
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DashboardLayout>
      </SecurityProvider>
    </ErrorBoundary>
  )
}

export default App
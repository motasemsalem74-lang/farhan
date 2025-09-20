import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Search, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  ChevronDown,
  Shield,
  Download,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { toast } from 'sonner'

import { User as UserType } from '@/types'
import { auth } from '@/firebase/firebase-config.template'
import { NotificationBell } from '@/components/notifications/NotificationCenter'
import { cn } from '@/lib/utils'
import { pwaManager } from '@/lib/pwaManager'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: UserType
  isOnline?: boolean
  canInstall?: boolean
  hasUpdate?: boolean
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navigation: NavigationItem[] = [
  {
    name: 'الرئيسية',
    href: '/',
    icon: Home,
    roles: ['super_admin', 'admin', 'showroom_user'] // إزالة الوكيل من شاشة الرئيسية
  },
  {
    name: 'إدارة المخزون',
    href: '/inventory',
    icon: Package,
    roles: ['super_admin', 'admin', 'showroom_user'] // الوكيل لا يدير المخزون العام
  },
  {
    name: 'المبيعات',
    href: '/sales',
    icon: ShoppingCart,
    roles: ['super_admin', 'admin', 'showroom_user'] // الوكيل له شاشة بيع خاصة
  },
  {
    name: 'الوكلاء',
    href: '/agents',
    icon: Users,
    roles: ['super_admin', 'admin', 'agent'] // الوكيل يرى صفحته الخاصة فقط
  },
  {
    name: 'تتبع الوثائق',
    href: '/documents',
    icon: FileText,
    roles: ['super_admin', 'admin', 'agent', 'showroom_user'] // الوكيل يرى وثائقه فقط
  },
  {
    name: 'استعلام العملاء',
    href: '/customers',
    icon: Search,
    roles: ['super_admin', 'admin', 'agent', 'showroom_user'] // الوكيل يرى عملاءه فقط
  },
  {
    name: 'التقارير',
    href: '/reports',
    icon: BarChart3,
    roles: ['super_admin', 'admin'] // الوكيل لا يرى التقارير العامة
  },
  {
    name: 'إدارة المستخدمين',
    href: '/admin',
    icon: Shield,
    roles: ['super_admin']
  },
  {
    name: 'الإعدادات',
    href: '/settings',
    icon: Settings,
    roles: ['super_admin', 'admin', 'showroom_user'] // الوكيل لا يدير الإعدادات
  }
]

export function DashboardLayout({ 
  children, 
  user, 
  isOnline = true, 
  canInstall = false, 
  hasUpdate = false 
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()

  const handleInstallApp = async () => {
    try {
      const installed = await pwaManager.installApp()
      if (installed) {
        toast.success('تم تثبيت التطبيق بنجاح!')
      }
    } catch (error) {
      toast.error('فشل في تثبيت التطبيق')
    }
  }

  const handleUpdateApp = async () => {
    try {
      await pwaManager.applyUpdate()
      toast.success('تم تحديث التطبيق بنجاح!')
    } catch (error) {
      toast.error('فشل في تحديث التطبيق')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success('تم تسجيل الخروج بنجاح')
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الخروج')
    }
  }

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  ).map(item => {
    // إذا كان المستخدم وكيل، قم بتخصيص التنقل له
    if (user.role === 'agent') {
      switch (item.href) {
        case '/agents':
          return {
            ...item,
            href: '/agent/dashboard',
            name: 'لوحة التحكم'
          }
        case '/documents':
          return {
            ...item,
            href: '/agent/documents',
            name: 'تتبع الجوابات'
          }
        case '/customers':
          return {
            ...item,
            href: '/customers?agent=' + user.id,
            name: 'عملائي'
          }
        default:
          return item
      }
    }
    return item
  })

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      'super_admin': 'مدير أعلى',
      'admin': 'مدير إداري',
      'agent': 'وكيل',
      'showroom_user': 'مستخدم معرض'
    }
    return roleLabels[role as keyof typeof roleLabels] || role
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for mobile */}
      <div className={cn(
        'fixed inset-0 z-40 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-64 flex-col bg-white">
          <Sidebar 
            navigation={filteredNavigation} 
            currentPath={location.pathname}
            onClose={() => setSidebarOpen(false)}
            isMobile={true}
            isOnline={isOnline}
          />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar 
          navigation={filteredNavigation} 
          currentPath={location.pathname}
          isOnline={isOnline}
        />
      </div>

      {/* Main content */}
      <div className="lg:pr-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-al-farhan-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 justify-between px-4 sm:px-6">
            <div className="flex items-center">
              {/* Page title can be added here */}
            </div>
            
            <div className="mr-4 flex items-center md:mr-6 space-x-2 rtl:space-x-reverse">
              {/* PWA Controls */}
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {/* Network Status */}
                <div className="flex items-center" title={isOnline ? "متصل" : "غير متصل"}>
                  {isOnline ? (
                    <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-orange-500" />
                  )}
                </div>

                {/* Install Button */}
                {canInstall && (
                  <button
                    onClick={handleInstallApp}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="تثبيت التطبيق"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}

                {/* Update Button */}
                {hasUpdate && (
                  <button
                    onClick={handleUpdateApp}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors animate-pulse"
                    title="تحديث متوفر"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Notifications */}
              <NotificationBell />

              {/* User menu */}
              <div className="relative mr-3">
                <button
                  type="button"
                  className="flex max-w-xs items-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-al-farhan-500 focus:ring-offset-2"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-al-farhan-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-al-farhan-600" />
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-medium text-gray-700 arabic-text">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-gray-500 arabic-text">
                        {getRoleLabel(user.role)}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute left-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-700 arabic-text">
                        {user.displayName}
                      </p>
                      <p className="text-sm text-gray-500 arabic-text">
                        {user.email}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        {isOnline ? (
                          <><Wifi className="h-3 w-3 ml-1" /> متصل</>
                        ) : (
                          <><WifiOff className="h-3 w-3 ml-1" /> غير متصل</>
                        )}
                      </div>
                    </div>
                    
                    {/* PWA Actions */}
                    {(canInstall || hasUpdate) && (
                      <div className="border-b border-gray-100">
                        {canInstall && (
                          <button
                            onClick={handleInstallApp}
                            className="flex w-full items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 arabic-text"
                          >
                            <Download className="ml-3 h-4 w-4" />
                            تثبيت التطبيق
                          </button>
                        )}
                        {hasUpdate && (
                          <button
                            onClick={handleUpdateApp}
                            className="flex w-full items-center px-4 py-2 text-sm text-green-600 hover:bg-green-50 arabic-text"
                          >
                            <RefreshCw className="ml-3 h-4 w-4" />
                            تحديث التطبيق
                          </button>
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 arabic-text"
                    >
                      <LogOut className="ml-3 h-4 w-4" />
                      تسجيل خروج
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

interface SidebarProps {
  navigation: NavigationItem[]
  currentPath: string
  onClose?: () => void
  isMobile?: boolean
  isOnline?: boolean
}

function Sidebar({ navigation, currentPath, onClose, isMobile, isOnline = true }: SidebarProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col border-l border-gray-200 bg-white">
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        {/* Logo */}
        <div className="flex flex-shrink-0 items-center px-4">
          {isMobile && (
            <button
              type="button"
              className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          )}
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-lg bg-al-farhan-600 flex items-center justify-center">
              <span className="text-white text-xl">🚗</span>
            </div>
            <div className="mr-3">
              <h1 className="text-lg font-bold text-gray-900 arabic-text">
                أبو فرحان
              </h1>
              <p className="text-xs text-gray-500 arabic-text">
                للنقل الخفيف
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = currentPath === item.href || 
                           (item.href !== '/' && currentPath.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md arabic-text',
                  isActive
                    ? 'bg-al-farhan-100 text-al-farhan-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'ml-3 flex-shrink-0 h-5 w-5',
                    isActive ? 'text-al-farhan-600' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Company info */}
      <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="text-xs font-medium text-gray-700 arabic-text">
              نظام محاسبي متكامل
            </p>
            <p className="text-xs text-gray-500 arabic-text">
              الإصدار 1.0.0 PWA
            </p>
          </div>
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            {isOnline ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-orange-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
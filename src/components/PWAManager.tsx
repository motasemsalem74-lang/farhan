/**
 * مكون إدارة PWA - واجهة المستخدم لإدارة التطبيق كـ PWA
 */

import React, { useState, useEffect } from 'react'
import { 
  Smartphone, 
  Download, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  HardDrive,
  Trash2,
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'sonner'
import { pwaManager } from '@/lib/pwaManager'
import { offlineStorage } from '@/lib/offlineStorage'

interface PWAManagerProps {
  className?: string
}

export const PWAManager: React.FC<PWAManagerProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [canInstall, setCanInstall] = useState(false)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [offlineStats, setOfflineStats] = useState(offlineStorage.getOfflineStats())
  const [isInstalling, setIsInstalling] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isCaching, setIsCaching] = useState(false)

  useEffect(() => {
    // مراقبة حالة الاتصال
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // تحديث الإحصائيات كل 30 ثانية
    const statsInterval = setInterval(() => {
      setOfflineStats(offlineStorage.getOfflineStats())
    }, 30000)
    
    // فحص إمكانية التثبيت والتحديث
    const checkPWAStatus = () => {
      setCanInstall(pwaManager.canInstall)
      setHasUpdate(pwaManager.hasUpdate)
    }
    
    checkPWAStatus()
    const statusInterval = setInterval(checkPWAStatus, 10000)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(statsInterval)
      clearInterval(statusInterval)
    }
  }, [])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await pwaManager.installApp()
      if (success) {
        setCanInstall(false)
        toast.success('تم تثبيت التطبيق بنجاح!')
      }
    } catch (error) {
      toast.error('فشل في تثبيت التطبيق')
    } finally {
      setIsInstalling(false)
    }
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await pwaManager.applyUpdate()
      setHasUpdate(false)
    } catch (error) {
      toast.error('فشل في تطبيق التحديث')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCacheData = async () => {
    setIsCaching(true)
    try {
      await offlineStorage.cacheEssentialData()
      setOfflineStats(offlineStorage.getOfflineStats())
      toast.success('تم حفظ البيانات للاستخدام أوف لاين')
    } catch (error) {
      toast.error('فشل في حفظ البيانات')
    } finally {
      setIsCaching(false)
    }
  }

  const handleClearCache = async () => {
    try {
      await pwaManager.clearCache()
      offlineStorage.clear()
      setOfflineStats(offlineStorage.getOfflineStats())
      toast.success('تم مسح جميع البيانات المحفوظة')
    } catch (error) {
      toast.error('فشل في مسح البيانات')
    }
  }

  const handleCheckUpdates = async () => {
    try {
      await pwaManager.checkForUpdates()
      toast.info('تم فحص التحديثات')
    } catch (error) {
      toast.error('فشل في فحص التحديثات')
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* حالة الاتصال */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                متصل بالإنترنت
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-500" />
                غير متصل بالإنترنت
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 arabic-text">
              {isOnline ? (
                'يمكنك الآن مزامنة البيانات والحصول على التحديثات'
              ) : (
                'تعمل في وضع أوف لاين - يمكنك استخدام البيانات المحفوظة'
              )}
            </div>
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </CardContent>
      </Card>

      {/* تثبيت التطبيق */}
      {canInstall && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <Smartphone className="h-5 w-5 text-blue-500" />
              تثبيت التطبيق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 arabic-text">
                يمكنك تثبيت التطبيق على جهازك للحصول على تجربة أفضل وسرعة أكبر
              </p>
              <Button 
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full"
              >
                {isInstalling ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جاري التثبيت...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    تثبيت التطبيق
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* التحديثات */}
      {hasUpdate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              تحديث متاح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 arabic-text">
                يتوفر تحديث جديد للتطبيق مع تحسينات وميزات جديدة
              </p>
              <Button 
                onClick={handleUpdate}
                disabled={isUpdating}
                className="w-full"
                variant="outline"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جاري التحديث...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    تطبيق التحديث
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* البيانات المحفوظة أوف لاين */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <HardDrive className="h-5 w-5 text-purple-500" />
            البيانات المحفوظة أوف لاين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* إحصائيات البيانات */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">المخزون:</span>
                  <span className="font-medium">{offlineStats.inventory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الوكلاء:</span>
                  <span className="font-medium">{offlineStats.agents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">العملاء:</span>
                  <span className="font-medium">{offlineStats.customers}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">المبيعات:</span>
                  <span className="font-medium">{offlineStats.sales}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المخازن:</span>
                  <span className="font-medium">{offlineStats.warehouses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الحجم:</span>
                  <span className="font-medium">{offlineStats.totalSize}</span>
                </div>
              </div>
            </div>

            {/* طابور المزامنة */}
            {offlineStats.syncQueueSize > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium arabic-text">
                    {offlineStats.syncQueueSize} عملية في انتظار المزامنة
                  </span>
                </div>
              </div>
            )}

            {/* أزرار الإدارة */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleCacheData}
                disabled={isCaching || !isOnline}
                variant="outline"
                size="sm"
              >
                {isCaching ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    حفظ البيانات
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleClearCache}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                مسح البيانات
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات PWA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Settings className="h-5 w-5 text-gray-500" />
            إعدادات التطبيق
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              onClick={handleCheckUpdates}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!isOnline}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              فحص التحديثات
            </Button>
            
            <div className="text-xs text-gray-500 space-y-1 arabic-text">
              <div className="flex items-center gap-2">
                <Info className="h-3 w-3" />
                <span>إصدار التطبيق: 1.0.0</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                <span>Service Worker: نشط</span>
              </div>
              <div className="flex items-center gap-2">
                {offlineStorage.hasOfflineData() ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>البيانات أوف لاين: متوفرة</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                    <span>البيانات أوف لاين: غير متوفرة</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PWAManager

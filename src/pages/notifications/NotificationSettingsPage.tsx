import { useState, useEffect } from 'react'
import { Bell, Check, X, Settings, Volume2, VolumeX, Smartphone, Mail } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'

import { auth, db } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { requestNotificationPermission } from '@/lib/notifications'

interface NotificationSettings {
  pushNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  soundEnabled: boolean
  notificationTypes: {
    sales: boolean
    documents: boolean
    agents: boolean
    system: boolean
    reminders: boolean
  }
  quietHours: {
    enabled: boolean
    startTime: string
    endTime: string
  }
}

const defaultSettings: NotificationSettings = {
  pushNotifications: true,
  emailNotifications: true,
  smsNotifications: false,
  soundEnabled: true,
  notificationTypes: {
    sales: true,
    documents: true,
    agents: true,
    system: true,
    reminders: true
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00'
  }
}

export function NotificationSettingsPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (user?.uid) {
      loadSettings()
    }
    
    // Check current notification permission
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }
  }, [user?.uid])

  const loadSettings = async () => {
    if (!user?.uid) return

    try {
      const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'notifications'))
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() })
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!user?.uid) return

    try {
      setSaving(true)
      await updateDoc(doc(db, 'users', user.uid, 'settings', 'notifications'), settings)
      toast.success('تم حفظ إعدادات الإشعارات')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast.error('حدث خطأ أثناء حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  const requestPermission = async () => {
    if (!user?.uid) return

    try {
      const token = await requestNotificationPermission(user.uid)
      if (token) {
        setPermissionStatus('granted')
        setSettings(prev => ({ ...prev, pushNotifications: true }))
        toast.success('تم تفعيل الإشعارات بنجاح')
      } else {
        toast.error('لم يتم منح إذن الإشعارات')
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
      toast.error('حدث خطأ أثناء طلب إذن الإشعارات')
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateNotificationType = (type: keyof NotificationSettings['notificationTypes'], enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      notificationTypes: {
        ...prev.notificationTypes,
        [type]: enabled
      }
    }))
  }

  const updateQuietHours = (key: keyof NotificationSettings['quietHours'], value: any) => {
    setSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }))
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (loading) {
    return <LoadingSpinner text="جاري تحميل إعدادات الإشعارات..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">إعدادات الإشعارات</h1>
          <p className="text-gray-600 arabic-text">تخصيص تفضيلات الإشعارات والتنبيهات</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <LoadingSpinner className="ml-2 h-4 w-4" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Check className="ml-2 h-4 w-4" />
              حفظ الإعدادات
            </>
          )}
        </Button>
      </div>

      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Bell className="h-5 w-5" />
            حالة أذونات الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">
                {permissionStatus === 'granted' ? 'مفعلة' : 
                 permissionStatus === 'denied' ? 'مرفوضة' : 'غير محددة'}
              </p>
              <p className="text-sm text-gray-600 arabic-text">
                {permissionStatus === 'granted' ? 'يمكن إرسال الإشعارات' :
                 permissionStatus === 'denied' ? 'تم رفض إذن الإشعارات' :
                 'لم يتم طلب إذن الإشعارات بعد'}
              </p>
            </div>
            {permissionStatus !== 'granted' && (
              <Button onClick={requestPermission}>
                <Bell className="ml-2 h-4 w-4" />
                طلب الإذن
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Settings className="h-5 w-5" />
            الإعدادات العامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">الإشعارات الفورية</p>
              <p className="text-sm text-gray-600 arabic-text">إشعارات المتصفح والهاتف</p>
            </div>
            <button
              onClick={() => updateSetting('pushNotifications', !settings.pushNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">الإشعارات الصوتية</p>
              <p className="text-sm text-gray-600 arabic-text">تشغيل صوت عند وصول إشعار</p>
            </div>
            <button
              onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">إشعارات البريد الإلكتروني</p>
              <p className="text-sm text-gray-600 arabic-text">إرسال إشعارات عبر البريد</p>
            </div>
            <button
              onClick={() => updateSetting('emailNotifications', !settings.emailNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">الرسائل النصية</p>
              <p className="text-sm text-gray-600 arabic-text">إرسال إشعارات عبر SMS</p>
            </div>
            <button
              onClick={() => updateSetting('smsNotifications', !settings.smsNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.smsNotifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-text">أنواع الإشعارات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">المبيعات</p>
              <p className="text-sm text-gray-600 arabic-text">إشعارات المبيعات الجديدة والفواتير</p>
            </div>
            <button
              onClick={() => updateNotificationType('sales', !settings.notificationTypes.sales)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationTypes.sales ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationTypes.sales ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">الوثائق</p>
              <p className="text-sm text-gray-600 arabic-text">تحديثات حالة الوثائق والجواب</p>
            </div>
            <button
              onClick={() => updateNotificationType('documents', !settings.notificationTypes.documents)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationTypes.documents ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationTypes.documents ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">الوكلاء</p>
              <p className="text-sm text-gray-600 arabic-text">دفعات الوكلاء والعمولات</p>
            </div>
            <button
              onClick={() => updateNotificationType('agents', !settings.notificationTypes.agents)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationTypes.agents ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationTypes.agents ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">النظام</p>
              <p className="text-sm text-gray-600 arabic-text">تحديثات النظام والصيانة</p>
            </div>
            <button
              onClick={() => updateNotificationType('system', !settings.notificationTypes.system)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationTypes.system ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationTypes.system ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">التذكيرات</p>
              <p className="text-sm text-gray-600 arabic-text">تذكيرات المواعيد والمهام</p>
            </div>
            <button
              onClick={() => updateNotificationType('reminders', !settings.notificationTypes.reminders)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationTypes.reminders ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationTypes.reminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-text">ساعات الهدوء</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium arabic-text">تفعيل ساعات الهدوء</p>
              <p className="text-sm text-gray-600 arabic-text">إيقاف الإشعارات في أوقات محددة</p>
            </div>
            <button
              onClick={() => updateQuietHours('enabled', !settings.quietHours.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  من الساعة
                </label>
                <input
                  type="time"
                  value={settings.quietHours.startTime}
                  onChange={(e) => updateQuietHours('startTime', e.target.value)}
                  className="w-full form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  إلى الساعة
                </label>
                <input
                  type="time"
                  value={settings.quietHours.endTime}
                  onChange={(e) => updateQuietHours('endTime', e.target.value)}
                  className="w-full form-input"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

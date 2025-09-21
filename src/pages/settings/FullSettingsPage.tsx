import { useState, useEffect } from 'react'
import { Settings, Building, Save, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/firebase-config.template'
import { pwaManager } from '@/lib/pwaManager'

// إعدادات النظام البسيطة والعملية
interface SystemSettings {
  companyName: string
  companyPhone: string
  companyEmail: string
  companyAddress: string
  currency: string
  taxRate: number
  lowStockThreshold: number
  defaultCommissionRate: number
}

export function FullSettingsPage() {
  const { userData } = useAuth()
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: '',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    currency: 'EGP',
    taxRate: 14,
    lowStockThreshold: 10,
    defaultCommissionRate: 5
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // تحميل الإعدادات من Firebase
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'system_settings', 'main')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        setSettings({
          companyName: data.companyName || '',
          companyPhone: data.companyPhone || '',
          companyEmail: data.companyEmail || '',
          companyAddress: data.companyAddress || '',
          currency: data.currency || 'EGP',
          taxRate: data.taxRate || 14,
          lowStockThreshold: data.lowStockThreshold || 10,
          defaultCommissionRate: data.defaultCommissionRate || 5
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('فشل في تحميل الإعدادات')
    } finally {
      setLoading(false)
    }
  }

  // حفظ الإعدادات
  const handleSave = async () => {
    if (!userData?.id) {
      toast.error('يجب تسجيل الدخول أولاً')
      return
    }

    try {
      setSaving(true)
      
      const docRef = doc(db, 'system_settings', 'main')
      await setDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: userData.id
      }, { merge: true })
      
      toast.success('تم حفظ الإعدادات بنجاح')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('فشل في حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  // تحديث قيمة في الإعدادات
  const updateSetting = (key: keyof SystemSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">جاري تحميل الإعدادات...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إعدادات النظام</h1>
            <p className="text-gray-600">إدارة الإعدادات الأساسية للنظام</p>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* معلومات الشركة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              معلومات الشركة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">اسم الشركة</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => updateSetting('companyName', e.target.value)}
                placeholder="أدخل اسم الشركة"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyPhone">رقم الهاتف</Label>
              <Input
                id="companyPhone"
                value={settings.companyPhone}
                onChange={(e) => updateSetting('companyPhone', e.target.value)}
                placeholder="أدخل رقم الهاتف"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyEmail">البريد الإلكتروني</Label>
              <Input
                id="companyEmail"
                type="email"
                value={settings.companyEmail}
                onChange={(e) => updateSetting('companyEmail', e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyAddress">العنوان</Label>
              <Input
                id="companyAddress"
                value={settings.companyAddress}
                onChange={(e) => updateSetting('companyAddress', e.target.value)}
                placeholder="أدخل عنوان الشركة"
              />
            </div>
          </CardContent>
        </Card>

        {/* إعدادات الأعمال */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الأعمال</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <select
                id="currency"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value)}
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taxRate">معدل الضريبة (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.taxRate}
                onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value) || 0)}
                placeholder="أدخل معدل الضريبة"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">حد المخزون المنخفض</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="1"
                value={settings.lowStockThreshold}
                onChange={(e) => updateSetting('lowStockThreshold', parseInt(e.target.value) || 1)}
                placeholder="أدخل حد المخزون المنخفض"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultCommissionRate">معدل العمولة الافتراضي (%)</Label>
              <Input
                id="defaultCommissionRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.defaultCommissionRate}
                onChange={(e) => updateSetting('defaultCommissionRate', parseFloat(e.target.value) || 0)}
                placeholder="أدخل معدل العمولة الافتراضي"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إعدادات التطبيق */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            إعدادات التطبيق
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-medium text-blue-900">تثبيت التطبيق</h4>
                <p className="text-sm text-blue-700">ثبت التطبيق على جهازك للوصول السريع</p>
              </div>
              <Button
                onClick={() => pwaManager.installApp()}
                disabled={!pwaManager.canInstall}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                {pwaManager.canInstall ? 'تثبيت' : 'مثبت بالفعل'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* معاينة الإعدادات */}
      <Card>
        <CardHeader>
          <CardTitle>معاينة الإعدادات الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">اسم الشركة:</span>
              <p className="text-gray-900">{settings.companyName || 'غير محدد'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">العملة:</span>
              <p className="text-gray-900">{settings.currency}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">معدل الضريبة:</span>
              <p className="text-gray-900">{settings.taxRate}%</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">معدل العمولة:</span>
              <p className="text-gray-900">{settings.defaultCommissionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

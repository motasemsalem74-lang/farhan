import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { createInitialSuperAdmin, createSampleUsers } from '@/utils/createInitialUser'
import { toast } from 'sonner'
import { Shield, Users, Database } from 'lucide-react'

export function InitialSetup() {
  const [loading, setLoading] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)

  const handleCreateInitialUser = async () => {
    try {
      setLoading(true)
      
      const result = await createInitialSuperAdmin()
      
      if (result.success) {
        toast.success('تم إنشاء المدير الأولي بنجاح!')
        setSetupComplete(true)
      } else {
        toast.error(result.error || 'حدث خطأ في إنشاء المستخدم')
      }
      
    } catch (error) {
      toast.error('حدث خطأ غير متوقع')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSampleUsers = async () => {
    try {
      setLoading(true)
      
      await createSampleUsers()
      toast.success('تم إنشاء المستخدمين التجريبيين بنجاح!')
      
    } catch (error) {
      toast.error('حدث خطأ في إنشاء المستخدمين التجريبيين')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl arabic-text">تم الإعداد بنجاح!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 arabic-text mb-2">بيانات تسجيل الدخول:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>البريد الإلكتروني:</strong> admin@alfarhan.com</p>
                <p><strong>كلمة المرور:</strong> admin123456</p>
              </div>
            </div>
            
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              تسجيل الدخول الآن
            </Button>
            
            <Button 
              onClick={handleCreateSampleUsers}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner className="ml-2 h-4 w-4" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Users className="ml-2 h-4 w-4" />
                  إنشاء مستخدمين تجريبيين
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl arabic-text">إعداد النظام الأولي</CardTitle>
          <p className="text-gray-600 arabic-text">
            يبدو أن هذه هي المرة الأولى لتشغيل النظام. نحتاج لإنشاء مستخدم مدير أولي.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 arabic-text mb-2">سيتم إنشاء:</h3>
            <ul className="text-sm text-blue-700 space-y-1 arabic-text">
              <li>• مستخدم مدير أعلى</li>
              <li>• البريد: admin@alfarhan.com</li>
              <li>• كلمة المرور: admin123456</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleCreateInitialUser}
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner className="ml-2 h-4 w-4" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Shield className="ml-2 h-4 w-4" />
                إنشاء المستخدم الأولي
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center arabic-text">
            يمكنك تغيير كلمة المرور بعد تسجيل الدخول
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

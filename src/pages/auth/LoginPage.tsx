import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react'

import { auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { InitialSetup } from '@/components/auth/InitialSetup'
import { getErrorMessage } from '@/lib/utils'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showInitialSetup, setShowInitialSetup] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password)
      toast.success('تم تسجيل الدخول بنجاح')
    } catch (error: any) {
      console.error('Login error:', error)
      
      // لا نعرض شاشة الإعداد الأولي عند خطأ في البيانات
      // if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      //   setShowInitialSetup(true)
      //   return
      // }
      
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  if (showInitialSetup) {
    return <InitialSetup />
  }

  return (
    <div className="min-h-screen al-farhan-gradient al-farhan-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Company Info */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <div className="text-4xl">🚗</div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 arabic-text">
            مؤسسة أبو فرحان للنقل الخفيف
          </h1>
          <p className="text-white/80 text-sm arabic-text">
            نظام إدارة المخزون والمبيعات
          </p>
        </div>

        {/* Login Card */}
        <Card className="backdrop-blur-sm bg-white/95 border-white/20">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <LogIn className="h-5 w-5" />
              تسجيل الدخول
            </CardTitle>
            <CardDescription className="text-center">
              يرجى إدخال بيانات الحساب للوصول إلى النظام
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" required>البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@domain.com"
                  {...register('email', {
                    required: 'البريد الإلكتروني مطلوب',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'يرجى إدخال بريد إلكتروني صحيح'
                    }
                  })}
                  error={errors.email?.message}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" required>كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور"
                    className="pl-10"
                    {...register('password', {
                      required: 'كلمة المرور مطلوبة',
                      minLength: {
                        value: 6,
                        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
                      }
                    })}
                    error={errors.password?.message}
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
              >
                <LogIn className="ml-2 h-4 w-4" />
                دخول النظام
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white/70 text-xs">
            <Shield className="h-3 w-3" />
            <span className="arabic-text">
              محمي بتشفير عالي الأمان
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Building2, CreditCard, AlertCircle } from 'lucide-react'
import { collection, addDoc, doc, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent, User } from '@/types'
import { isAdmin, isSuperAdmin } from '@/lib/utils'

interface CreateAgentFormData {
  name: string
  phone: string
  address: string
  email?: string
  password?: string
  hasUserAccount: boolean
  initialBalance: number
}

export function CreateAgentPage() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [loading, setLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateAgentFormData>({
    defaultValues: {
      hasUserAccount: false,
      initialBalance: 0
    }
  })

  const hasUserAccount = watch('hasUserAccount')

  const onSubmit = async (data: CreateAgentFormData) => {
    console.log('🚀 [CREATE AGENT] Starting agent creation process...')
    console.log('📝 [CREATE AGENT] Form data:', data)
    console.log('👤 [CREATE AGENT] Current user:', userData)
    
    if (!userData || (!isAdmin(userData.role) && !isSuperAdmin(userData.role))) {
      console.error('❌ [CREATE AGENT] Permission denied for user:', userData?.role)
      toast.error('غير مصرح لك بإضافة وكلاء جدد')
      return
    }

    try {
      setLoading(true)
      console.log('⏳ [CREATE AGENT] Loading started...')

      let userId: string | undefined
      
      // Create user account if requested
      if (data.hasUserAccount) {
        console.log('👤 [CREATE AGENT] Creating user account...')
        if (!data.email || !data.password) {
          console.error('❌ [CREATE AGENT] Missing email or password')
          toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور لإنشاء حساب المستخدم')
          return
        }

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)
          userId = userCredential.user.uid
          console.log('✅ [CREATE AGENT] User account created with ID:', userId)

          // Create user document
          const newUser: Omit<User, 'id'> = {
            username: data.email,
            email: data.email,
            displayName: data.name,
            role: 'agent',
            isActive: true,
            createdAt: new Date() as any,
            updatedAt: new Date() as any
          }

          await setDoc(doc(db, 'users', userId), newUser)
          console.log('✅ [CREATE AGENT] User document created:', newUser)
          
          toast.success('تم إنشاء حساب المستخدم بنجاح')
        } catch (error: any) {
          console.error('❌ [CREATE AGENT] Error creating user account:', error)
          if (error.code === 'auth/email-already-in-use') {
            toast.error('البريد الإلكتروني مستخدم بالفعل')
          } else {
            toast.error('خطأ في إنشاء حساب المستخدم')
          }
          return
        }
      } else {
        console.log('ℹ️ [CREATE AGENT] Skipping user account creation (offline agent)')
      }

      // Create warehouse for the agent first
      console.log('🏢 [CREATE AGENT] Creating warehouse...')
      const warehouseData = {
        name: `مخزن ${data.name}`,
        location: data.address,
        type: 'agent' as const,
        isActive: true,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        createdBy: userData.id
      }

      const warehouseRef = await addDoc(collection(db, 'warehouses'), warehouseData)
      console.log('✅ [CREATE AGENT] Warehouse created with ID:', warehouseRef.id)
      console.log('📦 [CREATE AGENT] Warehouse data:', warehouseData)

      // Create agent document with the actual warehouse ID
      console.log('👤 [CREATE AGENT] Creating agent document...')
      const agentData: Omit<Agent, 'id'> = {
        name: data.name,
        phone: data.phone,
        address: data.address,
        hasUserAccount: data.hasUserAccount,
        userId: userId || null, // Allow null for offline agents
        warehouseId: warehouseRef.id, // Use the actual warehouse ID
        currentBalance: data.initialBalance,
        isActive: true,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        createdBy: userData.id
      }

      const agentRef = await addDoc(collection(db, 'agents'), agentData)
      console.log('✅ [CREATE AGENT] Agent created with ID:', agentRef.id)
      console.log('👤 [CREATE AGENT] Agent data:', agentData)

      // Update warehouse with agent ID
      console.log('🔗 [CREATE AGENT] Linking warehouse to agent...')
      await setDoc(doc(db, 'warehouses', warehouseRef.id), {
        ...warehouseData,
        agentId: agentRef.id
      })
      console.log('✅ [CREATE AGENT] Warehouse linked to agent')

      // Create initial balance transaction if not zero
      if (data.initialBalance !== 0) {
        console.log('💰 [CREATE AGENT] Creating initial balance transaction...')
        console.log('💰 [CREATE AGENT] Initial balance:', data.initialBalance)
        
        const transactionData = {
          agentId: agentRef.id,
          type: data.initialBalance > 0 ? 'credit' : 'debit',
          amount: data.initialBalance, // استخدام القيمة الفعلية مع الإشارة
          description: 'الرصيد الافتتاحي للوكيل',
          createdAt: new Date() as any,
          createdBy: userData.id
        }
        
        console.log('🔍 [CREATE AGENT] Transaction data details:')
        console.log('- Initial balance input:', data.initialBalance)
        console.log('- Transaction type:', transactionData.type)
        console.log('- Transaction amount:', transactionData.amount)
        console.log('- Expected display: Debit column for negative, Credit column for positive')

        await addDoc(collection(db, 'agent_transactions'), transactionData)
        console.log('✅ [CREATE AGENT] Initial balance transaction created:', transactionData)
      } else {
        console.log('ℹ️ [CREATE AGENT] No initial balance transaction needed (balance is 0)')
      }

      console.log('🎉 [CREATE AGENT] Agent creation completed successfully!')
      toast.success('تم إضافة الوكيل بنجاح')
      navigate('/agents')
      
    } catch (error) {
      console.error('❌ [CREATE AGENT] Error creating agent:', error)
      toast.error('حدث خطأ أثناء إضافة الوكيل')
    } finally {
      setLoading(false)
      console.log('⏳ [CREATE AGENT] Loading finished')
    }
  }

  const handleGoBack = () => {
    navigate('/agents')
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (!isAdmin(userData.role) && !isSuperAdmin(userData.role)) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          غير مصرح لك بالوصول
        </h2>
        <p className="text-gray-600 arabic-text">
          ليس لديك صلاحية لإضافة وكلاء جدد
        </p>
        <Button onClick={handleGoBack} className="mt-4">
          العودة للقائمة الرئيسية
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">إضافة وكيل جديد</h1>
          <p className="text-gray-600 arabic-text">إنشاء حساب وكيل جديد في النظام</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <Building2 className="h-5 w-5" />
              المعلومات الأساسية
            </CardTitle>
            <CardDescription className="arabic-text">
              أدخل البيانات الأساسية للوكيل
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  اسم الوكيل *
                </label>
                <Input
                  {...register('name', { required: 'اسم الوكيل مطلوب' })}
                  placeholder="أدخل اسم الوكيل"
                  className="input-rtl arabic-text"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1 arabic-text">{errors.name.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  رقم الهاتف *
                </label>
                <Input
                  {...register('phone', { 
                    required: 'رقم الهاتف مطلوب',
                    pattern: {
                      value: /^01[0-9]{9}$/,
                      message: 'رقم الهاتف غير صحيح'
                    }
                  })}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1 arabic-text">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                العنوان *
              </label>
              <Input
                {...register('address', { required: 'العنوان مطلوب' })}
                placeholder="أدخل عنوان الوكيل"
                className="input-rtl arabic-text"
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1 arabic-text">{errors.address.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                ملاحظات
              </label>
              <textarea
                placeholder="ملاحظات إضافية عن الوكيل..."
                className="w-full form-input input-rtl arabic-text"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* User Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <Building2 className="h-5 w-5" />
              إعدادات الحساب
            </CardTitle>
            <CardDescription className="arabic-text">
              تحديد ما إذا كان الوكيل سيحصل على حساب مستخدم في النظام
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Has User Account Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('hasUserAccount')}
                className="form-checkbox"
              />
              <label className="text-sm font-medium text-gray-700 arabic-text">
                إنشاء حساب مستخدم للوكيل (يمكنه الدخول للنظام)
              </label>
            </div>

            {/* User Account Fields */}
            {hasUserAccount && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                    البريد الإلكتروني *
                  </label>
                  <Input
                    {...register('email', { 
                      required: hasUserAccount ? 'البريد الإلكتروني مطلوب' : false,
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'البريد الإلكتروني غير صحيح'
                      }
                    })}
                    type="email"
                    placeholder="agent@example.com"
                    dir="ltr"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 arabic-text">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                    كلمة المرور *
                  </label>
                  <Input
                    {...register('password', { 
                      required: hasUserAccount ? 'كلمة المرور مطلوبة' : false,
                      minLength: {
                        value: 6,
                        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
                      }
                    })}
                    type="password"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1 arabic-text">{errors.password.message}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <CreditCard className="h-5 w-5" />
              الإعدادات المالية
            </CardTitle>
            <CardDescription className="arabic-text">
              تحديد الرصيد الافتتاحي ونسبة العمولة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Initial Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  الرصيد الافتتاحي (جنيه)
                </label>
                <Input
                  {...register('initialBalance', { 
                    valueAsNumber: true,
                    validate: value => !isNaN(value) || 'يجب أن يكون رقماً صحيحاً'
                  })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1 arabic-text">
                  الرقم الموجب يعني أن الوكيل دائن، والرقم السالب يعني أنه مدين
                </p>
                {errors.initialBalance && (
                  <p className="text-red-500 text-sm mt-1 arabic-text">{errors.initialBalance.message}</p>
                )}
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="ghost" onClick={handleGoBack}>
            إلغاء
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner className="ml-2 h-4 w-4" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                حفظ الوكيل
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, User } from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent } from '@/types'
import { isAdmin, isSuperAdmin } from '@/lib/utils'

interface EditAgentFormData {
  name: string
  phone: string
  address: string
  commissionRate: number
  notes: string
  isActive: boolean
}

export function EditAgentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agent, setAgent] = useState<Agent | null>(null)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<EditAgentFormData>()

  useEffect(() => {
    if (id && userData) {
      loadAgentData()
    }
  }, [id, userData])

  const loadAgentData = async () => {
    if (!id) return

    try {
      setLoading(true)
      
      const agentDoc = await getDoc(doc(db, 'agents', id))
      if (!agentDoc.exists()) {
        toast.error('الوكيل غير موجود')
        navigate('/agents')
        return
      }

      const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent
      setAgent(agentData)

      // تعبئة النموذج بالبيانات الحالية
      setValue('name', agentData.name)
      setValue('phone', agentData.phone)
      setValue('address', agentData.address)
      setValue('commissionRate', agentData.commissionRate || 5)
      setValue('notes', agentData.notes || '')
      setValue('isActive', agentData.isActive)

    } catch (error) {
      console.error('Error loading agent:', error)
      toast.error('فشل في تحميل بيانات الوكيل')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: EditAgentFormData) => {
    if (!id || !userData) return

    try {
      setSaving(true)
      
      const docRef = doc(db, 'agents', id)
      await updateDoc(docRef, {
        name: data.name,
        phone: data.phone,
        address: data.address,
        commissionRate: data.commissionRate,
        notes: data.notes,
        isActive: data.isActive,
        updatedAt: new Date(),
        updatedBy: userData.id
      })

      toast.success('تم تحديث بيانات الوكيل بنجاح')
      navigate(`/agents/details/${id}`)
      
    } catch (error) {
      console.error('Error updating agent:', error)
      toast.error('فشل في تحديث بيانات الوكيل')
    } finally {
      setSaving(false)
    }
  }

  const handleGoBack = () => {
    navigate(`/agents/details/${id}`)
  }

  const canManageAgents = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (!canManageAgents) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          غير مصرح لك بالوصول
        </h2>
        <p className="text-gray-600 arabic-text">
          ليس لديك صلاحية لتعديل بيانات الوكلاء
        </p>
        <Button onClick={handleGoBack} className="mt-4">
          العودة
        </Button>
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner text="جاري تحميل بيانات الوكيل..." />
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          الوكيل غير موجود
        </h2>
        <p className="text-gray-600 arabic-text">
          لم يتم العثور على الوكيل المطلوب
        </p>
        <Button onClick={handleGoBack} className="mt-4">
          العودة
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">تعديل بيانات الوكيل</h1>
            <p className="text-gray-600 arabic-text">تعديل معلومات الوكيل {agent.name}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <User className="h-5 w-5" />
            تعديل البيانات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اسم الوكيل */}
              <div>
                <Label htmlFor="name" className="arabic-text">اسم الوكيل *</Label>
                <Input
                  id="name"
                  type="text"
                  className="input-rtl arabic-text"
                  {...register('name', { required: 'اسم الوكيل مطلوب' })}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1 arabic-text">{errors.name.message}</p>
                )}
              </div>

              {/* رقم الهاتف */}
              <div>
                <Label htmlFor="phone" className="arabic-text">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  type="tel"
                  className="input-rtl"
                  {...register('phone', { 
                    required: 'رقم الهاتف مطلوب',
                    pattern: {
                      value: /^01[0-9]{9}$/,
                      message: 'رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 01'
                    }
                  })}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1 arabic-text">{errors.phone.message}</p>
                )}
              </div>

              {/* العنوان */}
              <div className="md:col-span-2">
                <Label htmlFor="address" className="arabic-text">العنوان *</Label>
                <Input
                  id="address"
                  type="text"
                  className="input-rtl arabic-text"
                  {...register('address', { required: 'العنوان مطلوب' })}
                />
                {errors.address && (
                  <p className="text-sm text-red-600 mt-1 arabic-text">{errors.address.message}</p>
                )}
              </div>

              {/* نسبة العمولة */}
              <div>
                <Label htmlFor="commissionRate" className="arabic-text">نسبة العمولة (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('commissionRate', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'نسبة العمولة يجب أن تكون أكبر من أو تساوي 0' },
                    max: { value: 100, message: 'نسبة العمولة يجب أن تكون أقل من أو تساوي 100' }
                  })}
                />
                {errors.commissionRate && (
                  <p className="text-sm text-red-600 mt-1 arabic-text">{errors.commissionRate.message}</p>
                )}
              </div>

              {/* حالة النشاط */}
              <div>
                <Label htmlFor="isActive" className="arabic-text">حالة الوكيل</Label>
                <select
                  id="isActive"
                  className="w-full form-input input-rtl arabic-text"
                  {...register('isActive', { 
                    setValueAs: (value) => value === 'true' 
                  })}
                >
                  <option value="true">نشط</option>
                  <option value="false">غير نشط</option>
                </select>
              </div>

              {/* الملاحظات */}
              <div className="md:col-span-2">
                <Label htmlFor="notes" className="arabic-text">ملاحظات</Label>
                <textarea
                  id="notes"
                  rows={3}
                  className="w-full form-input input-rtl arabic-text"
                  placeholder="ملاحظات إضافية عن الوكيل..."
                  {...register('notes')}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleGoBack}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <LoadingSpinner className="ml-2 h-4 w-4" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    حفظ التغييرات
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

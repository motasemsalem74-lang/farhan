import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, User, Warehouse, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Warehouse as WarehouseType } from '@/types'
import { isAdmin, isSuperAdmin } from '@/lib/utils'

interface CreateOfflineAgentFormData {
  name: string
  phone: string
  address: string
  commissionRate: number
  notes?: string
}

export function CreateOfflineAgentPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CreateOfflineAgentFormData>()

  const canManageAgents = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  const onSubmit = async (data: CreateOfflineAgentFormData) => {
    if (!userData) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    try {
      setSaving(true)

      // Create agent warehouse first
      const warehouseData = {
        name: `مخزن الوكيل - ${data.name}`,
        type: 'agent' as const,
        description: `مخزن خاص بالوكيل الأوفلاين ${data.name}`,
        location: data.address,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const warehouseRef = await addDoc(collection(db, 'warehouses'), warehouseData)
      const warehouseId = warehouseRef.id

      // Create offline agent
      const agentData = {
        name: data.name,
        phone: data.phone,
        address: data.address,
        hasUserAccount: false, // This is an offline agent
        userId: null,
        warehouseId: warehouseId,
        currentBalance: 0, // Start with zero balance
        commissionRate: data.commissionRate,
        notes: data.notes || '',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userData.id
      }

      const agentRef = await addDoc(collection(db, 'agents'), agentData)

      // Update warehouse with agent ID
      await addDoc(collection(db, 'warehouses'), {
        ...warehouseData,
        agentId: agentRef.id
      })

      toast.success('تم إنشاء الوكيل الأوفلاين بنجاح')
      navigate('/agents/offline')
      
    } catch (error) {
      console.error('Error creating offline agent:', error)
      toast.error('فشل في إنشاء الوكيل الأوفلاين')
    } finally {
      setSaving(false)
    }
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (!canManageAgents) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">غير مصرح</h3>
            <p className="text-red-700">
              هذه الشاشة مخصصة للمديرين فقط
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/agents/offline')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">
              إنشاء وكيل أوفلاين جديد
            </h1>
            <p className="text-gray-600 arabic-text">
              إضافة وكيل جديد بدون حساب في النظام
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                بيانات الوكيل الأوفلاين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Agent Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الوكيل *</Label>
                  <Input
                    id="name"
                    {...register('name', { required: 'اسم الوكيل مطلوب' })}
                    placeholder="أدخل اسم الوكيل"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <Input
                    id="phone"
                    {...register('phone', { required: 'رقم الهاتف مطلوب' })}
                    placeholder="أدخل رقم الهاتف"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">العنوان *</Label>
                  <Input
                    id="address"
                    {...register('address', { required: 'العنوان مطلوب' })}
                    placeholder="أدخل عنوان الوكيل"
                  />
                  {errors.address && (
                    <p className="text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                {/* Commission Rate */}
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">معدل العمولة (%) *</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...register('commissionRate', { 
                      required: 'معدل العمولة مطلوب',
                      valueAsNumber: true,
                      min: { value: 0, message: 'معدل العمولة يجب أن يكون أكبر من أو يساوي صفر' },
                      max: { value: 100, message: 'معدل العمولة يجب أن يكون أقل من أو يساوي 100' }
                    })}
                    placeholder="مثال: 10"
                  />
                  {errors.commissionRate && (
                    <p className="text-sm text-red-600">{errors.commissionRate.message}</p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="ملاحظات إضافية عن الوكيل"
                    className="w-full form-input input-rtl arabic-text min-h-[100px]"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full gap-2"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner />
                      جاري إنشاء الوكيل...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      إنشاء الوكيل الأوفلاين
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                معلومات المخزن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 arabic-text">مخزن تلقائي</h4>
                <p className="text-sm text-blue-700 arabic-text">
                  سيتم إنشاء مخزن خاص بالوكيل تلقائياً عند إنشاء الحساب
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600 arabic-text">
                  <span className="font-medium">اسم المخزن:</span> مخزن الوكيل - [اسم الوكيل]
                </p>
                <p className="text-sm text-gray-600 arabic-text">
                  <span className="font-medium">النوع:</span> مخزن وكيل
                </p>
                <p className="text-sm text-gray-600 arabic-text">
                  <span className="font-medium">الحالة:</span> نشط
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                الحساب المالي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2 arabic-text">رصيد ابتدائي</h4>
                <p className="text-sm text-green-700 arabic-text">
                  سيبدأ الوكيل برصيد صفر ويتم تحديث رصيده حسب المعاملات
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600 arabic-text">
                  <span className="font-medium">الرصيد الابتدائي:</span> 0.00 جنيه
                </p>
                <p className="text-sm text-gray-600 arabic-text">
                  <span className="font-medium">نوع الحساب:</span> وكيل أوفلاين
                </p>
                <p className="text-sm text-gray-600 arabic-text">
                  <span className="font-medium">إدارة الحساب:</span> من قِبل المديرين
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2 arabic-text">ملاحظة مهمة</h4>
                <p className="text-sm text-yellow-700 arabic-text">
                  الوكلاء الأوفلاين لا يمكنهم تسجيل الدخول للنظام. يتم إدارة جميع عملياتهم من قِبل المديرين.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

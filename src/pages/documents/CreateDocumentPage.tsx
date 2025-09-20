import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, FileText, Search, Calendar, AlertCircle } from 'lucide-react'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { DocumentTracking, Sale } from '@/types'
import { isAdmin, isSuperAdmin } from '@/lib/utils'

interface CreateDocumentFormData {
  saleId: string
  estimatedCompletionDate: string
  notes?: string
}

export function CreateDocumentPage() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CreateDocumentFormData>({
    defaultValues: {
      estimatedCompletionDate: new Date(Date.now() + 1209600000).toISOString().split('T')[0] // 14 days from now
    }
  })

  const saleId = watch('saleId')

  useEffect(() => {
    if (userData) {
      loadAvailableSales()
    }
  }, [userData])

  useEffect(() => {
    if (saleId && sales.length > 0) {
      const sale = sales.find(s => s.id === saleId)
      setSelectedSale(sale || null)
    }
  }, [saleId, sales])

  const loadAvailableSales = async () => {
    try {
      setSearchLoading(true)
      
      // Mock data for demonstration - replace with real Firebase query
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockSales: Sale[] = [
        {
          id: 'sale-1',
          invoiceNumber: 'INV-2024-001',
          customerId: 'customer-1',
          customerName: 'أحمد محمد علي',
          customerPhone: '01111111111',
          agentId: 'agent-1',
          agentName: 'محمد أحمد السيد',
          items: [
            {
              inventoryItemId: 'item-1',
              motorFingerprint: 'ABC123456',
              chassisNumber: 'CH789012345',
              salePrice: 45000,
              commission: 3375
            }
          ],
          totalAmount: 45000,
          totalCommission: 3375,
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000) as any,
          updatedAt: new Date() as any,
          createdBy: 'admin'
        },
        {
          id: 'sale-5',
          invoiceNumber: 'INV-2024-005',
          customerId: 'customer-5',
          customerName: 'سارة أحمد محمود',
          customerPhone: '01555555555',
          agentId: 'agent-2',
          agentName: 'فاطمة حسن علي',
          items: [
            {
              inventoryItemId: 'item-5',
              motorFingerprint: 'MNO567890',
              chassisNumber: 'CH123456789',
              salePrice: 42000,
              commission: 3150
            }
          ],
          totalAmount: 42000,
          totalCommission: 3150,
          status: 'completed',
          createdAt: new Date(Date.now() - 432000000) as any, // 5 days ago
          updatedAt: new Date() as any,
          createdBy: 'admin'
        }
      ]
      
      // Filter sales that don't have documents yet
      setSales(mockSales)
      
    } catch (error) {
      console.error('Error loading sales:', error)
      toast.error('حدث خطأ أثناء تحميل المبيعات')
    } finally {
      setSearchLoading(false)
    }
  }

  const searchSales = async () => {
    if (!searchTerm.trim()) {
      loadAvailableSales()
      return
    }

    try {
      setSearchLoading(true)
      
      // Mock search - replace with real Firebase query
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const filteredSales = sales.filter(sale => 
        sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items.some(item => 
          item.motorFingerprint.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
      
      setSales(filteredSales)
      
    } catch (error) {
      console.error('Error searching sales:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const onSubmit = async (data: CreateDocumentFormData) => {
    if (!userData || (!isAdmin(userData.role) && !isSuperAdmin(userData.role))) {
      toast.error('غير مصرح لك بإضافة وثائق جديدة')
      return
    }

    if (!selectedSale) {
      toast.error('يرجى اختيار عملية بيع')
      return
    }

    try {
      setLoading(true)

      const documentData: Omit<DocumentTracking, 'id'> = {
        saleId: selectedSale.id,
        inventoryItemId: selectedSale.items[0].inventoryItemId,
        motorFingerprint: selectedSale.items[0].motorFingerprint,
        chassisNumber: selectedSale.items[0].chassisNumber,
        customerName: selectedSale.customerName,
        customerPhone: selectedSale.customerPhone,
        agentName: selectedSale.agentName,
        status: 'pending',
        submittedAt: new Date() as any,
        estimatedCompletionDate: new Date(data.estimatedCompletionDate) as any,
        notes: data.notes,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        createdBy: userData.id
      }

      // In real implementation, add to Firestore
      // await addDoc(collection(db, 'document_tracking'), documentData)

      toast.success('تم إضافة الوثيقة بنجاح')
      navigate('/documents')
      
    } catch (error) {
      console.error('Error creating document:', error)
      toast.error('حدث خطأ أثناء إضافة الوثيقة')
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    navigate('/documents')
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
          ليس لديك صلاحية لإضافة وثائق جديدة
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
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">إضافة وثيقة جديدة</h1>
          <p className="text-gray-600 arabic-text">إنشاء طلب جواب لدراجة نارية</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sale Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <Search className="h-5 w-5" />
              اختيار عملية البيع
            </CardTitle>
            <CardDescription className="arabic-text">
              ابحث عن عملية البيع التي تريد إنشاء وثيقة لها
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث برقم الفاتورة، اسم العميل، بصمة الموتور..."
                className="flex-1 input-rtl arabic-text"
              />
              <Button type="button" onClick={searchSales} disabled={searchLoading}>
                {searchLoading ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                بحث
              </Button>
            </div>

            {/* Sales List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {searchLoading ? (
                <div className="text-center py-4">
                  <LoadingSpinner text="جاري البحث..." />
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 arabic-text">لا توجد مبيعات متاحة</p>
                </div>
              ) : (
                sales.map((sale) => (
                  <div
                    key={sale.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSale?.id === sale.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedSale(sale)
                      setValue('saleId', sale.id)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{sale.invoiceNumber}</p>
                        <p className="text-sm text-gray-600 arabic-text">{sale.customerName}</p>
                        <p className="text-sm text-gray-500">
                          بصمة الموتور: {sale.items[0].motorFingerprint}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 arabic-text">الوكيل: {sale.agentName}</p>
                        <p className="text-sm text-gray-500">{sale.customerPhone}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <input type="hidden" {...register('saleId', { required: 'يرجى اختيار عملية بيع' })} />
            {errors.saleId && (
              <p className="text-red-500 text-sm arabic-text">{errors.saleId.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Selected Sale Details */}
        {selectedSale && (
          <Card>
            <CardHeader>
              <CardTitle className="arabic-text">تفاصيل عملية البيع المختارة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 arabic-text">معلومات الدراجة</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">بصمة الموتور:</span> {selectedSale.items[0].motorFingerprint}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">رقم الشاسيه:</span> {selectedSale.items[0].chassisNumber}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">سعر البيع:</span> {selectedSale.items[0].salePrice.toLocaleString()} جنيه
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 arabic-text">معلومات العميل والوكيل</h3>
                  <div className="space-y-2">
                    <p className="text-sm arabic-text">
                      <span className="font-medium">العميل:</span> {selectedSale.customerName}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">الهاتف:</span> {selectedSale.customerPhone}
                    </p>
                    <p className="text-sm arabic-text">
                      <span className="font-medium">الوكيل:</span> {selectedSale.agentName}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 arabic-text">
              <Calendar className="h-5 w-5" />
              تفاصيل الوثيقة
            </CardTitle>
            <CardDescription className="arabic-text">
              تحديد الموعد المتوقع للإنجاز والملاحظات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estimated Completion Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                  الموعد المتوقع للإنجاز *
                </label>
                <Input
                  {...register('estimatedCompletionDate', { required: 'الموعد المتوقع مطلوب' })}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.estimatedCompletionDate && (
                  <p className="text-red-500 text-sm mt-1 arabic-text">{errors.estimatedCompletionDate.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 arabic-text">
                ملاحظات
              </label>
              <textarea
                {...register('notes')}
                placeholder="ملاحظات إضافية حول الوثيقة..."
                className="w-full form-input input-rtl arabic-text"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="ghost" onClick={handleGoBack}>
            إلغاء
          </Button>
          <Button type="submit" disabled={loading || !selectedSale}>
            {loading ? (
              <>
                <LoadingSpinner className="ml-2 h-4 w-4" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                إنشاء الوثيقة
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ArrowLeft, Save, User, Package, Camera } from 'lucide-react'
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ImprovedCameraOCR } from '@/components/ui/ImprovedCameraOCR'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { useNotificationSender } from '@/hooks/useNotifications'
import { Agent, InventoryItem } from '@/types'
import { generateTransactionId, formatCurrency } from '@/lib/utils'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { createCompositeImage } from '@/lib/imageComposer'

interface AgentCreateSaleFormProps {
  agent: Agent
  selectedItem: InventoryItem | null
  onCancel: () => void
  onSuccess: () => void
}

interface SaleFormData {
  customerName: string
  customerPhone: string
  customerNationalId: string
  customerAddress: string
  salePrice: number
  notes: string
}

export default function AgentCreateSaleForm({ 
  agent, 
  selectedItem, 
  onCancel, 
  onSuccess 
}: AgentCreateSaleFormProps) {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const { sendNewSaleNotification } = useNotificationSender()
  const [loading, setLoading] = useState(false)
  const [showIdCapture, setShowIdCapture] = useState(false)
  const [customerIdImage, setCustomerIdImage] = useState<string>('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SaleFormData>({
    defaultValues: {
      salePrice: selectedItem?.salePrice || selectedItem?.purchasePrice || 0
    }
  })

  const salePrice = watch('salePrice')
  const profit = selectedItem ? salePrice - selectedItem.purchasePrice : 0
  // استخدام العمولة المحددة في المنتج عند نقله للوكيل فقط
  const commissionRate = (selectedItem as any)?.agentCommissionPercentage || 0
  const agentCommission = (profit * commissionRate) / 100
  const companyShare = profit - agentCommission

  const handleIdCardOCR = async (text: string, imageUrl: string) => {
    try {
      // استخراج البيانات من النص
      const lines = text.split('\n').filter(line => line.trim())
      
      // البحث عن الاسم (عادة في السطر الأول أو الثاني)
      if (lines.length > 0) {
        const nameMatch = lines.find(line => 
          line.includes('الاسم') || 
          /^[أ-ي\s]+$/.test(line.trim()) && line.trim().length > 5
        )
        if (nameMatch) {
          const name = nameMatch.replace('الاسم:', '').trim()
          setValue('customerName', name)
        }
      }

      // البحث عن الرقم القومي
      const nationalIdMatch = text.match(/\d{14}/)
      if (nationalIdMatch) {
        setValue('customerNationalId', nationalIdMatch[0])
      }

      // البحث عن رقم الهاتف
      const phoneMatch = text.match(/01[0-9]{9}/)
      if (phoneMatch) {
        setValue('customerPhone', phoneMatch[0])
      }

      // حفظ صورة البطاقة محلياً فقط (بدون رفع)
      if (imageUrl) {
        setCustomerIdImage(imageUrl)
        console.log('📱 Customer ID image saved locally for later upload')
      }

      toast.success('تم استخراج البيانات من بطاقة الهوية')
      setShowIdCapture(false)
    } catch (error) {
      console.error('Error processing ID card:', error)
      toast.error('فشل في استخراج البيانات من بطاقة الهوية')
    }
  }

  const onSubmit = async (data: SaleFormData) => {
    if (!selectedItem || !userData || !agent) {
      toast.error('بيانات غير مكتملة')
      return
    }

    try {
      setLoading(true)
      
      const transactionId = generateTransactionId()
      const invoiceNumber = `INV-${Date.now()}`

      // إنشاء معاملة البيع
      const saleTransaction = {
        transactionId,
        invoiceNumber,
        type: 'sale',
        agentId: agent.id,
        customerId: data.customerNationalId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        items: [{
          inventoryItemId: selectedItem.id,
          motorFingerprint: selectedItem.motorFingerprint,
          chassisNumber: selectedItem.chassisNumber,
          brand: selectedItem.brand,
          model: selectedItem.model,
          salePrice: data.salePrice,
          purchasePrice: selectedItem.purchasePrice,
          profit: profit,
          agentCommission: agentCommission,
          companyShare: companyShare
        }],
        totalAmount: data.salePrice,
        totalProfit: profit,
        agentCommission: agentCommission,
        companyShare: companyShare,
        notes: data.notes,
        createdAt: serverTimestamp(),
        createdBy: userData.id
      }

      const saleRef = await addDoc(collection(db, 'sales_transactions'), saleTransaction)

      // تحديث حالة المنتج إلى مباع
      await updateDoc(doc(db, 'inventory_items', selectedItem.id), {
        status: 'sold',
        soldAt: serverTimestamp(),
        soldBy: userData.id,
        saleTransactionId: saleRef.id,
        salePrice: data.salePrice
      })

      // التأكد من رفع صورة بطاقة العميل إذا كانت لا تزال data URL
      let finalCustomerIdImage = customerIdImage
      if (customerIdImage && customerIdImage.startsWith('data:')) {
        try {
          toast.info('🔄 جاري رفع صورة بطاقة الهوية نهائياً...')
          const response = await fetch(customerIdImage)
          const blob = await response.blob()
          const uploadResult = await uploadToCloudinary(blob, {
            folder: 'customer-ids',
            tags: ['customer-id', 'agent-sale', 'final-upload']
          })
          finalCustomerIdImage = uploadResult.secure_url
          console.log('✅ Final customer ID upload:', finalCustomerIdImage)
        } catch (error) {
          console.error('Failed to upload customer ID finally:', error)
          // سنستخدم الصورة المحلية
        }
      }

      // إنشاء الصورة المجمعة ورفعها إلى Cloudinary
      let combinedImageUrl = ''
      try {
        console.log('🖼️ Creating composite image...')
        const compositeDataUrl = await createCompositeImage({
          customerName: data.customerName,
          saleDate: new Date().toLocaleDateString('ar-EG'),
          customerIdImage: finalCustomerIdImage || '',
          motorFingerprintImage: selectedItem.motorFingerprintImageUrl || '',
          chassisNumberImage: selectedItem.chassisNumberImageUrl || '',
          motorFingerprint: selectedItem.motorFingerprint || '',
          chassisNumber: selectedItem.chassisNumber || ''
        })
        
        if (compositeDataUrl) {
          console.log('🔄 Uploading composite image to Cloudinary...')
          // تحويل data URL إلى blob
          const response = await fetch(compositeDataUrl)
          const blob = await response.blob()
          
          // رفع إلى Cloudinary
          const uploadResult = await uploadToCloudinary(blob, {
            folder: 'composite-documents',
            tags: ['composite', 'agent-sale', `agent-${agent.id}`]
          })
          
          combinedImageUrl = uploadResult.secure_url
          console.log('✅ Composite image uploaded:', combinedImageUrl)
        }
      } catch (error) {
        console.error('Error creating/uploading composite image:', error)
      }

      // إنشاء سجل تتبع الوثائق
      const documentTracking = {
        saleTransactionId: saleRef.id,
        invoiceNumber,
        agentId: agent.id,
        customerName: data.customerName,
        customerNationalId: data.customerNationalId,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        motorFingerprint: selectedItem.motorFingerprint,
        chassisNumber: selectedItem.chassisNumber,
        motorBrand: selectedItem.brand,
        motorModel: selectedItem.model,
        salePrice: data.salePrice,
        purchasePrice: selectedItem.purchasePrice,
        profit: profit,
        agentCommission: agentCommission,
        companyShare: companyShare,
        idCardFrontImageUrl: finalCustomerIdImage,
        motorFingerprintImageUrl: selectedItem.motorFingerprintImageUrl,
        chassisNumberImageUrl: selectedItem.chassisNumberImageUrl,
        combinedImageUrl: combinedImageUrl,
        status: 'pending_submission',
        stages: [{
          status: 'pending_submission',
          date: new Date(),
          updatedBy: userData.id,
          notes: `تم إنشاء فاتورة البيع بواسطة الوكيل ${agent.name}`
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userData.id
      }

      const documentRef = await addDoc(collection(db, 'document_tracking'), documentTracking)

      // تحديث رصيد الوكيل - إضافة نصيب الشركة كمديونية (مثل نظام العملاء)
      const agentTransaction = {
        agentId: agent.id,
        type: 'sale',
        amount: -companyShare, // مديونية (سالب) = نصيب الشركة من الربح
        description: `بيع ${selectedItem.brand} ${selectedItem.model} للعميل ${data.customerName} - نصيب الشركة من الربح`,
        saleTransactionId: saleRef.id,
        saleAmount: data.salePrice,
        commission: agentCommission,
        companyShare: companyShare,
        previousBalance: agent.currentBalance || 0,
        newBalance: (agent.currentBalance || 0) - companyShare,
        createdAt: serverTimestamp(),
        createdBy: userData.id
      }

      await addDoc(collection(db, 'agent_transactions'), agentTransaction)

      // تحديث رصيد الوكيل في جدول الوكلاء
      await updateDoc(doc(db, 'agents', agent.id), {
        currentBalance: (agent.currentBalance || 0) - companyShare,
        lastTransactionDate: serverTimestamp()
      })

      // إرسال إشعار للمديرين بالبيعة الجديدة
      console.log('🔔 Attempting to send sale notification...')
      try {
        await sendNewSaleNotification({
          agentId: agent.id,
          agentName: agent.name,
          documentId: documentRef.id,
          customerName: data.customerName,
          totalAmount: data.salePrice,
          items: [{
            name: `${selectedItem.brand} ${selectedItem.model}`,
            quantity: 1,
            price: data.salePrice,
            type: selectedItem.type
          }]
        })
        console.log('✅ Sale notification sent successfully!')
      } catch (notificationError) {
        console.error('❌ Failed to send notification:', notificationError)
        // لا نوقف العملية إذا فشل الإشعار
      }

      toast.success('تم إنشاء فاتورة البيع بنجاح وبدء تتبع الوثائق')
      onSuccess()

    } catch (error) {
      console.error('Error creating sale:', error)
      toast.error('حدث خطأ أثناء إنشاء فاتورة البيع')
    } finally {
      setLoading(false)
    }
  }

  if (!selectedItem) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
          لم يتم اختيار منتج
        </h3>
        <p className="text-gray-500 arabic-text mb-6">
          يرجى اختيار منتج من المخزن للبيع
        </p>
        <Button onClick={onCancel}>العودة</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">إنشاء فاتورة بيع</h1>
            <p className="text-gray-600 arabic-text">
              بيع {selectedItem.brand} {selectedItem.model}
            </p>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Package className="h-5 w-5" />
            معلومات المنتج
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="arabic-text">الماركة والموديل</Label>
              <p className="font-medium">{selectedItem.brand} {selectedItem.model}</p>
            </div>
            <div>
              <Label className="arabic-text">اللون والسنة</Label>
              <p className="font-medium">{selectedItem.color} - {selectedItem.manufacturingYear}</p>
            </div>
            <div>
              <Label className="arabic-text">بصمة الموتور</Label>
              <p className="font-mono text-sm">{selectedItem.motorFingerprint}</p>
            </div>
            <div>
              <Label className="arabic-text">رقم الشاسيه</Label>
              <p className="font-mono text-sm">{selectedItem.chassisNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sale Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between arabic-text">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                بيانات العميل
              </div>
              <Button type="button" variant="outline" onClick={() => setShowIdCapture(true)}>
                <Camera className="ml-2 h-4 w-4" />
                تصوير البطاقة
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName" className="arabic-text">اسم العميل *</Label>
                <Input
                  id="customerName"
                  {...register('customerName', { required: 'اسم العميل مطلوب' })}
                  className="input-rtl arabic-text"
                />
                {errors.customerName && (
                  <p className="text-sm text-red-600 mt-1">{errors.customerName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerPhone" className="arabic-text">رقم الهاتف *</Label>
                <Input
                  id="customerPhone"
                  {...register('customerPhone', { 
                    required: 'رقم الهاتف مطلوب',
                    pattern: {
                      value: /^01[0-9]{9}$/,
                      message: 'رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 01'
                    }
                  })}
                />
                {errors.customerPhone && (
                  <p className="text-sm text-red-600 mt-1">{errors.customerPhone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerNationalId" className="arabic-text">الرقم القومي *</Label>
                <Input
                  id="customerNationalId"
                  {...register('customerNationalId', { 
                    required: 'الرقم القومي مطلوب',
                    pattern: {
                      value: /^\d{14}$/,
                      message: 'الرقم القومي يجب أن يكون 14 رقم'
                    }
                  })}
                />
                {errors.customerNationalId && (
                  <p className="text-sm text-red-600 mt-1">{errors.customerNationalId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="salePrice" className="arabic-text">سعر البيع *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  {...register('salePrice', { 
                    required: 'سعر البيع مطلوب',
                    valueAsNumber: true,
                    min: { value: selectedItem.purchasePrice, message: 'سعر البيع لا يمكن أن يكون أقل من سعر الشراء' }
                  })}
                />
                {errors.salePrice && (
                  <p className="text-sm text-red-600 mt-1">{errors.salePrice.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="customerAddress" className="arabic-text">العنوان *</Label>
              <Input
                id="customerAddress"
                {...register('customerAddress', { required: 'العنوان مطلوب' })}
                className="input-rtl arabic-text"
              />
              {errors.customerAddress && (
                <p className="text-sm text-red-600 mt-1">{errors.customerAddress.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes" className="arabic-text">ملاحظات</Label>
              <textarea
                id="notes"
                rows={3}
                className="w-full form-input input-rtl arabic-text"
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="arabic-text">ملخص مالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="arabic-text">سعر الشراء:</span>
                <span>{formatCurrency(selectedItem.purchasePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="arabic-text">سعر البيع:</span>
                <span className="font-bold">{formatCurrency(salePrice)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="arabic-text">إجمالي الربح:</span>
                <span className="font-bold text-green-600">{formatCurrency(profit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="arabic-text">عمولتك ({commissionRate}%):</span>
                <span className="font-bold text-purple-600">{formatCurrency(agentCommission)}</span>
              </div>
              {commissionRate === 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 arabic-text">
                  ❌ خطأ: لم يتم تحديد عمولة لهذا المنتج عند تحويله للمخزن. يجب على المدير تحديد العمولة في شاشة تحويل المخازن.
                </div>
              )}
              <div className="flex justify-between">
                <span className="arabic-text">حصة المؤسسة:</span>
                <span className="font-bold text-blue-600">{formatCurrency(companyShare)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
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
                إنشاء الفاتورة
              </>
            )}
          </Button>
        </div>
      </form>

      {/* ID Card Capture Modal */}
      {showIdCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full mx-4">
            <ImprovedCameraOCR
              title="تصوير بطاقة الهوية"
              placeholder="بيانات بطاقة الهوية"
              extractionType="general"
              onTextExtracted={handleIdCardOCR}
              onCancel={() => setShowIdCapture(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

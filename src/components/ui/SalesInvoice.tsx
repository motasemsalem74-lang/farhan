import { forwardRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'

interface SalesInvoiceData {
  // Transaction Info
  transactionId: string
  saleDate: string
  
  // Agent Info
  agentName: string
  agentId: string
  
  // Customer Info
  customerName: string
  customerNationalId: string
  customerPhone: string
  customerAddress: string
  customerBirthDate?: string
  customerGender?: string
  customerIdImage?: string
  
  // Vehicle Info
  brand: string
  model: string
  color: string
  manufacturingYear: number
  motorFingerprint: string
  chassisNumber: string
  motorFingerprintImage?: string
  chassisNumberImage?: string
  
  // Financial Info
  purchasePrice: number
  salePrice: number
  profit: number
  agentCommission: number
  agentCommissionPercentage: number
  companyShare: number
  
  // Additional Info
  notes?: string
}

interface SalesInvoiceProps {
  data: SalesInvoiceData
  className?: string
}

export const SalesInvoice = forwardRef<HTMLDivElement, SalesInvoiceProps>(
  ({ data, className = '' }, ref) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return (
      <div ref={ref} className={`max-w-4xl mx-auto bg-white ${className}`}>
        {/* Header */}
        <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 arabic-text mb-2">
            فاتورة بيع موتوسيكل
          </h1>
          <p className="text-lg text-gray-600 arabic-text">
            شركة الفرحان للموتوسيكلات
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="text-right">
              <span className="font-medium">رقم الفاتورة:</span> {data.transactionId}
            </div>
            <div className="text-left">
              <span className="font-medium">التاريخ:</span> {formatDate(data.saleDate)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg arabic-text">بيانات العميل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">الاسم:</span>
                  <span>{data.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">الرقم القومي:</span>
                  <span className="font-mono">{data.customerNationalId}</span>
                </div>
                {data.customerBirthDate && (
                  <div className="flex justify-between">
                    <span className="font-medium">تاريخ الميلاد:</span>
                    <span>{data.customerBirthDate}</span>
                  </div>
                )}
                {data.customerGender && (
                  <div className="flex justify-between">
                    <span className="font-medium">النوع:</span>
                    <span>{data.customerGender}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">الهاتف:</span>
                  <span className="font-mono">{data.customerPhone}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-medium">العنوان:</span>
                  <span className="text-right max-w-xs">{data.customerAddress}</span>
                </div>
              </div>
              
              {/* Customer ID Image */}
              {data.customerIdImage && (
                <div className="mt-4 pt-4 border-t">
                  <p className="font-medium text-sm mb-2">صورة بطاقة الرقم القومي:</p>
                  <img 
                    src={data.customerIdImage} 
                    alt="بطاقة الرقم القومي" 
                    className="w-full max-w-sm mx-auto rounded border"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg arabic-text">بيانات الوكيل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">اسم الوكيل:</span>
                  <span>{data.agentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">كود الوكيل:</span>
                  <span className="font-mono">{data.agentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">نسبة العمولة:</span>
                  <span>{data.agentCommissionPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">قيمة العمولة:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(data.agentCommission)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg arabic-text">بيانات الموتوسيكل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 arabic-text">المواصفات الأساسية</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">الماركة:</span>
                    <span>{data.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">الموديل:</span>
                    <span>{data.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">اللون:</span>
                    <span>{data.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">سنة الصنع:</span>
                    <span>{data.manufacturingYear}</span>
                  </div>
                </div>
              </div>

              {/* Technical Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 arabic-text">البيانات الفنية</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">بصمة الموتور:</span>
                    <span className="font-mono text-xs">{data.motorFingerprint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">رقم الشاسيه:</span>
                    <span className="font-mono text-xs">{data.chassisNumber}</span>
                  </div>
                </div>
                
                {/* Technical Images */}
                <div className="space-y-3 mt-4">
                  {data.motorFingerprintImage && (
                    <div>
                      <p className="font-medium text-xs mb-1">صورة بصمة الموتور:</p>
                      <img 
                        src={data.motorFingerprintImage} 
                        alt="بصمة الموتور" 
                        className="w-full max-w-32 rounded border"
                      />
                    </div>
                  )}
                  {data.chassisNumberImage && (
                    <div>
                      <p className="font-medium text-xs mb-1">صورة رقم الشاسيه:</p>
                      <img 
                        src={data.chassisNumberImage} 
                        alt="رقم الشاسيه" 
                        className="w-full max-w-32 rounded border"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 arabic-text">البيانات المالية</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">سعر الشراء:</span>
                    <span>{formatCurrency(data.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">سعر البيع:</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(data.salePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">الربح الإجمالي:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(data.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">نصيب الشركة:</span>
                    <span className="font-medium text-purple-600">
                      {formatCurrency(data.companyShare)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {data.notes && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 arabic-text mb-2">ملاحظات:</h4>
                <p className="text-sm text-gray-700 arabic-text bg-gray-50 p-3 rounded">
                  {data.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-2 border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="font-medium arabic-text">توقيع العميل</p>
              <div className="h-16 border-b border-gray-400 mt-4"></div>
            </div>
            <div>
              <p className="font-medium arabic-text">توقيع الوكيل</p>
              <div className="h-16 border-b border-gray-400 mt-4"></div>
            </div>
            <div>
              <p className="font-medium arabic-text">ختم الشركة</p>
              <div className="h-16 border-b border-gray-400 mt-4"></div>
            </div>
          </div>
          
          <div className="text-center mt-8 text-xs text-gray-500">
            <p>تم إنشاء هذه الفاتورة إلكترونياً بواسطة نظام إدارة الفرحان للموتوسيكلات</p>
            <p>للاستفسارات: info@alfarhan-motors.com | 📞 01234567890</p>
          </div>
        </div>
      </div>
    )
  }
)

SalesInvoice.displayName = 'SalesInvoice'

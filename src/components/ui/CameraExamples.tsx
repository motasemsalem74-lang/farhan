import { useState } from 'react'
import { SmartIdCardCapture } from './SmartIdCardCapture'
import { ProductImageCapture } from './ProductImageCapture'
import { NativeCameraCapture, SelfieCamera } from './NativeCameraCapture'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'

// مثال على استخدام المكونات الجديدة
export function CameraExamples() {
  const [currentCapture, setCurrentCapture] = useState<string | null>(null)
  const [capturedData, setCapturedData] = useState<any>(null)

  const handleIdCardCapture = (data: any, imageUrl?: string) => {
    console.log('ID Card Data:', data, 'Image URL:', imageUrl)
    setCapturedData({ type: 'idCard', data, imageUrl })
    setCurrentCapture(null)
  }

  const handleMotorFingerprintCapture = (text: string, imageUrl?: string) => {
    console.log('Motor Fingerprint:', text, 'Image URL:', imageUrl)
    setCapturedData({ type: 'motorFingerprint', text, imageUrl })
    setCurrentCapture(null)
  }

  const handleChassisNumberCapture = (text: string, imageUrl?: string) => {
    console.log('Chassis Number:', text, 'Image URL:', imageUrl)
    setCapturedData({ type: 'chassisNumber', text, imageUrl })
    setCurrentCapture(null)
  }

  const handleGeneralImageCapture = (imageDataUrl: string) => {
    console.log('General Image captured')
    setCapturedData({ type: 'general', imageDataUrl })
    setCurrentCapture(null)
  }

  const handleSelfieCapture = (imageDataUrl: string) => {
    console.log('Selfie captured')
    setCapturedData({ type: 'selfie', imageDataUrl })
    setCurrentCapture(null)
  }

  const handleCancel = () => {
    setCurrentCapture(null)
  }

  // عرض واجهة التقاط حسب النوع المختار
  if (currentCapture === 'idCard') {
    return (
      <SmartIdCardCapture
        onDataExtracted={handleIdCardCapture}
        onCancel={handleCancel}
      />
    )
  }

  if (currentCapture === 'motorFingerprint') {
    return (
      <ProductImageCapture
        type="motorFingerprint"
        onDataExtracted={handleMotorFingerprintCapture}
        onCancel={handleCancel}
      />
    )
  }

  if (currentCapture === 'chassisNumber') {
    return (
      <ProductImageCapture
        type="chassisNumber"
        onDataExtracted={handleChassisNumberCapture}
        onCancel={handleCancel}
      />
    )
  }

  if (currentCapture === 'general') {
    return (
      <NativeCameraCapture
        onCapture={handleGeneralImageCapture}
        onCancel={handleCancel}
        title="التقاط صورة عامة"
      />
    )
  }

  if (currentCapture === 'selfie') {
    return (
      <SelfieCamera
        onCapture={handleSelfieCapture}
        onCancel={handleCancel}
      />
    )
  }

  // الواجهة الرئيسية لاختيار نوع التقاط
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="arabic-text">أمثلة على استخدام الكاميرا الذكية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={() => setCurrentCapture('idCard')}
              className="h-20 flex flex-col gap-2"
            >
              <span className="text-lg">📱</span>
              <span className="arabic-text">تصوير بطاقة الهوية</span>
              <span className="text-xs opacity-75">مع استخراج تلقائي للبيانات</span>
            </Button>

            <Button
              onClick={() => setCurrentCapture('motorFingerprint')}
              className="h-20 flex flex-col gap-2"
              variant="outline"
            >
              <span className="text-lg">🏍️</span>
              <span className="arabic-text">تصوير بصمة الموتور</span>
              <span className="text-xs opacity-75">مع استخراج تلقائي للنص</span>
            </Button>

            <Button
              onClick={() => setCurrentCapture('chassisNumber')}
              className="h-20 flex flex-col gap-2"
              variant="outline"
            >
              <span className="text-lg">🔢</span>
              <span className="arabic-text">تصوير رقم الشاسيه</span>
              <span className="text-xs opacity-75">مع استخراج تلقائي للنص</span>
            </Button>

            <Button
              onClick={() => setCurrentCapture('general')}
              className="h-20 flex flex-col gap-2"
              variant="outline"
            >
              <span className="text-lg">📷</span>
              <span className="arabic-text">التقاط صورة عامة</span>
              <span className="text-xs opacity-75">كاميرا أو معرض</span>
            </Button>

            <Button
              onClick={() => setCurrentCapture('selfie')}
              className="h-20 flex flex-col gap-2"
              variant="outline"
            >
              <span className="text-lg">🤳</span>
              <span className="arabic-text">التقاط سيلفي</span>
              <span className="text-xs opacity-75">كاميرا أمامية</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* عرض البيانات المُلتقطة */}
      {capturedData && (
        <Card>
          <CardHeader>
            <CardTitle className="arabic-text">البيانات المُلتقطة</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(capturedData, null, 2)}
            </pre>
            <Button
              onClick={() => setCapturedData(null)}
              variant="outline"
              className="mt-4"
            >
              مسح البيانات
            </Button>
          </CardContent>
        </Card>
      )}

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-text">مميزات النظام الجديد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold arabic-text">📱 على الموبايل:</h4>
              <ul className="text-sm space-y-1 arabic-text">
                <li>• فتح الكاميرا مباشرة</li>
                <li>• كاميرا خلفية للوثائق</li>
                <li>• كاميرا أمامية للسيلفي</li>
                <li>• اختيار من المعرض</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold arabic-text">💻 على الكمبيوتر:</h4>
              <ul className="text-sm space-y-1 arabic-text">
                <li>• اختيار الملفات</li>
                <li>• سحب وإفلات</li>
                <li>• معاينة الصور</li>
                <li>• تحرير البيانات</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 arabic-text">✨ مميزات إضافية:</h4>
            <ul className="text-sm text-blue-700 space-y-1 arabic-text mt-2">
              <li>• استخراج تلقائي للبيانات باستخدام OCR</li>
              <li>• رفع تلقائي للصور إلى السيرفر</li>
              <li>• إمكانية التعديل اليدوي</li>
              <li>• معالجة الأخطاء بذكاء</li>
              <li>• واجهة سهلة ومألوفة للمستخدمين</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

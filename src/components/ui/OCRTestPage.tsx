import { useState } from 'react'
import { Upload, TestTube, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { toast } from 'sonner'
import { 
  extractEgyptianIdCardEnhanced, 
  extractMotorFingerprintEnhanced, 
  extractChassisNumberEnhanced 
} from '@/lib/enhancedOCR'

interface TestResult {
  type: string
  success: boolean
  text: string
  extractedData?: any
  processingTime: number
  error?: string
}

export function OCRTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)

  const runAllTests = async () => {
    setIsRunningTests(true)
    setTestResults([])
    
    const testImages = [
      {
        name: 'مثال رقم الشاسية.jpg',
        type: 'chassisNumber',
        path: '/امثلة/مثال رقم الشاسية.jpg'
      },
      {
        name: 'مثال بصمه الماتور.jpg',
        type: 'motorFingerprint',
        path: '/امثلة/مثال بصمه الماتور.jpg'
      },
      {
        name: 'مثال صورة بطاقة العميل.jpg',
        type: 'egyptianId',
        path: '/امثلة/مثال صورة بطاقة العميل.jpg'
      }
    ]

    const results: TestResult[] = []

    for (const testImage of testImages) {
      try {
        toast.info(`🧪 اختبار ${testImage.name}...`)
        
        // Load image as data URL
        const imageDataUrl = await loadImageAsDataUrl(testImage.path)
        
        const startTime = Date.now()
        let result
        
        switch (testImage.type) {
          case 'chassisNumber':
            result = await extractChassisNumberEnhanced(imageDataUrl)
            break
          case 'motorFingerprint':
            result = await extractMotorFingerprintEnhanced(imageDataUrl)
            break
          case 'egyptianId':
            result = await extractEgyptianIdCardEnhanced(imageDataUrl)
            break
          default:
            throw new Error('نوع اختبار غير معروف')
        }
        
        const processingTime = Date.now() - startTime
        
        results.push({
          type: testImage.name,
          success: result.success,
          text: result.text || '',
          extractedData: result.extractedData,
          processingTime,
          error: result.error
        })
        
        if (result.success) {
          toast.success(`✅ نجح اختبار ${testImage.name}`)
        } else {
          toast.error(`❌ فشل اختبار ${testImage.name}`)
        }
        
      } catch (error) {
        console.error(`Test failed for ${testImage.name}:`, error)
        results.push({
          type: testImage.name,
          success: false,
          text: '',
          processingTime: 0,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        })
        toast.error(`❌ فشل اختبار ${testImage.name}`)
      }
    }

    setTestResults(results)
    setIsRunningTests(false)
    
    const successCount = results.filter(r => r.success).length
    toast.success(`🎯 انتهت الاختبارات: ${successCount}/${results.length} نجحت`)
  }

  const loadImageAsDataUrl = async (imagePath: string): Promise<string> => {
    // This is a mock function - in a real implementation, you would load the actual images
    // For now, we'll return a placeholder
    throw new Error('لا يمكن تحميل الصور في بيئة الاختبار الحالية')
  }

  const testWithUploadedImage = async (file: File, type: 'chassisNumber' | 'motorFingerprint' | 'egyptianId') => {
    try {
      setIsRunningTests(true)
      
      // Convert file to data URL
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      toast.info(`🧪 اختبار ${file.name}...`)
      
      const startTime = Date.now()
      let result
      
      switch (type) {
        case 'chassisNumber':
          result = await extractChassisNumberEnhanced(imageDataUrl)
          break
        case 'motorFingerprint':
          result = await extractMotorFingerprintEnhanced(imageDataUrl)
          break
        case 'egyptianId':
          result = await extractEgyptianIdCardEnhanced(imageDataUrl)
          break
      }
      
      const processingTime = Date.now() - startTime
      
      const testResult: TestResult = {
        type: file.name,
        success: result.success,
        text: result.text || '',
        extractedData: result.extractedData,
        processingTime,
        error: result.error
      }
      
      setTestResults(prev => [testResult, ...prev])
      
      if (result.success) {
        toast.success(`✅ نجح اختبار ${file.name} في ${processingTime}ms`)
      } else {
        toast.error(`❌ فشل اختبار ${file.name}: ${result.error}`)
      }
      
    } catch (error) {
      console.error('Test failed:', error)
      toast.error(`❌ فشل الاختبار: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    } finally {
      setIsRunningTests(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-6 w-6" />
            اختبار نظام OCR المحسن
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">اختبار رقم الشاسيه</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) testWithUploadedImage(file, 'chassisNumber')
                }}
                className="w-full p-2 border rounded"
                disabled={isRunningTests}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">اختبار بصمة الموتور</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) testWithUploadedImage(file, 'motorFingerprint')
                }}
                className="w-full p-2 border rounded"
                disabled={isRunningTests}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">اختبار بطاقة الهوية</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) testWithUploadedImage(file, 'egyptianId')
                }}
                className="w-full p-2 border rounded"
                disabled={isRunningTests}
              />
            </div>
          </div>
          
          <Button 
            onClick={runAllTests}
            disabled={isRunningTests}
            className="w-full"
          >
            {isRunningTests ? (
              <>
                <Clock className="animate-spin h-4 w-4 mr-2" />
                جاري تشغيل الاختبارات...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                تشغيل جميع الاختبارات
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>نتائج الاختبارات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{result.type}</h3>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-sm text-gray-500">
                        {result.processingTime}ms
                      </span>
                    </div>
                  </div>
                  
                  {result.success ? (
                    <div className="space-y-2">
                      <div>
                        <strong>النص المستخرج:</strong>
                        <pre className="bg-gray-50 p-2 rounded text-sm mt-1 whitespace-pre-wrap">
                          {result.text}
                        </pre>
                      </div>
                      
                      {result.extractedData && (
                        <div>
                          <strong>البيانات المنظمة:</strong>
                          <pre className="bg-blue-50 p-2 rounded text-sm mt-1">
                            {JSON.stringify(result.extractedData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-600">
                      <strong>خطأ:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

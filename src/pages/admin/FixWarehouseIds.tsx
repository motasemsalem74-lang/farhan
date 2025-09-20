import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { toast } from 'sonner'
import { fixWarehouseIds, fixInventoryWarehouseIds } from '@/utils/fixWarehouseIds'
import { Settings, Database, CheckCircle, AlertTriangle } from 'lucide-react'

export function FixWarehouseIds() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleFixWarehouseIds = async () => {
    try {
      setLoading(true)
      setResults(null)
      
      const result = await fixWarehouseIds()
      setResults(result)
      
      if (result.success) {
        toast.success(`تم إصلاح معرفات المخازن بنجاح! تم معالجة ${result.agentsProcessed} وكيل و ${result.itemsProcessed} صنف`)
      }
    } catch (error) {
      console.error('Error fixing warehouse IDs:', error)
      toast.error('حدث خطأ أثناء إصلاح معرفات المخازن')
    } finally {
      setLoading(false)
    }
  }

  const handleFixInventoryIds = async () => {
    try {
      setLoading(true)
      setResults(null)
      
      const result = await fixInventoryWarehouseIds()
      setResults(result)
      
      if (result.success) {
        toast.success(`تم إصلاح معرفات المخزون بنجاح! تم تحديث ${result.itemsUpdated} صنف`)
      }
    } catch (error) {
      console.error('Error fixing inventory IDs:', error)
      toast.error('حدث خطأ أثناء إصلاح معرفات المخزون')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="جاري إصلاح معرفات المخازن..." />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      <div className="flex items-center gap-4">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">
            إصلاح معرفات المخازن
          </h1>
          <p className="text-gray-600 arabic-text">
            أدوات لإصلاح مشاكل عدم تطابق معرفات المخازن في النظام
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fix Warehouse IDs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              إصلاح معرفات المخازن
            </CardTitle>
            <CardDescription>
              يقوم بتوحيد معرفات المخازن بين الوكلاء والمخازن الفعلية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 arabic-text mb-2">ما يقوم به هذا الإصلاح:</h4>
              <ul className="text-sm text-blue-800 arabic-text space-y-1">
                <li>• يجد المخازن التي تنتمي لكل وكيل</li>
                <li>• يحدث معرف المخزن في بيانات الوكيل</li>
                <li>• يحدث معرفات المخازن في أصناف المخزون</li>
              </ul>
            </div>
            <Button 
              onClick={handleFixWarehouseIds}
              disabled={loading}
              className="w-full"
            >
              تشغيل إصلاح معرفات المخازن
            </Button>
          </CardContent>
        </Card>

        {/* Fix Inventory IDs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              إصلاح معرفات المخزون
            </CardTitle>
            <CardDescription>
              يقوم بتحديث معرفات المخازن في أصناف المخزون لتطابق مخازن الوكلاء
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 arabic-text mb-2">ما يقوم به هذا الإصلاح:</h4>
              <ul className="text-sm text-green-800 arabic-text space-y-1">
                <li>• يبحث عن الأصناف التي تنتمي لوكلاء معينين</li>
                <li>• يحدث معرف المخزن لكل صنف</li>
                <li>• يصحح أسماء المخازن</li>
              </ul>
            </div>
            <Button 
              onClick={handleFixInventoryIds}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              تشغيل إصلاح معرفات المخزون
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              نتائج الإصلاح
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.success ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 arabic-text mb-2">تم الإصلاح بنجاح! ✅</h4>
                <div className="text-sm text-green-800 arabic-text space-y-1">
                  {results.agentsProcessed && (
                    <p>• تم معالجة {results.agentsProcessed} وكيل</p>
                  )}
                  {results.itemsProcessed && (
                    <p>• تم معالجة {results.itemsProcessed} صنف مخزون</p>
                  )}
                  {results.itemsUpdated && (
                    <p>• تم تحديث {results.itemsUpdated} صنف</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 arabic-text mb-2">فشل الإصلاح ❌</h4>
                <p className="text-sm text-red-800 arabic-text">
                  حدث خطأ أثناء عملية الإصلاح. يرجى المحاولة مرة أخرى أو مراجعة سجلات الأخطاء.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            تحذير مهم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <ul className="text-sm text-yellow-800 arabic-text space-y-2">
              <li>• تأكد من عمل نسخة احتياطية من قاعدة البيانات قبل تشغيل أي إصلاح</li>
              <li>• هذه العمليات تقوم بتعديل البيانات بشكل دائم</li>
              <li>• يُنصح بتشغيل هذه الإصلاحات في أوقات قليلة الاستخدام</li>
              <li>• راجع سجلات الكونسول للتأكد من نجاح العملية</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { 
  collection, 
  query, 
  getDocs
} from 'firebase/firestore'
import { toast } from 'sonner'
import { 
  Package, 
  ArrowLeft
} from 'lucide-react'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Warehouse } from '@/types'

export default function CreateSalePageNew() {
  console.log('🚨 [NEW PAGE] CreateSalePageNew loaded at:', new Date().toISOString())
  
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log('🚨 [NEW PAGE] useEffect triggered, userData:', !!userData)
    if (userData) {
      loadWarehouses()
    }
  }, [userData])

  const loadWarehouses = async () => {
    try {
      setLoading(true)
      console.log('🚨 [NEW PAGE] Starting to load warehouses...')
      
      // تحميل جميع المخازن
      const warehousesQuery = query(collection(db, 'warehouses'))
      const warehousesSnapshot = await getDocs(warehousesQuery)
      const allWarehouses = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Warehouse[]
      
      console.log('🚨 [NEW PAGE] ALL warehouses found:', allWarehouses.length)
      console.log('🚨 [NEW PAGE] Warehouses details:', allWarehouses)
      
      // فلترة مخازن المؤسسة
      const institutionWarehouses = allWarehouses.filter(w => {
        const name = w.name?.toLowerCase() || ''
        const type = w.type?.toLowerCase() || ''
        
        return (
          type === 'main' || 
          type === 'showroom' ||
          type === 'institution' ||
          name.includes('رئيسي') || 
          name.includes('معرض') ||
          name.includes('الرئيسي') ||
          name.includes('المعرض') ||
          name.includes('مؤسسة') ||
          name.includes('المؤسسة')
        )
      })
      
      console.log('🚨 [NEW PAGE] Institution warehouses:', institutionWarehouses.length)
      console.log('🚨 [NEW PAGE] Institution warehouses details:', institutionWarehouses)
      
      setWarehouses(institutionWarehouses)
      
      if (institutionWarehouses.length === 0) {
        toast.error('لا توجد مخازن مؤسسة متاحة')
      } else {
        toast.success(`تم تحميل ${institutionWarehouses.length} مخزن مؤسسة`)
      }
      
    } catch (error) {
      console.error('🚨 [NEW PAGE] Error loading warehouses:', error)
      toast.error('خطأ في تحميل المخازن')
    } finally {
      setLoading(false)
    }
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">صفحة البيع الجديدة - اختبار</h1>
          <p className="text-gray-600 arabic-text">اختبار تحميل المخازن</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/sales')}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للمبيعات
        </Button>
      </div>

      {/* Warehouses Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            اختبار المخازن
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">المخازن المتاحة:</label>
            
            {loading ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">جاري تحميل المخازن...</p>
              </div>
            ) : warehouses.length === 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">لا توجد مخازن متاحة</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">تم العثور على {warehouses.length} مخزن:</p>
                </div>
                
                <select className="w-full p-2 border rounded-lg">
                  <option value="">اختر المخزن</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.type})
                    </option>
                  ))}
                </select>
                
                <div className="space-y-2">
                  {warehouses.map(warehouse => (
                    <div key={warehouse.id} className="p-3 bg-gray-50 border rounded-lg">
                      <p className="font-medium">{warehouse.name}</p>
                      <p className="text-sm text-gray-600">النوع: {warehouse.type}</p>
                      <p className="text-sm text-gray-600">ID: {warehouse.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button onClick={loadWarehouses} disabled={loading}>
            {loading ? 'جاري التحميل...' : 'إعادة تحميل المخازن'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

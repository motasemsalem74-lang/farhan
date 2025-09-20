import { useState } from 'react'
import { toast } from 'sonner'
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { Warehouse, Building2, CheckCircle } from 'lucide-react'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useUserData } from '@/hooks/useUserData'

interface DefaultWarehouse {
  name: string
  location: string
  description: string
  capacity: number
}

const defaultWarehouses: DefaultWarehouse[] = [
  {
    name: 'المخزن الرئيسي',
    location: 'مصر',
    description: 'المخزن الرئيسي لتخزين الموتوسيكلات',
    capacity: 1000
  },
  {
    name: 'مخزن المعرض',
    location: 'الصف - المعرض',
    description: 'مخزن المعرض لعرض الموتوسيكلات للعملاء',
    capacity: 50
  }
]

export const CreateDefaultWarehouses = () => {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [loading, setLoading] = useState(false)
  const [createdWarehouses, setCreatedWarehouses] = useState<string[]>([])

  const createDefaultWarehouses = async () => {
    if (!userData) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    try {
      setLoading(true)
      const created: string[] = []
      
      for (const warehouseData of defaultWarehouses) {
        // Check if warehouse already exists
        const existingWarehouseQuery = query(
          collection(db, 'warehouses'),
          where('name', '==', warehouseData.name)
        )
        
        const existingWarehouseSnapshot = await getDocs(existingWarehouseQuery)
        
        if (existingWarehouseSnapshot.empty) {
          // Warehouse doesn't exist, create it
          const newWarehouse = {
            ...warehouseData,
            isActive: true,
            currentStock: 0,
            managerId: userData.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userData.id
          }
          
          const docRef = await addDoc(collection(db, 'warehouses'), newWarehouse)
          created.push(warehouseData.name)
          console.log(`Created warehouse: ${warehouseData.name} with ID: ${docRef.id}`)
        } else {
          console.log(`Warehouse already exists: ${warehouseData.name}`)
        }
      }
      
      setCreatedWarehouses(created)
      
      if (created.length > 0) {
        toast.success(`تم إنشاء ${created.length} مخزن بنجاح`)
      } else {
        toast.info('جميع المخازن موجودة بالفعل')
      }
    } catch (error) {
      console.error('Error creating default warehouses:', error)
      toast.error('خطأ في إنشاء المخازن')
    } finally {
      setLoading(false)
    }
  }

  if (!userData) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 arabic-text">يرجى تسجيل الدخول أولاً</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 arabic-text">إنشاء المخازن الأساسية</h1>
        <p className="text-gray-600 arabic-text">
          إضافة المخزن الرئيسي ومخزن المعرض إذا لم يكونا موجودين
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            المخازن المطلوب إنشاؤها
          </CardTitle>
          <CardDescription>
            سيتم فحص وجود المخازن أولاً لتجنب التكرار
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {defaultWarehouses.map((warehouse, index) => (
            <div 
              key={index}
              className={`p-4 border rounded-lg ${
                createdWarehouses.includes(warehouse.name) 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium arabic-text flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    {warehouse.name}
                    {createdWarehouses.includes(warehouse.name) && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 arabic-text mt-1">
                    {warehouse.description}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>الموقع: {warehouse.location}</span>
                    <span>السعة: {warehouse.capacity} وحدة</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4">
            <Button
              onClick={createDefaultWarehouses}
              loading={loading}
              disabled={loading}
              className="w-full"
            >
              <Building2 className="ml-2 h-4 w-4" />
              إنشاء المخازن الأساسية
            </Button>
          </div>

          {createdWarehouses.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 arabic-text mb-2">
                تم إنشاء المخازن التالية:
              </h4>
              <ul className="text-sm text-green-700 arabic-text space-y-1">
                {createdWarehouses.map((name, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

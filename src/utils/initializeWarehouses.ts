import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'

const defaultWarehouses = [
  {
    name: 'المخزن الرئيسي',
    location: 'الرياض',
    description: 'المخزن الرئيسي لتخزين الموتوسيكلات',
    isActive: true,
    currentStock: 0,
    managerId: 'system',
    createdBy: 'system'
  },
  {
    name: 'مخزن المعرض',
    location: 'الرياض - المعرض', 
    description: 'مخزن المعرض لعرض الموتوسيكلات للعملاء',
    isActive: true,
    currentStock: 0,
    managerId: 'system',
    createdBy: 'system'
  }
]

export const initializeWarehouses = async (retryCount = 0) => {
  try {
    console.log('🏗️ فحص المخازن الأساسية...')
    
    for (const warehouseData of defaultWarehouses) {
      try {
        const existingQuery = query(
          collection(db, 'warehouses'),
          where('name', '==', warehouseData.name)
        )
        
        const existingSnapshot = await getDocs(existingQuery)
        
        if (existingSnapshot.empty) {
          const newWarehouse = {
            ...warehouseData,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          await addDoc(collection(db, 'warehouses'), newWarehouse)
          console.log(`✅ تم إنشاء المخزن: ${warehouseData.name}`)
        } else {
          console.log(`📦 المخزن موجود بالفعل: ${warehouseData.name}`)
        }
      } catch (warehouseError: any) {
        console.log(`⚠️ خطأ في معالجة المخزن ${warehouseData.name}:`, warehouseError.message)
        // استمرار المعالجة للمخازن الأخرى
      }
    }
  } catch (error: any) {
    console.log('⚠️ خطأ في إنشاء المخازن:', error.message)
    
    // إعادة المحاولة في حالة الأخطاء الداخلية
    if (retryCount < 2 && (error.code === 'internal' || error.message?.includes('internal error'))) {
      console.log(`🔄 إعادة محاولة إنشاء المخازن (${retryCount + 1}/3)`)
      setTimeout(() => {
        initializeWarehouses(retryCount + 1)
      }, 2000 * (retryCount + 1)) // تأخير متزايد
    }
  }
}

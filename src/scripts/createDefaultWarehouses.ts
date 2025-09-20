import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase-config.template'

interface DefaultWarehouse {
  name: string
  location: string
  description: string
  capacity: number
}

const defaultWarehouses: DefaultWarehouse[] = [
  {
    name: 'المخزن الرئيسي',
    location: 'الرياض',
    description: 'المخزن الرئيسي لتخزين الموتوسيكلات',
    capacity: 1000
  },
  {
    name: 'مخزن المعرض',
    location: 'الرياض - المعرض',
    description: 'مخزن المعرض لعرض الموتوسيكلات للعملاء',
    capacity: 50
  }
]

export const createDefaultWarehouses = async (userId: string) => {
  try {
    console.log('Creating default warehouses...')
    
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
          managerId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userId
        }
        
        const docRef = await addDoc(collection(db, 'warehouses'), newWarehouse)
        console.log(`Created warehouse: ${warehouseData.name} with ID: ${docRef.id}`)
      } else {
        console.log(`Warehouse already exists: ${warehouseData.name}`)
      }
    }
    
    console.log('Default warehouses creation completed')
    return true
  } catch (error) {
    console.error('Error creating default warehouses:', error)
    throw error
  }
}

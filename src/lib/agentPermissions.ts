// نظام صلاحيات الوكلاء المتقدم

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase/firebase-config.template'
import { createCompositeImage } from './imageComposer'
import { uploadToCloudinary } from './cloudinary'

interface AgentData {
  id: string
  name: string
  warehouseId: string
  userId?: string
  isActive: boolean
  commissionRate: number
  totalSales: number
  totalCommission: number
  createdAt: any
}

interface AgentInventoryItem {
  id: string
  motorFingerprint: string
  chassisNumber: string
  model: string
  color: string
  brand: string
  manufacturingYear: number
  purchasePrice: number
  salePrice: number
  status: 'available' | 'sold' | 'reserved'
  currentWarehouseId: string
  agentId?: string
  createdAt: any
}

interface AgentSale {
  id: string
  agentId: string
  customerId: string
  customerName: string
  inventoryItemId: string
  salePrice: number
  agentCommission: number
  commissionRate: number
  status: 'completed' | 'pending' | 'cancelled'
  createdAt: any
}

interface AgentTransaction {
  id: string
  agentId: string
  type: 'commission' | 'debt' | 'payment'
  amount: number
  description: string
  relatedSaleId?: string
  status: 'pending' | 'completed'
  createdAt: any
}

export class AgentPermissionsService {
  
  // التحقق من أن المستخدم وكيل وجلب بياناته
  static async getAgentData(userId: string): Promise<AgentData | null> {
    try {
      const agentsQuery = query(
        collection(db, 'agents'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      )
      
      const agentsSnapshot = await getDocs(agentsQuery)
      
      if (agentsSnapshot.empty) {
        return null
      }
      
      const agentDoc = agentsSnapshot.docs[0]
      return {
        id: agentDoc.id,
        ...agentDoc.data()
      } as AgentData
      
    } catch (error) {
      console.error('Error getting agent data:', error)
      return null
    }
  }

  // جلب بيانات الوكيل بمعرف الوكيل (للاستخدام في كشف الحساب)
  static async getAgentById(agentId: string): Promise<AgentData | null> {
    try {
      const agentRef = doc(db, 'agents', agentId)
      const agentDoc = await getDoc(agentRef)
      
      if (!agentDoc.exists()) {
        return null
      }
      
      return {
        id: agentDoc.id,
        ...agentDoc.data()
      } as AgentData
      
    } catch (error) {
      console.error('Error getting agent by ID:', error)
      return null
    }
  }
  
  // جلب المنتجات المتاحة في مخزن الوكيل فقط
  static async getAgentInventory(_agentId: string, warehouseId: string): Promise<AgentInventoryItem[]> {
    try {
      const inventoryQuery = query(
        collection(db, 'inventory_items'),
        where('currentWarehouseId', '==', warehouseId),
        where('status', '==', 'available')
      )
      
      const inventorySnapshot = await getDocs(inventoryQuery)
      
      return inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentInventoryItem[]
      
    } catch (error) {
      console.error('Error getting agent inventory:', error)
      return []
    }
  }
  
  // جلب مبيعات الوكيل فقط
  static async getAgentSales(agentId: string): Promise<AgentSale[]> {
    try {
      const salesQuery = query(
        collection(db, 'sales'),
        where('agentId', '==', agentId)
      )
      
      const salesSnapshot = await getDocs(salesQuery)
      
      return salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentSale[]
      
    } catch (error) {
      console.error('Error getting agent sales:', error)
      return []
    }
  }
  
  // جلب معاملات الوكيل المالية فقط
  static async getAgentTransactions(agentId: string): Promise<AgentTransaction[]> {
    try {
      const transactionsQuery = query(
        collection(db, 'agent_transactions'),
        where('agentId', '==', agentId)
      )
      
      const transactionsSnapshot = await getDocs(transactionsQuery)
      
      return transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentTransaction[]
      
    } catch (error) {
      console.error('Error getting agent transactions:', error)
      return []
    }
  }
  
  // إنشاء بيع جديد للوكيل (مع التحقق من الصلاحيات)
  static async createAgentSale(
    agentId: string, 
    warehouseId: string,
    saleData: {
      customerId: string
      customerName: string
      customerPhone: string
      customerAddress: string
      inventoryItemId: string
      salePrice: number
      commissionRate: number
      customerIdImageUrl?: string
    }
  ): Promise<{ success: boolean; saleId?: string; error?: string }> {
    console.log('🚀 [AGENT PERMISSIONS] Starting createAgentSale...')
    console.log('🏪 [AGENT PERMISSIONS] Agent ID:', agentId)
    console.log('📦 [AGENT PERMISSIONS] Warehouse ID:', warehouseId)
    console.log('📝 [AGENT PERMISSIONS] Sale data:', saleData)
    
    try {
      // التحقق من أن المنتج في مخزن الوكيل
      console.log('🔍 [AGENT PERMISSIONS] Checking inventory item...')
      const itemRef = doc(db, 'inventory_items', saleData.inventoryItemId)
      const itemDoc = await getDoc(itemRef)
      
      if (!itemDoc.exists()) {
        console.error('❌ [AGENT PERMISSIONS] Inventory item not found:', saleData.inventoryItemId)
        return { success: false, error: 'المنتج غير موجود' }
      }
      
      const itemData = itemDoc.data()
      console.log('✅ [AGENT PERMISSIONS] Inventory item found:', itemData)
      console.log('📦 [AGENT PERMISSIONS] Item current warehouse:', itemData.currentWarehouseId)
      console.log('💰 [AGENT PERMISSIONS] Item purchase price:', itemData.purchasePrice)
      
      // تحميل بيانات الوكيل
      console.log('🔍 [AGENT PERMISSIONS] Loading agent data...')
      const agentRef = doc(db, 'agents', agentId)
      const agentDoc = await getDoc(agentRef)
      
      if (!agentDoc.exists()) {
        console.error('❌ [AGENT PERMISSIONS] Agent not found:', agentId)
        return { success: false, error: 'الوكيل غير موجود' }
      }
      
      const agentData = agentDoc.data()
      console.log('✅ [AGENT PERMISSIONS] Agent data loaded:', agentData)
      console.log('💰 [AGENT PERMISSIONS] Agent current balance:', agentData.currentBalance)
      
      // التحقق من أن المنتج في مخزن الوكيل
      console.log('🔍 [AGENT PERMISSIONS] Validating warehouse ownership...')
      if (itemData.currentWarehouseId !== warehouseId) {
        console.error('❌ [AGENT PERMISSIONS] Item not in agent warehouse. Item warehouse:', itemData.currentWarehouseId, 'Agent warehouse:', warehouseId)
        return { success: false, error: 'هذا المنتج ليس في مخزن الوكيل' }
      }
      console.log('✅ [AGENT PERMISSIONS] Item is in agent warehouse')
      
      // التحقق من حالة المنتج
      console.log('🔍 [AGENT PERMISSIONS] Checking item availability...')
      if (itemData.status !== 'available') {
        console.error('❌ [AGENT PERMISSIONS] Item not available. Status:', itemData.status)
        return { success: false, error: 'هذا المنتج غير متاح للبيع' }
      }
      console.log('✅ [AGENT PERMISSIONS] Item is available for sale')
      
      // حساب العمولة من الربح وليس من سعر البيع
      console.log('💰 [AGENT PERMISSIONS] Calculating commissions...')
      const totalProfit = saleData.salePrice - itemData.purchasePrice
      const agentCommission = totalProfit * (saleData.commissionRate / 100)
      const companyShare = totalProfit - agentCommission
      
      console.log('💰 [AGENT PERMISSIONS] Sale price:', saleData.salePrice)
      console.log('💰 [AGENT PERMISSIONS] Purchase price:', itemData.purchasePrice)
      console.log('💰 [AGENT PERMISSIONS] Total profit:', totalProfit)
      console.log('💰 [AGENT PERMISSIONS] Commission rate:', saleData.commissionRate, '%')
      console.log('💰 [AGENT PERMISSIONS] Agent commission (from profit):', agentCommission)
      console.log('💰 [AGENT PERMISSIONS] Company share (from profit):', companyShare)
      console.log('🔍 [AGENT PERMISSIONS] Verification: Commission + Company Share =', agentCommission + companyShare, '(should equal total profit:', totalProfit, ')')
      
      // إنشاء سجل البيع
      console.log('📝 [AGENT PERMISSIONS] Creating sale record...')
      const saleDoc = await addDoc(collection(db, 'sales'), {
        agentId,
        customerId: saleData.customerId,
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone,
        customerAddress: saleData.customerAddress,
        inventoryItemId: saleData.inventoryItemId,
        motorFingerprint: itemData.motorFingerprint,
        chassisNumber: itemData.chassisNumber,
        model: itemData.model,
        brand: itemData.brand,
        color: itemData.color,
        purchasePrice: itemData.purchasePrice,
        salePrice: saleData.salePrice,
        agentCommission,
        companyShare,
        commissionRate: saleData.commissionRate,
        customerIdImageUrl: saleData.customerIdImageUrl || null, // صورة بطاقة العميل
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // تحديث حالة المنتج إلى مباع
      await updateDoc(itemRef, {
        status: 'sold',
        soldAt: serverTimestamp(),
        soldToAgentId: agentId,
        salePrice: saleData.salePrice
      })
      
      // إنشاء معاملة واحدة للبيع (العمولة - نصيب الشركة)
      const netAmount = agentCommission - companyShare
      await addDoc(collection(db, 'agent_transactions'), {
        agentId,
        type: 'sale',
        amount: netAmount,
        description: `بيع ${itemData.brand} ${itemData.model} للعميل ${saleData.customerName}`,
        salePrice: saleData.salePrice,
        purchasePrice: itemData.purchasePrice,
        agentCommission: agentCommission,
        companyShare: companyShare,
        commissionRate: saleData.commissionRate,
        relatedSaleId: saleDoc.id,
        status: 'completed',
        createdAt: serverTimestamp()
      })
      
      // إنشاء الصورة المجمعة للوثائق
      let combinedImageUrl = ''
      try {
        if (saleData.customerIdImageUrl && (itemData.motorFingerprintImageUrl || itemData.chassisNumberImageUrl)) {
          console.log('🖼️ Creating composite image...')
          const compositeImageDataUrl = await createCompositeImage({
            customerIdImage: saleData.customerIdImageUrl,
            motorFingerprintImage: itemData.motorFingerprintImageUrl,
            chassisNumberImage: itemData.chassisNumberImageUrl
          })
          
          // تحويل data URL إلى Blob
          const base64Data = compositeImageDataUrl.split(',')[1]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const imageBlob = new Blob([byteArray], { type: 'image/png' })
          
          // رفع الصورة المجمعة إلى Cloudinary
          const compositeResult = await uploadToCloudinary(imageBlob, {
            folder: 'composite-documents',
            tags: ['composite', 'agent-sale', 'customer-' + saleData.customerId]
          })
          combinedImageUrl = compositeResult.secure_url
          console.log('✅ Composite image created and uploaded:', combinedImageUrl)
        }
      } catch (error) {
        console.error('⚠️ Error creating composite image:', error)
        // Continue without composite image
      }

      // إنشاء سجل تتبع الوثائق
      const currentTime = new Date()
      await addDoc(collection(db, 'document_tracking'), {
        saleTransactionId: saleDoc.id,
        agentId,
        agentName: agentData.name, // إضافة اسم الوكيل
        customerName: saleData.customerName,
        customerNationalId: saleData.customerId,
        customerPhone: saleData.customerPhone,
        customerAddress: saleData.customerAddress,
        motorFingerprint: itemData.motorFingerprint,
        chassisNumber: itemData.chassisNumber,
        motorBrand: itemData.brand,
        motorModel: itemData.model,
        salePrice: saleData.salePrice,
        purchasePrice: itemData.purchasePrice,
        profit: saleData.salePrice - itemData.purchasePrice,
        commissionRate: saleData.commissionRate,
        agentCommission,
        companyShare,
        customerIdImageUrl: saleData.customerIdImageUrl || null, // صورة بطاقة العميل
        motorFingerprintImageUrl: itemData.motorFingerprintImageUrl || null, // صورة بصمة الموتور
        chassisNumberImageUrl: itemData.chassisNumberImageUrl || null, // صورة رقم الشاسيه
        combinedImageUrl: combinedImageUrl || null, // الصورة المجمعة
        status: 'pending_submission',
        stages: [{
          status: 'pending_submission',
          date: currentTime,
          updatedBy: agentId,
          notes: 'تم إنشاء سجل تتبع الوثائق'
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: agentId
      })

      // تحديث إجماليات الوكيل (استخدام المتغيرات الموجودة)
      if (agentDoc.exists()) {
        const currentAgentData = agentDoc.data()
        
        // منطق الحساب الجديد:
        // الوكيل لا يحصل على عمولة في رصيده، فقط يدين بنصيب الشركة
        // الرصيد = الرصيد الحالي - نصيب الشركة فقط
        const currentBalance = (currentAgentData.currentBalance || 0)
        const newBalance = currentBalance - companyShare
        
        await updateDoc(agentRef, {
          totalSales: (Number(currentAgentData.totalSales) || 0) + saleData.salePrice,
          totalCommission: (currentAgentData.totalCommission || 0) + agentCommission,
          currentBalance: newBalance,
          lastSaleAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        
        // إضافة معاملة مديونية فقط (بدون عمولة في الرصيد)
        console.log('📝 [AGENT PERMISSIONS] Adding debt transaction only...')
        const debtTransaction = {
          agentId,
          type: 'debt_increase' as const,
          amount: -companyShare, // مديونية نصيب الشركة فقط
          description: `مديونية نصيب المؤسسة - فاتورة رقم ${saleDoc.id.slice(-6)}`,
          saleId: saleDoc.id,
          saleAmount: saleData.salePrice,
          commission: agentCommission, // للمعلومات فقط، لا تؤثر على الرصيد
          companyShare: companyShare,
          createdAt: serverTimestamp(),
          createdBy: agentId
        }
        console.log('📝 [AGENT PERMISSIONS] Debt transaction data:', debtTransaction)
        await addDoc(collection(db, 'agent_transactions'), debtTransaction)
        console.log('✅ [AGENT PERMISSIONS] Debt transaction added successfully')
        
        console.log(`💰 [AGENT PERMISSIONS] Agent balance calculation: ${currentBalance} - ${companyShare} = ${newBalance}`)
        console.log(`📝 [AGENT PERMISSIONS] Added debt transaction only: -${companyShare} (company share from profit)`)
        console.log(`🚫 [AGENT PERMISSIONS] Agent commission (${agentCommission}) NOT added to balance as requested`)
        console.log(`🎯 [AGENT PERMISSIONS] Note: Agent gets commission separately, not in account balance`)
      }
      
      return { success: true, saleId: saleDoc.id }
      
    } catch (error) {
      console.error('Error creating agent sale:', error)
      return { success: false, error: 'فشل في إنشاء البيع' }
    }
  }
  
  // حساب إجماليات الوكيل
  static async getAgentSummary(agentId: string): Promise<{
    totalSales: number
    totalCommission: number
    totalDebt: number
    availableItems: number
    soldItems: number
  }> {
    try {
      const [sales, transactions, agentDoc] = await Promise.all([
        this.getAgentSales(agentId),
        this.getAgentTransactions(agentId),
        getDoc(doc(db, 'agents', agentId))
      ])
      
      const agentData = agentDoc.exists() ? agentDoc.data() : {}
      
      // حساب إجمالي المبيعات
      const totalSales = sales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0)
      
      // حساب إجمالي العمولات
      const totalCommission = transactions
        .filter(t => t.type === 'commission' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0)
      
      // حساب إجمالي المديونية
      const totalDebt = transactions
        .filter(t => t.type === 'debt' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0)
      
      // جلب عدد المنتجات المتاحة والمباعة
      const warehouseId = agentData.warehouseId
      const inventory = warehouseId ? await this.getAgentInventory(agentData.id, warehouseId) : []
      const availableItems = inventory.length
      const soldItems = sales.filter(s => s.status === 'completed').length
      
      return {
        totalSales,
        totalCommission,
        totalDebt,
        availableItems,
        soldItems
      }
      
    } catch (error) {
      console.error('Error getting agent summary:', error)
      return {
        totalSales: 0,
        totalCommission: 0,
        totalDebt: 0,
        availableItems: 0,
        soldItems: 0
      }
    }
  }
  
  // التحقق من صلاحية الوكيل للوصول لمورد معين
  static async canAgentAccess(
    userId: string, 
    resourceType: 'inventory' | 'sales' | 'transactions' | 'documents',
    resourceId?: string
  ): Promise<boolean> {
    try {
      const agentData = await this.getAgentData(userId)
      
      if (!agentData) {
        return false // ليس وكيل
      }
      
      switch (resourceType) {
        case 'inventory':
          // الوكيل يمكنه الوصول لمخزنه فقط
          if (resourceId) {
            const itemRef = doc(db, 'inventory_items', resourceId)
            const itemDoc = await getDoc(itemRef)
            
            if (itemDoc.exists()) {
              const itemData = itemDoc.data()
              return itemData.currentWarehouseId === agentData.warehouseId
            }
          }
          return true // يمكن الوصول لقائمة المخزون
          
        case 'sales':
          // الوكيل يمكنه الوصول لمبيعاته فقط
          if (resourceId) {
            const saleRef = doc(db, 'sales', resourceId)
            const saleDoc = await getDoc(saleRef)
            
            if (saleDoc.exists()) {
              const saleData = saleDoc.data()
              return saleData.agentId === agentData.id
            }
          }
          return true // يمكن الوصول لقائمة المبيعات
          
        case 'transactions':
          // الوكيل يمكنه الوصول لمعاملاته فقط
          if (resourceId) {
            const transactionRef = doc(db, 'agent_transactions', resourceId)
            const transactionDoc = await getDoc(transactionRef)
            
            if (transactionDoc.exists()) {
              const transactionData = transactionDoc.data()
              return transactionData.agentId === agentData.id
            }
          }
          return true // يمكن الوصول لقائمة المعاملات
          
        case 'documents':
          // الوكيل يمكنه الوصول لوثائق مبيعاته فقط
          if (resourceId) {
            const docRef = doc(db, 'document_tracking', resourceId)
            const docDoc = await getDoc(docRef)
            
            if (docDoc.exists()) {
              const docData = docDoc.data()
              // التحقق من أن الوثيقة مرتبطة ببيع للوكيل
              if (docData.saleId) {
                const saleRef = doc(db, 'sales', docData.saleId)
                const saleDoc = await getDoc(saleRef)
                
                if (saleDoc.exists()) {
                  const saleData = saleDoc.data()
                  return saleData.agentId === agentData.id
                }
              }
            }
          }
          return true // يمكن الوصول لقائمة الوثائق
          
        default:
          return false
      }
      
    } catch (error) {
      console.error('Error checking agent access:', error)
      return false
    }
  }
}

// Hook للاستخدام في المكونات
export function useAgentPermissions() {
  const checkAgentAccess = async (
    userId: string,
    resourceType: 'inventory' | 'sales' | 'transactions' | 'documents',
    resourceId?: string
  ) => {
    return await AgentPermissionsService.canAgentAccess(userId, resourceType, resourceId)
  }
  
  const getAgentData = async (userId: string) => {
    return await AgentPermissionsService.getAgentData(userId)
  }

  const getAgentById = async (agentId: string) => {
    return await AgentPermissionsService.getAgentById(agentId)
  }
  
  const getAgentInventory = async (agentId: string, warehouseId: string) => {
    return await AgentPermissionsService.getAgentInventory(agentId, warehouseId)
  }
  
  const getAgentSales = async (agentId: string) => {
    return await AgentPermissionsService.getAgentSales(agentId)
  }
  
  const getAgentTransactions = async (agentId: string) => {
    return await AgentPermissionsService.getAgentTransactions(agentId)
  }
  
  const getAgentSummary = async (agentId: string) => {
    return await AgentPermissionsService.getAgentSummary(agentId)
  }
  
  const createAgentSale = async (agentId: string, warehouseId: string, saleData: any) => {
    return await AgentPermissionsService.createAgentSale(agentId, warehouseId, saleData)
  }
  
  return {
    checkAgentAccess,
    getAgentData,
    getAgentById,
    getAgentInventory,
    getAgentSales,
    getAgentTransactions,
    getAgentSummary,
    createAgentSale
  }
}

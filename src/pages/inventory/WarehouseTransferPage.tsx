import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { 
  ArrowRightLeft, 
  ArrowLeft,
  Package,
  Search
} from 'lucide-react'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUserData } from '@/hooks/useUserData'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { notificationSystem } from '@/lib/notificationSystem'
import { Warehouse, InventoryItem } from '@/types'
import { generateTransactionId, getErrorMessage } from '@/lib/utils'

interface TransferFormData {
  fromWarehouseId: string
  toWarehouseId: string
  notes?: string
}


export function WarehouseTransferPage() {
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([])
  const [itemCommissions, setItemCommissions] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedToWarehouse, setSelectedToWarehouse] = useState<Warehouse | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<TransferFormData>()

  const fromWarehouseId = watch('fromWarehouseId')
  const toWarehouseId = watch('toWarehouseId')

  useEffect(() => {
    loadWarehouses()
  }, [])

  useEffect(() => {
    if (fromWarehouseId) {
      loadInventoryItems(fromWarehouseId)
    }
  }, [fromWarehouseId])

  const loadWarehouses = async () => {
    try {
      // Load real warehouses from Firebase
      const warehousesQuery = query(
        collection(db, 'warehouses'),
        where('isActive', '==', true)
      )
      
      const warehousesSnapshot = await getDocs(warehousesQuery)
      const warehousesData = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Warehouse[]
      
      setWarehouses(warehousesData)
    } catch (error) {
      console.error('Error loading warehouses:', error)
      toast.error('خطأ في تحميل المخازن')
    }
  }

  const loadInventoryItems = async (warehouseId: string) => {
    try {
      const inventoryQuery = query(
        collection(db, 'inventory_items'),
        where('currentWarehouseId', '==', warehouseId),
        where('status', '==', 'available')
      )
      const snapshot = await getDocs(inventoryQuery)
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[]
      
      setInventoryItems(items)
    } catch (error) {
      console.error('Error loading inventory items:', error)
      toast.error('خطأ في تحميل الأصناف')
    }
  }

  const filteredItems = inventoryItems.filter(item => 
    item.motorFingerprint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.chassisNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addItemToSelection = (item: InventoryItem) => {
    if (!selectedItems.find(selected => selected.id === item.id)) {
      setSelectedItems(prev => [...prev, item])
      setItemCommissions(prev => ({ ...prev, [item.id]: 10 })) // Default 10% commission
    }
  }

  const removeItemFromSelection = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId))
    setItemCommissions(prev => {
      const newCommissions = { ...prev }
      delete newCommissions[itemId]
      return newCommissions
    })
  }

  const updateItemCommission = (itemId: string, commission: number) => {
    setItemCommissions(prev => ({ ...prev, [itemId]: commission }))
  }

  const updateAgentDebt = async (agentId: string, amount: number, operation: 'increase' | 'decrease', description: string) => {
    try {
      console.log('updateAgentDebt called:', { agentId, amount, operation, description })
      
      // Ensure amount is a valid number
      let amountNumber = Number(amount);
      
      // Ensure it's a valid number
      if (isNaN(amountNumber)) {
        console.error('Invalid amount:', amount)
        throw new Error('قيمة المبلغ غير صالحة')
      }
      
      // Round to 2 decimal places to avoid floating point issues
      amountNumber = Math.round(amountNumber * 100) / 100;
      
      // Get agent details
      const agentDoc = await getDoc(doc(db, 'agents', agentId))
      if (!agentDoc.exists()) {
        console.error('Agent not found:', agentId)
        throw new Error('الوكيل غير موجود')
      }

      const agentData = agentDoc.data()
      const currentBalance = Number(agentData.currentBalance) || 0
      console.log('Current agent balance:', currentBalance)
      
      // Calculate new balance
      // Positive balance = agent has credit (company owes agent)  
      // Negative balance = agent has debt (agent owes company)
      let newBalance: number
      if (operation === 'increase') {
        // Increase debt = agent owes more to company = make balance more negative
        newBalance = currentBalance - amountNumber
      } else {
        // Decrease debt = agent owes less to company = make balance less negative (more positive)
        newBalance = currentBalance + amountNumber
      }
      
      console.log('Balance calculation:', {
        currentBalance,
        amountNumber,
        operation,
        calculatedNewBalance: newBalance
      })
      
      // Round to 2 decimal places to avoid floating point issues
      newBalance = Math.round(newBalance * 100) / 100;
      
      console.log('New agent balance:', newBalance)

      // Update agent balance
      await updateDoc(doc(db, 'agents', agentId), {
        currentBalance: newBalance,
        updatedAt: serverTimestamp()
      })
      console.log('Agent balance updated successfully')

      // Create transaction record
      const transactionId = generateTransactionId('agent_debt')
      const transactionData = {
        transactionId,
        agentId,
        type: operation === 'increase' ? 'debt_increase' : 'debt_decrease',
        amount: operation === 'increase' ? -amountNumber : amountNumber, // Negative for debt increase
        description,
        previousBalance: currentBalance,
        newBalance,
        createdBy: userData?.id || 'system',
        createdAt: serverTimestamp()
      }
      
      console.log('Creating agent transaction:', transactionData)
      await addDoc(collection(db, 'agent_transactions'), transactionData)
      console.log('Agent transaction created successfully')
      
    } catch (error) {
      console.error('Error updating agent debt:', error)
      throw error
    }
  }

  const onSubmit = async (data: TransferFormData) => {
    if (!userData) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    if (selectedItems.length === 0) {
      toast.error('يرجى اختيار صنف واحد على الأقل للتحويل')
      return
    }

    if (data.fromWarehouseId === data.toWarehouseId) {
      toast.error('لا يمكن التحويل إلى نفس المخزن')
      return
    }

    try {
      setLoading(true)
      
      // Get source and target warehouse details
      const sourceWarehouse = warehouses.find(w => w.id === data.fromWarehouseId)
      const targetWarehouse = warehouses.find(w => w.id === data.toWarehouseId)
      const isTransferringToAgent = targetWarehouse?.agentId
      const isTransferringFromAgent = sourceWarehouse?.agentId
      
      let totalDebtChange = 0

      // Process each selected item
      for (const item of selectedItems) {
        const commissionPercentage = itemCommissions[item.id] || 0
        const itemPrice = Number(item.purchasePrice) || 0
        totalDebtChange += itemPrice
        
        console.log('Processing item:', {
          itemId: item.id,
          purchasePrice: item.purchasePrice,
          itemPrice,
          totalDebtChange
        })
        
        // Generate transaction ID
        const transactionId = generateTransactionId('warehouse_transfer')
        
        // Create transfer record with commission percentage (not amount)
        const transferData = {
          transactionId,
          fromWarehouseId: data.fromWarehouseId,
          toWarehouseId: data.toWarehouseId,
          inventoryItemId: item.id,
          motorFingerprint: item.motorFingerprint,
          chassisNumber: item.chassisNumber,
          brand: item.brand,
          model: item.model,
          purchasePrice: item.purchasePrice,
          agentCommissionPercentage: isTransferringToAgent ? commissionPercentage : 0,
          notes: data.notes || '',
          transferredBy: userData.id,
          transferredAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }
        
        await addDoc(collection(db, 'warehouse_transfers'), transferData)
        console.log('Transfer record created for item:', item.id)
        
        // Update inventory item warehouse and commission percentage
        const updateData: any = {
          currentWarehouseId: data.toWarehouseId,
          warehouseName: targetWarehouse?.name || 'غير محدد',
          updatedAt: serverTimestamp()
        }
        
        // If transferring to agent warehouse, save commission percentage
        if (isTransferringToAgent) {
          updateData.agentCommissionPercentage = commissionPercentage
        }
        
        console.log('Updating inventory item:', item.id, 'with data:', updateData)
        await updateDoc(doc(db, 'inventory_items', item.id), updateData)
        console.log('Inventory item updated successfully')
      }

      // Update agent balance (debt) based on transfer direction
      console.log('Transfer direction check:', {
        isTransferringToAgent,
        isTransferringFromAgent,
        targetWarehouseAgentId: targetWarehouse?.agentId,
        sourceWarehouseAgentId: sourceWarehouse?.agentId,
        totalDebtChange
      })
      
      // Handle debt updates for both agents if transferring between agent warehouses
      if (isTransferringFromAgent && isTransferringToAgent && sourceWarehouse?.agentId && targetWarehouse?.agentId) {
        // Transfer between two agents
        console.log('Transferring between agents - updating both debts')
        
        // Decrease debt for source agent (they gave items)
        await updateAgentDebt(sourceWarehouse.agentId, totalDebtChange, 'decrease', `تحويل ${selectedItems.length} موتوسيكل للوكيل ${targetWarehouse.name}`)
        
        // Increase debt for target agent (they received items)
        await updateAgentDebt(targetWarehouse.agentId, totalDebtChange, 'increase', `استلام ${selectedItems.length} موتوسيكل من الوكيل ${sourceWarehouse.name}`)
        
        toast.success(`تم تحويل ${selectedItems.length} صنف بين الوكلاء وتحديث المديونيات`)
      } else if (isTransferringToAgent && targetWarehouse?.agentId && !sourceWarehouse?.agentId) {
        // Transferring TO agent from main warehouse - INCREASE debt (agent owes more to company)
        console.log('Updating agent debt - increase for agent:', targetWarehouse.agentId, 'amount:', totalDebtChange)
        await updateAgentDebt(targetWarehouse.agentId, totalDebtChange, 'increase', `استلام ${selectedItems.length} موتوسيكل من الشركة`)
        console.log('Agent debt updated successfully')
        toast.success(`تم تحويل ${selectedItems.length} صنف للوكيل وإضافة ${Math.round(totalDebtChange).toLocaleString()} جنيه للمديونية`)
      } else if (isTransferringFromAgent && sourceWarehouse?.agentId && !targetWarehouse?.agentId) {
        // Transferring FROM agent to main warehouse - DECREASE debt (agent owes less to company)
        console.log('Updating agent debt - decrease for agent:', sourceWarehouse.agentId)
        await updateAgentDebt(sourceWarehouse.agentId, totalDebtChange, 'decrease', `سحب ${selectedItems.length} موتوسيكل من الوكيل`)
        toast.success(`تم سحب ${selectedItems.length} صنف من الوكيل وتقليل المديونية بـ ${Math.round(totalDebtChange).toLocaleString()} جنيه`)
      } else {
        console.log('No agent debt update needed - transfer between main warehouses')
        toast.success(`تم تحويل ${selectedItems.length} صنف بنجاح`)
      }
      
      // Reset form
      setSelectedItems([])
      setItemCommissions({})
      setValue('fromWarehouseId', '')
      setValue('toWarehouseId', '')
      setValue('notes', '')
      setSelectedToWarehouse(null)
    } catch (error) {
      console.error('Error transferring items:', error)
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">تحويل بين المخازن</h1>
          <p className="text-gray-600 arabic-text">نقل الأصناف بين المخازن المختلفة</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للمخزون
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Warehouse Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              اختيار المخازن
            </CardTitle>
            <CardDescription>
              اختر المخزن المصدر والمخزن الهدف للتحويل
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Warehouse */}
              <div className="space-y-2">
                <Label htmlFor="fromWarehouseId" required>من المخزن</Label>
                <select
                  {...register('fromWarehouseId', { required: 'المخزن المصدر مطلوب' })}
                  className="form-input w-full input-rtl arabic-text"
                  id="fromWarehouseId"
                >
                  <option value="">اختر المخزن المصدر</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                {errors.fromWarehouseId && (
                  <p className="text-sm text-destructive arabic-text">{errors.fromWarehouseId.message}</p>
                )}
              </div>

              {/* To Warehouse */}
              <div className="space-y-2">
                <Label htmlFor="toWarehouseId" required>إلى المخزن</Label>
                <select
                  {...register('toWarehouseId', { required: 'المخزن الهدف مطلوب' })}
                  className="form-input w-full input-rtl arabic-text"
                  id="toWarehouseId"
                  onChange={(e) => {
                    const warehouseId = e.target.value
                    const warehouse = warehouses.find(w => w.id === warehouseId)
                    setSelectedToWarehouse(warehouse || null)
                  }}
                >
                  <option value="">اختر المخزن الهدف</option>
                  {warehouses
                    .filter(w => w.id !== fromWarehouseId)
                    .map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} {warehouse.agentId ? '(مخزن وكيل)' : ''}
                    </option>
                  ))}
                </select>
                {errors.toWarehouseId && (
                  <p className="text-sm text-destructive arabic-text">{errors.toWarehouseId.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Item Selection */}
        {fromWarehouseId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                اختيار الأصناف ({selectedItems.length} محدد)
              </CardTitle>
              <CardDescription>
                اختر الأصناف المراد تحويلها من المخزن المصدر
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث بالبصمة أو الشاسيه أو الماركة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Items List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {inventoryItems.length === 0 ? 'لا توجد أصناف في هذا المخزن' : 'لا توجد نتائج للبحث'}
                  </div>
                ) : (
                  filteredItems.map(item => {
                    const isSelected = selectedItems.find(selected => selected.id === item.id)
                    return (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            removeItemFromSelection(item.id)
                          } else {
                            addItemToSelection(item)
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium arabic-text">{item.brand} {item.model}</h4>
                            <p className="text-sm text-gray-600 arabic-text">
                              اللون: {item.color} | سنة الصنع: {item.manufacturingYear}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              بصمة الموتور: {item.motorFingerprint}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              رقم الشاسيه: {item.chassisNumber}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-medium text-green-600">
                                {item.salePrice ? `${Math.round(item.salePrice).toLocaleString()} جنيه` : 'غير محدد'}
                              </p>
                            </div>
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <span className="text-white text-sm">✓</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {selectedItems.length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 arabic-text">
                    <strong>مطلوب:</strong> يجب اختيار صنف واحد على الأقل للتحويل
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Items with Commission */}
        {selectedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>الأصناف المحددة ونسبة عمولة الوكيل</CardTitle>
              <CardDescription>
                {selectedToWarehouse?.agentId 
                  ? 'حدد نسبة عمولة الوكيل من الربح لكل صنف (سيتم الحساب عند البيع الفعلي)'
                  : 'الأصناف المحددة للتحويل'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedItems.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium arabic-text">{item.brand} {item.model}</h4>
                      <p className="text-sm text-gray-600 arabic-text">
                        بصمة الموتور: {item.motorFingerprint}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-1">
                        <span>سعر الشراء: {Math.round(item.purchasePrice).toLocaleString()} جنيه</span>
                        <span>سعر البيع المتوقع: {item.salePrice ? Math.round(item.salePrice).toLocaleString() : 'غير محدد'} جنيه</span>
                      </div>
                      {item.salePrice && (
                        <div className="text-xs text-blue-600 mt-1">
                          الربح المتوقع: {Math.round(item.salePrice - item.purchasePrice).toLocaleString()} جنيه
                        </div>
                      )}
                    </div>
                    
                    {selectedToWarehouse?.agentId && (
                      <div className="w-48">
                        <Label className="text-sm">نسبة العمولة من الربح (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={itemCommissions[item.id] || 10}
                          onChange={(e) => updateItemCommission(item.id, Number(e.target.value))}
                          className="input-rtl"
                          placeholder="10"
                        />
                        {item.salePrice && itemCommissions[item.id] > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            عمولة متوقعة: {Math.round(((item.salePrice - item.purchasePrice) * itemCommissions[item.id]) / 100).toLocaleString()} جنيه
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeItemFromSelection(item.id)}
                    >
                      إزالة
                    </Button>
                  </div>
                </div>
              ))}
              
              {selectedToWarehouse?.agentId && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    💡 <strong>ملاحظة:</strong> العمولة ستحسب عند البيع الفعلي بناءً على سعر البيع النهائي والنسبة المحددة
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    متوسط نسبة العمولة: {selectedItems.length > 0 ? (Object.values(itemCommissions).reduce((sum, commission) => sum + commission, 0) / selectedItems.length).toFixed(1) : 0}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {selectedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات التحويل</CardTitle>
              <CardDescription>معلومات إضافية عن عملية التحويل (اختياري)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">الملاحظات</Label>
                <textarea
                  {...register('notes')}
                  id="notes"
                  rows={3}
                  className="form-input w-full input-rtl arabic-text"
                  placeholder="أضف أي ملاحظات حول عملية التحويل..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/inventory')}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={selectedItems.length === 0 || !fromWarehouseId || !toWarehouseId || isSubmitting}
          >
            <ArrowRightLeft className="ml-2 h-4 w-4" />
            تحويل {selectedItems.length > 0 ? `${selectedItems.length} صنف` : 'الأصناف'}
          </Button>
        </div>
      </form>
    </div>
  )
}

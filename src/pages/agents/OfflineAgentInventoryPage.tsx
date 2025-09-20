import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Package, 
  ArrowRightLeft,
  Eye,
  Search
} from 'lucide-react'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore'
import { useAuthState } from 'react-firebase-hooks/auth'
import { toast } from 'sonner'

import { db, auth } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { Agent, InventoryItem } from '@/types'
import { formatCurrency, isAdmin, isSuperAdmin } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function OfflineAgentInventoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [transferring, setTransferring] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (userData && id) {
      loadData()
    }
  }, [userData, id])

  const loadData = async () => {
    if (!id) return

    try {
      setLoading(true)

      // Load agent data
      const agentDoc = await getDoc(doc(db, 'agents', id))
      if (!agentDoc.exists()) {
        toast.error('لم يتم العثور على الوكيل')
        navigate('/agents/offline')
        return
      }

      const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent
      setAgent(agentData)

      // Load agent's inventory
      const inventoryQuery = query(
        collection(db, 'inventory_items'),
        where('currentWarehouseId', '==', agentData.warehouseId)
      )
      
      const inventorySnapshot = await getDocs(inventoryQuery)
      const inventoryData = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[]
      
      setInventory(inventoryData)

      // Load available items from main warehouse for transfer
      const availableQuery = query(
        collection(db, 'inventory_items'),
        where('status', '==', 'available'),
        where('currentWarehouseId', 'in', ['main_warehouse', 'showroom_warehouse'])
      )
      
      const availableSnapshot = await getDocs(availableQuery)
      const availableData = availableSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[]
      
      setAvailableItems(availableData)

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleTransferItems = async () => {
    if (!agent || !userData || selectedItems.length === 0) return

    try {
      setTransferring(true)

      // Create transfer transaction
      const transferData = {
        type: 'warehouse_transfer',
        date: serverTimestamp(),
        userId: userData.id,
        referenceNumber: `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
        fromWarehouseId: 'main_warehouse',
        toWarehouseId: agent.warehouseId,
        totalAmount: 0,
        items: selectedItems.map(itemId => {
          const item = availableItems.find(i => i.id === itemId)!
          return {
            inventoryItemId: itemId,
            motorFingerprint: item.motorFingerprint,
            chassisNumber: item.chassisNumber,
            transferPrice: item.purchasePrice
          }
        }),
        details: {
          agentId: agent.id,
          notes: `تحويل ${selectedItems.length} موتوسيكل للوكيل الأوفلاين ${agent.name}`
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await addDoc(collection(db, 'transactions'), transferData)

      // Update inventory items warehouse
      for (const itemId of selectedItems) {
        await updateDoc(doc(db, 'inventory_items', itemId), {
          currentWarehouseId: agent.warehouseId,
          status: 'transferred',
          updatedAt: serverTimestamp()
        })
      }

      // Create agent invoice for transferred items
      const totalAmount = selectedItems.reduce((sum, itemId) => {
        const item = availableItems.find(i => i.id === itemId)!
        return sum + item.purchasePrice
      }, 0)

      const agentInvoiceData = {
        agentId: agent.id,
        type: 'agent_invoice',
        amount: totalAmount,
        description: `فاتورة بضاعة - تحويل ${selectedItems.length} موتوسيكل`,
        items: selectedItems.map(itemId => {
          const item = availableItems.find(i => i.id === itemId)!
          return {
            inventoryItemId: itemId,
            motorFingerprint: item.motorFingerprint,
            chassisNumber: item.chassisNumber,
            purchasePrice: item.purchasePrice
          }
        }),
        createdAt: serverTimestamp(),
        createdBy: userData.id
      }

      await addDoc(collection(db, 'agent_transactions'), agentInvoiceData)

      // Update agent balance (increase debt)
      const newBalance = agent.currentBalance - totalAmount
      await updateDoc(doc(db, 'agents', agent.id), {
        currentBalance: newBalance,
        updatedAt: serverTimestamp()
      })

      toast.success(`تم تحويل ${selectedItems.length} موتوسيكل بنجاح`)
      setSelectedItems([])
      setShowTransferModal(false)
      await loadData()

    } catch (error) {
      console.error('Error transferring items:', error)
      toast.error('فشل في تحويل الأصناف')
    } finally {
      setTransferring(false)
    }
  }

  const canManageAgents = userData && (isSuperAdmin(userData.role) || isAdmin(userData.role))

  if (!canManageAgents) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">غير مصرح</h3>
            <p className="text-red-700">هذه الشاشة مخصصة للمديرين فقط</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="جاري تحميل البيانات..." />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">لم يتم العثور على الوكيل</h3>
          <Button onClick={() => navigate('/agents/offline')}>
            العودة للوكلاء الأوفلاين
          </Button>
        </div>
      </div>
    )
  }

  const filteredInventory = inventory.filter(item =>
    item.motorFingerprint.toLowerCase().includes(search.toLowerCase()) ||
    item.chassisNumber.toLowerCase().includes(search.toLowerCase()) ||
    item.brand.toLowerCase().includes(search.toLowerCase()) ||
    item.model.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/agents/offline')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 arabic-text">
              مخزون الوكيل الأوفلاين
            </h1>
            <p className="text-gray-600 arabic-text">
              الوكيل: {agent.name} | المخزون: {inventory.length} صنف
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="ml-2 h-4 w-4" />
            تحويل أصناف
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">إجمالي الأصناف</p>
                <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">متاح للبيع</p>
                <p className="text-2xl font-bold text-green-600">
                  {inventory.filter(item => item.status === 'available').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Package className="h-6 w-6 text-red-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">مباع</p>
                <p className="text-2xl font-bold text-red-600">
                  {inventory.filter(item => item.status === 'sold').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 arabic-text">القيمة الإجمالية</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(inventory.reduce((sum, item) => sum + item.purchasePrice, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث في المخزون..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Display */}
      {filteredInventory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
              لا توجد أصناف في المخزن
            </h3>
            <p className="text-gray-500 arabic-text">
              استخدم زر "تحويل أصناف" لإضافة أصناف لمخزن الوكيل
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInventory.map((item) => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          availableItems={availableItems}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          onTransfer={handleTransferItems}
          onCancel={() => setShowTransferModal(false)}
          transferring={transferring}
        />
      )}
    </div>
  )
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'sold': return 'bg-red-100 text-red-800'
      case 'transferred': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'متاح'
      case 'sold': return 'مباع'
      case 'transferred': return 'محول'
      default: return status
    }
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-900 arabic-text">
              {item.brand} {item.model}
            </h3>
            <p className="text-sm text-gray-600 arabic-text">
              {item.color} - {item.manufacturingYear}
            </p>
          </div>

          <div className="space-y-1 text-xs">
            <p className="text-gray-600">
              <span className="font-medium">بصمة الموتور:</span> {item.motorFingerprint}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">رقم الشاسيه:</span> {item.chassisNumber}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(item.purchasePrice)}
            </span>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(item.status))}>
              {getStatusLabel(item.status)}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
              التفاصيل
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TransferModal({ 
  availableItems, 
  selectedItems, 
  setSelectedItems, 
  onTransfer, 
  onCancel, 
  transferring 
}: {
  availableItems: InventoryItem[]
  selectedItems: string[]
  setSelectedItems: (items: string[]) => void
  onTransfer: () => void
  onCancel: () => void
  transferring: boolean
}) {
  const [search, setSearch] = useState('')

  const filteredItems = availableItems.filter(item =>
    item.motorFingerprint.toLowerCase().includes(search.toLowerCase()) ||
    item.chassisNumber.toLowerCase().includes(search.toLowerCase()) ||
    item.brand.toLowerCase().includes(search.toLowerCase()) ||
    item.model.toLowerCase().includes(search.toLowerCase())
  )

  const toggleItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId))
    } else {
      setSelectedItems([...selectedItems, itemId])
    }
  }

  const totalValue = selectedItems.reduce((sum, itemId) => {
    const item = availableItems.find(i => i.id === itemId)
    return sum + (item?.purchasePrice || 0)
  }, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 arabic-text">
            تحويل أصناف للوكيل الأوفلاين
          </h3>
          <Button variant="ghost" onClick={onCancel}>×</Button>
        </div>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث في الأصناف المتاحة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected items summary */}
          {selectedItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 arabic-text">
                تم اختيار {selectedItems.length} صنف بقيمة إجمالية {formatCurrency(totalValue)}
              </p>
            </div>
          )}

          {/* Items list */}
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 arabic-text">
                لا توجد أصناف متاحة للتحويل
              </div>
            ) : (
              <div className="divide-y">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 cursor-pointer hover:bg-gray-50',
                      selectedItems.includes(item.id) && 'bg-blue-50 border-blue-200'
                    )}
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 arabic-text">
                          {item.brand} {item.model}
                        </h4>
                        <p className="text-sm text-gray-600">
                          بصمة الموتور: {item.motorFingerprint}
                        </p>
                        <p className="text-sm text-gray-600">
                          رقم الشاسيه: {item.chassisNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(item.purchasePrice)}
                        </p>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onCancel}>إلغاء</Button>
            <Button
              onClick={onTransfer}
              disabled={selectedItems.length === 0 || transferring}
            >
              {transferring ? (
                <>
                  <LoadingSpinner />
                  جاري التحويل...
                </>
              ) : (
                `تحويل ${selectedItems.length} صنف`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

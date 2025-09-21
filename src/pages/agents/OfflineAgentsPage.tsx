import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase-config.template'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from '@/lib/utils'

// Badge component inline
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
import { 
  Users, 
  Plus, 
  Search, 
  Package, 
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface OfflineAgent {
  id: string
  name: string
  phone: string
  address: string
  isActive: boolean
  totalSales: number
  totalCommission: number
  currentBalance: number
  lastSaleAt?: any
  createdAt: any
}

export function OfflineAgentsPage() {
  const [agents, setAgents] = useState<OfflineAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadOfflineAgents()
  }, [])

  const loadOfflineAgents = async () => {
    try {
      setLoading(true)
      
      // Load offline agents (agents without userId)
      const agentsQuery = query(
        collection(db, 'agents'),
        where('userId', '==', null)
      )
      
      const agentsSnapshot = await getDocs(agentsQuery)
      const agentsData = agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OfflineAgent[]

      setAgents(agentsData)
    } catch (error) {
      console.error('Error loading offline agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.phone.includes(searchTerm) ||
    agent.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeAgents = agents.filter(agent => agent.isActive).length
  const totalSales = agents.reduce((sum, agent) => sum + (agent.totalSales || 0), 0)
  const totalCommissions = agents.reduce((sum, agent) => sum + (agent.totalCommission || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 arabic-text">جاري تحميل الوكلاء غير المتصلين...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 arabic-text">الوكلاء غير المتصلين</h1>
          <p className="text-gray-600 arabic-text">إدارة الوكلاء الذين لا يملكون حسابات مستخدمين</p>
        </div>
        <Link to="/agents/create-offline">
          <Button className="arabic-text">
            <Plus className="h-4 w-4 ml-2" />
            إضافة وكيل جديد
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-gray-600 arabic-text">إجمالي الوكلاء</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold">{activeAgents}</p>
                <p className="text-gray-600 arabic-text">الوكلاء النشطون</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-purple-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
                <p className="text-gray-600 arabic-text">إجمالي المبيعات</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-orange-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold">{formatCurrency(totalCommissions)}</p>
                <p className="text-gray-600 arabic-text">إجمالي العمولات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث بالاسم أو الهاتف أو العنوان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 arabic-text"
            />
          </div>
        </CardContent>
      </Card>

      {/* Agents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2 arabic-text">
                  لا توجد وكلاء غير متصلين
                </h3>
                <p className="text-gray-600 arabic-text">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لم يتم إنشاء أي وكلاء غير متصلين بعد'}
                </p>
                {!searchTerm && (
                  <Link to="/agents/create-offline" className="inline-block mt-4">
                    <Button className="arabic-text">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة وكيل جديد
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="arabic-text">{agent.name}</CardTitle>
                    <p className="text-gray-600 arabic-text">{agent.phone}</p>
                  </div>
                  <Badge variant={agent.isActive ? "default" : "secondary"}>
                    {agent.isActive ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 arabic-text">العنوان:</p>
                    <p className="font-medium arabic-text">{agent.address}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 arabic-text">إجمالي المبيعات:</p>
                      <p className="font-bold text-green-600">{formatCurrency(agent.totalSales || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 arabic-text">الرصيد الحالي:</p>
                      <p className={`font-bold ${agent.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(agent.currentBalance || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Link to={`/agents/offline-inventory/${agent.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full arabic-text">
                        <Package className="h-4 w-4 ml-1" />
                        المخزون
                      </Button>
                    </Link>
                    <Link to={`/agents/offline-sales/${agent.id}`} className="flex-1">
                      <Button size="sm" className="w-full arabic-text">
                        <ShoppingCart className="h-4 w-4 ml-1" />
                        المبيعات
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

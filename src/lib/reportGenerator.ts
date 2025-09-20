import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'

interface ReportFilters {
  dateFrom: string
  dateTo: string
  reportType: 'sales' | 'inventory' | 'agents' | 'documents' | 'financial'
}

interface ReportData {
  sales: {
    totalSales: number
    totalAmount: number
    totalCommissions: number
    averageOrderValue: number
    topAgent: string
  }
  inventory: {
    totalItems: number
    soldItems: number
    availableItems: number
    totalValue: number
    lowStockItems: number
  }
  agents: {
    totalAgents: number
    activeAgents: number
    totalCommissions: number
    totalDebt: number
  }
  documents: {
    totalDocuments: number
    pendingDocuments: number
    completedDocuments: number
    averageProcessingTime: number
    overdueDocuments: number
  }
}

export async function generateRealTimeReport(filters: ReportFilters): Promise<ReportData> {
  try {
    const startDate = Timestamp.fromDate(new Date(filters.dateFrom))
    const endDate = Timestamp.fromDate(new Date(filters.dateTo + 'T23:59:59'))

    // Get sales data
    const salesData = await getSalesReport(startDate, endDate)
    
    // Get inventory data
    const inventoryData = await getInventoryReport()
    
    // Get agents data
    const agentsData = await getAgentsReport()
    
    // Get documents data
    const documentsData = await getDocumentsReport(startDate, endDate)

    return {
      sales: salesData,
      inventory: inventoryData,
      agents: agentsData,
      documents: documentsData
    }
  } catch (error) {
    console.error('Error generating real-time report:', error)
    
    // Return empty data structure if Firebase queries fail
    return {
      sales: {
        totalSales: 0,
        totalAmount: 0,
        totalCommissions: 0,
        averageOrderValue: 0,
        topAgent: 'لا يوجد بيانات'
      },
      inventory: {
        totalItems: 0,
        soldItems: 0,
        availableItems: 0,
        totalValue: 0,
        lowStockItems: 0
      },
      agents: {
        totalAgents: 0,
        activeAgents: 0,
        totalCommissions: 0,
        totalDebt: 0
      },
      documents: {
        totalDocuments: 0,
        pendingDocuments: 0,
        completedDocuments: 0,
        averageProcessingTime: 0,
        overdueDocuments: 0
      }
    }
  }
}

async function getSalesReport(startDate: Timestamp, endDate: Timestamp) {
  try {
    console.log('🔍 Fetching sales data from multiple sources...')
    
    // Get sales data from document_tracking
    const documentTrackingQuery = query(
      collection(db, 'document_tracking'),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    )
    
    // Get sales data from sales collection
    const salesQuery = query(
      collection(db, 'sales'),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    )
    
    // Get all sales data
    const [documentTrackingSnapshot, salesSnapshot] = await Promise.all([
      getDocs(documentTrackingQuery),
      getDocs(salesQuery)
    ])
    
    const documentTrackingSales = documentTrackingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const directSales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Combine all sales
    const allSales = [...documentTrackingSales, ...directSales]
    console.log('📊 Found sales:', documentTrackingSales.length, 'from document_tracking,', directSales.length, 'from sales')
    
    const sales = allSales
    
    console.log('🔍 [DEBUG] Sales report - found', sales.length, 'sales')
    if (sales.length > 0) {
      console.log('🔍 [DEBUG] First sale record:', sales[0])
      console.log('🔍 [DEBUG] Available fields:', Object.keys(sales[0]))
    }
    
    const totalSales = sales.length
    const totalAmount = sales.reduce((sum, sale: any) => {
      // Try multiple field names for sale price
      let amount = 0
      if (sale.salePrice) {
        amount = typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) || 0 : (sale.salePrice || 0)
      } else if (sale.totalAmount) {
        amount = typeof sale.totalAmount === 'string' ? parseFloat(sale.totalAmount) || 0 : (sale.totalAmount || 0)
      } else if (sale.amount) {
        amount = typeof sale.amount === 'string' ? parseFloat(sale.amount) || 0 : (sale.amount || 0)
      } else if (sale.price) {
        amount = typeof sale.price === 'string' ? parseFloat(sale.price) || 0 : (sale.price || 0)
      }
      
      if (amount > 0) {
        console.log('💰 [DEBUG] Found sale amount:', amount)
      }
      
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
    
    console.log('💰 [DEBUG] Total sales amount:', totalAmount)
    const totalCommissions = sales.reduce((sum, sale: any) => {
      // Calculate commission from document_tracking data
      const salePrice = typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) : (sale.salePrice || 0)
      const commissionPercentage = typeof sale.agentCommissionPercentage === 'string' ? parseFloat(sale.agentCommissionPercentage) : (sale.agentCommissionPercentage || 10)
      const commission = (isNaN(salePrice) ? 0 : salePrice) * (isNaN(commissionPercentage) ? 10 : commissionPercentage) / 100
      return sum + commission
    }, 0)
    
    const averageOrderValue = totalSales > 0 ? totalAmount / totalSales : 0
    
    // Find top agent by sales count
    const agentSales: { [key: string]: number } = {}
    sales.forEach((sale: any) => {
      if (sale.agentId) {
        agentSales[sale.agentId] = (agentSales[sale.agentId] || 0) + 1
      }
    })
    
    const topAgentId = Object.keys(agentSales).reduce((a, b) => 
      agentSales[a] > agentSales[b] ? a : b, 'لا يوجد'
    )
    
    // Get agent name
    let topAgent = 'لا يوجد بيانات'
    if (topAgentId !== 'لا يوجد') {
      try {
        const agentQuery = query(collection(db, 'agents'), where('__name__', '==', topAgentId))
        const agentSnapshot = await getDocs(agentQuery)
        if (!agentSnapshot.empty) {
          topAgent = agentSnapshot.docs[0].data().name || 'غير محدد'
        }
      } catch (error) {
        console.error('Error fetching agent name:', error)
      }
    }
    
    return {
      totalSales,
      totalAmount,
      totalCommissions,
      averageOrderValue,
      topAgent
    }
  } catch (error) {
    console.error('Error getting sales report:', error)
    return {
      totalSales: 0,
      totalAmount: 0,
      totalCommissions: 0,
      averageOrderValue: 0,
      topAgent: 'خطأ في البيانات'
    }
  }
}

async function getInventoryReport() {
  try {
    const inventoryQuery = query(collection(db, 'inventory_items'))
    const inventorySnapshot = await getDocs(inventoryQuery)
    const items = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    const totalItems = items.length
    const soldItems = items.filter((item: any) => item.status === 'sold').length
    const availableItems = items.filter((item: any) => item.status === 'available').length
    const totalValue = items.reduce((sum, item: any) => {
      const purchasePrice = typeof item.purchasePrice === 'string' ? parseFloat(item.purchasePrice) : (item.purchasePrice || 0)
      return sum + (isNaN(purchasePrice) ? 0 : purchasePrice)
    }, 0)
    
    // Low stock items (items with less than 5 in each warehouse)
    const warehouseStock: { [key: string]: number } = {}
    items.forEach((item: any) => {
      if (item.status === 'available') {
        warehouseStock[item.currentWarehouseId] = (warehouseStock[item.currentWarehouseId] || 0) + 1
      }
    })
    
    const lowStockItems = Object.values(warehouseStock).filter(count => count < 5).length
    
    return {
      totalItems,
      soldItems,
      availableItems,
      totalValue,
      lowStockItems
    }
  } catch (error) {
    console.error('Error getting inventory report:', error)
    return {
      totalItems: 0,
      soldItems: 0,
      availableItems: 0,
      totalValue: 0,
      lowStockItems: 0
    }
  }
}

async function getAgentsReport() {
  try {
    const agentsQuery = query(collection(db, 'agents'))
    const agentsSnapshot = await getDocs(agentsQuery)
    const agents = agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    const totalAgents = agents.length
    const activeAgents = agents.filter((agent: any) => agent.isActive).length
    
    // Calculate total commissions from agent transactions
    let totalCommissions = 0
    try {
      const transactionsQuery = query(collection(db, 'agent_transactions'))
      const transactionsSnapshot = await getDocs(transactionsQuery)
      totalCommissions = transactionsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data()
        const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : (data.amount || 0)
        // Sum positive amounts (commissions and payments)
        return sum + (amount > 0 && !isNaN(amount) ? amount : 0)
      }, 0)
    } catch (error) {
      console.error('Error calculating total commissions:', error)
    }
    
    // Calculate total debt (negative balances)
    const totalDebt = agents.reduce((sum, agent: any) => {
      const balance = typeof agent.currentBalance === 'string' ? parseFloat(agent.currentBalance) : (agent.currentBalance || 0)
      return sum + (balance < 0 && !isNaN(balance) ? Math.abs(balance) : 0)
    }, 0)
    
    return {
      totalAgents,
      activeAgents,
      totalCommissions,
      totalDebt
    }
  } catch (error) {
    console.error('Error getting agents report:', error)
    return {
      totalAgents: 0,
      activeAgents: 0,
      totalCommissions: 0,
      totalDebt: 0
    }
  }
}

async function getDocumentsReport(startDate: Timestamp, endDate: Timestamp) {
  try {
    const documentsQuery = query(
      collection(db, 'document_tracking'),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    )
    
    const documentsSnapshot = await getDocs(documentsQuery)
    const documents = documentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    const totalDocuments = documents.length
    const pendingDocuments = documents.filter((doc: any) => 
      doc.status === 'pending_submission' || doc.status === 'submitted_to_manufacturer'
    ).length
    const completedDocuments = documents.filter((doc: any) => doc.status === 'completed').length
    
    // Calculate average processing time
    const completedDocs = documents.filter((doc: any) => doc.status === 'completed')
    const averageProcessingTime = completedDocs.length > 0 
      ? completedDocs.reduce((sum, doc: any) => {
          const created = doc.createdAt?.toDate() || new Date()
          const completed = doc.stages?.find((stage: any) => stage.status === 'completed')?.date?.toDate() || new Date()
          const diffDays = Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
          return sum + diffDays
        }, 0) / completedDocs.length
      : 0
    
    // Overdue documents (pending for more than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const overdueDocuments = documents.filter((doc: any) => {
      const created = doc.createdAt?.toDate() || new Date()
      return doc.status !== 'completed' && created < thirtyDaysAgo
    }).length
    
    return {
      totalDocuments,
      pendingDocuments,
      completedDocuments,
      averageProcessingTime: Math.round(averageProcessingTime),
      overdueDocuments
    }
  } catch (error) {
    console.error('Error getting documents report:', error)
    return {
      totalDocuments: 0,
      pendingDocuments: 0,
      completedDocuments: 0,
      averageProcessingTime: 0,
      overdueDocuments: 0
    }
  }
}

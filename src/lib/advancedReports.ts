import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  startAfter,
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'

// ===== INTERFACES =====
export interface AdvancedReportFilters {
  dateFrom: string
  dateTo: string
  reportType: 'sales' | 'inventory' | 'agents' | 'documents' | 'financial' | 'comprehensive'
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
  comparison: 'none' | 'previous_period' | 'same_period_last_year'
  agentId?: string
  warehouseId?: string
  status?: string
  category?: string
  minAmount?: number
  maxAmount?: number
}

export interface TimeSeriesData {
  date: string
  value: number
  label: string
  category?: string
}

export interface ComparisonData {
  current: number
  previous: number
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

export interface DetailedReportData {
  summary: {
    totalRecords: number
    totalValue: number
    averageValue: number
    growth: ComparisonData
    // Sales specific fields
    totalSales?: number
    totalAmount?: number
    companyShare?: number
    agentCommissions?: number
    totalProfit?: number
    // Inventory specific fields  
    totalItems?: number
    availableItems?: number
    soldItems?: number
    companyItems?: number
    agentItems?: number
    // Agents specific fields
    totalAgents?: number
    activeAgents?: number
    totalDebt?: number
  }
  timeSeries: TimeSeriesData[]
  breakdown: {
    [key: string]: {
      count: number
      value: number
      percentage: number
    }
  }
  topPerformers: Array<{
    id: string
    name: string
    value: number
    count: number
    rank: number
  }>
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'warning'
    title: string
    description: string
    value?: number
    recommendation?: string
  }>
}

export interface ComprehensiveReport {
  sales: DetailedReportData
  inventory: DetailedReportData
  agents: DetailedReportData
  documents: DetailedReportData
  financial: DetailedReportData
  overview: {
    totalRevenue: number
    totalProfit: number
    totalSales: number
    activeAgents: number
    inventoryValue: number
    pendingDocuments: number
    growthRate: number
    profitMargin: number
  }
}

// ===== UTILITY FUNCTIONS =====
export const getDateRange = (period: string, customFrom?: string, customTo?: string) => {
  const now = new Date()
  let startDate: Date
  let endDate = new Date(now)

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), quarter * 3, 1)
      break
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      startDate = customFrom ? new Date(customFrom) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      endDate = customTo ? new Date(customTo) : now
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return { startDate, endDate }
}

export const calculateGrowth = (current: number, previous: number): ComparisonData => {
  const change = current - previous
  const changePercent = previous > 0 ? (change / previous) * 100 : 0
  
  return {
    current,
    previous,
    change,
    changePercent,
    trend: changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable'
  }
}

export const generateTimeSeries = (data: any[], dateField: string, valueField: string, groupBy: 'day' | 'week' | 'month' = 'day'): TimeSeriesData[] => {
  const grouped = new Map<string, number>()
  
  data.forEach(item => {
    const date = item[dateField]?.toDate ? item[dateField].toDate() : new Date(item[dateField])
    let key: string
    
    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
    }
    
    const value = typeof item[valueField] === 'number' ? item[valueField] : parseFloat(item[valueField]) || 0
    grouped.set(key, (grouped.get(key) || 0) + value)
  })
  
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      value,
      label: formatDateLabel(date, groupBy)
    }))
}

const formatDateLabel = (dateStr: string, groupBy: 'day' | 'week' | 'month'): string => {
  const date = new Date(dateStr)
  
  switch (groupBy) {
    case 'day':
      return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
    case 'week':
      return `أسبوع ${date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`
    case 'month':
      return date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    default:
      return dateStr
  }
}

// ===== DATA FETCHERS =====
export const fetchSalesData = async (filters: AdvancedReportFilters): Promise<DetailedReportData> => {
  console.log('📊 [ADVANCED REPORTS] Fetching sales data with filters:', filters)
  
  const { startDate, endDate } = getDateRange(filters.period, filters.dateFrom, filters.dateTo)
  
  try {
    // Get sales from multiple sources
    const documentTrackingQuery = query(
      collection(db, 'document_tracking'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    )
    
    const salesQuery = query(
      collection(db, 'sales'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    )
    
    // Also get all data without date filter as fallback
    const allDocumentTrackingQuery = query(collection(db, 'document_tracking'))
    const allSalesQuery = query(collection(db, 'sales'))
    
    const [
      documentTrackingSnapshot,
      salesSnapshot,
      allDocumentTrackingSnapshot,
      allSalesSnapshot
    ] = await Promise.all([
      getDocs(documentTrackingQuery),
      getDocs(salesQuery),
      getDocs(allDocumentTrackingQuery),
      getDocs(allSalesQuery)
    ])
    
    const documentTrackingSales = documentTrackingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
    const directSales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
    const allDocumentTracking = allDocumentTrackingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
    const allDirectSales = allSalesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
    
    // Use filtered data if available, otherwise use all data
    const salesData = documentTrackingSales.length > 0 || directSales.length > 0 
      ? [...documentTrackingSales, ...directSales]
      : [...allDocumentTracking, ...allDirectSales]
    
    console.log('📊 [ADVANCED REPORTS] Found sales data:', {
      documentTracking: documentTrackingSales.length,
      directSales: directSales.length,
      allDocumentTracking: allDocumentTracking.length,
      allDirectSales: allDirectSales.length,
      totalUsed: salesData.length
    })
    
    console.log('✅ [ADVANCED REPORTS] Sales data loaded:', salesData.length, 'records')
    
    // Debug: Log first few records to see data structure
    if (salesData.length > 0) {
      console.log('🔍 [DEBUG] First sale record:', salesData[0])
      console.log('🔍 [DEBUG] Available fields:', Object.keys(salesData[0]))
    }
    
    // Calculate metrics with multiple field name attempts
    const totalSales = salesData.length
    const totalAmount = salesData.reduce((sum, sale) => {
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
        console.log('💰 [DEBUG] Found sale amount:', amount, 'from record:', sale.id || 'unknown')
      }
      
      return sum + amount
    }, 0)
    
    console.log('💰 [DEBUG] Total amount calculated:', totalAmount, 'from', totalSales, 'sales')
  
  // Calculate detailed financial breakdown
  let totalCompanyShare = 0
  let totalAgentCommissions = 0
  let totalProfit = 0
  
  salesData.forEach(sale => {
    const salePrice = typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) || 0 : (sale.salePrice || 0)
    const purchasePrice = typeof sale.purchasePrice === 'string' ? parseFloat(sale.purchasePrice) || 0 : (sale.purchasePrice || 0)
    const companyShare = typeof sale.companyShare === 'string' ? parseFloat(sale.companyShare) || 0 : (sale.companyShare || 0)
    const agentCommission = typeof sale.agentCommission === 'string' ? parseFloat(sale.agentCommission) || 0 : (sale.agentCommission || 0)
    const profit = typeof sale.profit === 'string' ? parseFloat(sale.profit) || 0 : (sale.profit || 0)
    
    totalCompanyShare += companyShare
    totalAgentCommissions += agentCommission
    // Use actual profit field if available, otherwise calculate
    totalProfit += profit || (salePrice - purchasePrice)
  })
  
  console.log('💰 [DEBUG] Financial breakdown:', {
    totalSales: totalAmount,
    companyShare: totalCompanyShare,
    agentCommissions: totalAgentCommissions,
    totalProfit: totalProfit
  })
  
  const averageValue = totalSales > 0 ? totalAmount / totalSales : 0
  
  // Generate time series
  const timeSeries = generateTimeSeries(salesData, 'createdAt', 'salePrice', 'day')
  
  // Agent breakdown
  const agentBreakdown: { [key: string]: { count: number; value: number; percentage: number } } = {}
  salesData.forEach(sale => {
    const agentName = sale.agentName || 'مبيعات المؤسسة'
    if (!agentBreakdown[agentName]) {
      agentBreakdown[agentName] = { count: 0, value: 0, percentage: 0 }
    }
    agentBreakdown[agentName].count++
    const amount = typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) || 0 : (sale.salePrice || 0)
    agentBreakdown[agentName].value += amount
  })
  
  // Calculate percentages
  Object.keys(agentBreakdown).forEach(agent => {
    agentBreakdown[agent].percentage = totalAmount > 0 ? (agentBreakdown[agent].value / totalAmount) * 100 : 0
  })
  
  // Top performers
  const topPerformers = Object.entries(agentBreakdown)
    .map(([name, data]) => ({
      id: name,
      name,
      value: data.value,
      count: data.count,
      rank: 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }))
  
  // Generate insights
  const insights = []
  
  if (totalAmount > 0 && totalProfit / totalAmount > 0.2) {
    insights.push({
      type: 'positive' as const,
      title: 'هامش ربح ممتاز',
      description: `هامش الربح الحالي ${((totalProfit / totalAmount) * 100).toFixed(1)}% وهو أعلى من المتوسط`,
      value: (totalProfit / totalAmount) * 100,
      recommendation: 'استمر في هذا الأداء الجيد'
    })
  }
  
  if (totalSales > 0) {
    const avgDailySales = totalSales / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))
    insights.push({
      type: 'neutral' as const,
      title: 'متوسط المبيعات اليومية',
      description: `متوسط ${avgDailySales.toFixed(1)} مبيعة يومياً`,
      value: avgDailySales
    })
  }
  
  return {
    summary: {
      totalRecords: totalSales,
      totalSales: totalSales,
      totalValue: totalAmount,
      totalAmount: totalAmount,
      companyShare: totalCompanyShare,
      agentCommissions: totalAgentCommissions,
      totalProfit: totalProfit,
      averageValue,
      growth: calculateGrowth(totalAmount, 0)
    },
    timeSeries,
    breakdown: agentBreakdown,
    topPerformers,
    insights
  }
  } catch (error) {
    console.error('Error fetching sales data:', error)
    return {
      summary: {
        totalRecords: 0,
        totalValue: 0,
        averageValue: 0,
        growth: 0
      },
      timeSeries: [],
      breakdown: [],
      topPerformers: [],
      insights: []
    }
  }
}

export async function fetchInventoryData(filters: AdvancedReportFilters): Promise<DetailedReportData> {
  console.log('📦 [ADVANCED REPORTS] Fetching inventory data...')
  
  // Get all inventory items first, then filter
  let inventoryQuery = query(collection(db, 'inventory_items'))
  
  const inventorySnapshot = await getDocs(inventoryQuery)
  const inventoryData = inventorySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as any[]
  
  console.log('✅ [ADVANCED REPORTS] Total inventory loaded:', inventoryData.length, 'items')
  
  // Debug inventory data
  if (inventoryData.length > 0) {
    console.log('🔍 [DEBUG] First inventory item:', inventoryData[0])
    console.log('🔍 [DEBUG] Available fields:', Object.keys(inventoryData[0]))
    
    // Check status values
    const statusCounts = inventoryData.reduce((acc, item) => {
      const status = item.status || 'undefined'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log('🔍 [DEBUG] Inventory status counts:', statusCounts)
  } else {
    console.warn('⚠️ [WARNING] No inventory items found in database!')
    console.log('🔍 [DEBUG] This might be why inventory data is empty')
  }
  
  // Filter for available items (check multiple possible status values)
  const availableInventory = inventoryData.filter(item => 
    !item.status || 
    item.status === 'available' || 
    item.status === 'in_stock' || 
    item.status !== 'sold'
  )
  
  console.log('📦 [DEBUG] Filtered available inventory:', availableInventory.length, 'out of', inventoryData.length)
  
  // Calculate metrics - only available items
  const totalItems = availableInventory.length
  const availableItems = availableInventory.length
  const soldItems = inventoryData.length - availableInventory.length
  
  // Separate company vs agent warehouses
  const companyWarehouses = ['المخزن الرئيسي', 'مخزن المعرض'] // Add your company warehouse names
  let companyItems = 0
  let agentItems = 0
  
  availableInventory.forEach(item => {
    const warehouseName = item.warehouseName || ''
    if (companyWarehouses.includes(warehouseName)) {
      companyItems++
    } else {
      agentItems++
    }
  })
  
  console.log('📦 [DEBUG] Inventory breakdown:', { 
    totalItems, 
    availableItems, 
    companyItems, 
    agentItems,
    companyWarehouses: companyWarehouses.join(', ')
  })
  
  const totalValue = availableInventory.reduce((sum, item) => {
    // Try multiple field names for price
    let price = 0
    if (item.purchasePrice) {
      price = typeof item.purchasePrice === 'string' ? parseFloat(item.purchasePrice) || 0 : (item.purchasePrice || 0)
    } else if (item.salePrice) {
      price = typeof item.salePrice === 'string' ? parseFloat(item.salePrice) || 0 : (item.salePrice || 0)
    } else if (item.price) {
      price = typeof item.price === 'string' ? parseFloat(item.price) || 0 : (item.price || 0)
    }
    
    if (price > 0) {
      console.log('💰 [DEBUG] Found inventory value:', price, 'for item:', item.id || 'unknown')
    }
    
    return sum + price
  }, 0)
  
  console.log('💰 [DEBUG] Total inventory value:', totalValue)
  
  const averageValue = totalItems > 0 ? totalValue / totalItems : 0
  
  // Brand breakdown - use available inventory only
  const brandBreakdown: { [key: string]: { count: number; value: number; percentage: number } } = {}
  availableInventory.forEach(item => {
    const brand = item.brand || 'غير محدد'
    if (!brandBreakdown[brand]) {
      brandBreakdown[brand] = { count: 0, value: 0, percentage: 0 }
    }
    brandBreakdown[brand].count++
    const price = typeof item.purchasePrice === 'string' ? parseFloat(item.purchasePrice) || 0 : (item.purchasePrice || 0)
    brandBreakdown[brand].value += price
  })
  
  // Calculate percentages
  Object.keys(brandBreakdown).forEach(brand => {
    brandBreakdown[brand].percentage = totalItems > 0 ? (brandBreakdown[brand].count / totalItems) * 100 : 0
  })
  
  // Top brands
  const topPerformers = Object.entries(brandBreakdown)
    .map(([name, data]) => ({
      id: name,
      name,
      value: data.count,
      count: data.count,
      rank: 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }))
  
  // Generate insights
  const insights = []
  
  if (availableItems / totalItems < 0.3) {
    insights.push({
      type: 'warning' as const,
      title: 'مخزون منخفض',
      description: `فقط ${((availableItems / totalItems) * 100).toFixed(1)}% من المخزون متاح`,
      value: (availableItems / totalItems) * 100,
      recommendation: 'يُنصح بتجديد المخزون'
    })
  }
  
  const turnoverRate = soldItems / totalItems
  if (turnoverRate > 0.7) {
    insights.push({
      type: 'positive' as const,
      title: 'معدل دوران ممتاز',
      description: `تم بيع ${(turnoverRate * 100).toFixed(1)}% من المخزون`,
      value: turnoverRate * 100
    })
  }
  
  return {
    summary: {
      totalRecords: totalItems,
      totalItems: totalItems,
      availableItems: availableItems,
      soldItems: soldItems,
      companyItems: companyItems,
      agentItems: agentItems,
      totalValue: totalValue,
      averageValue,
      growth: calculateGrowth(availableItems, soldItems)
    },
    timeSeries: [],
    breakdown: brandBreakdown,
    topPerformers,
    insights
  }
}

export const fetchAgentsData = async (filters: AdvancedReportFilters): Promise<DetailedReportData> => {
  console.log('👥 [ADVANCED REPORTS] Fetching agents data...')
  
  const agentsQuery = query(collection(db, 'agents'))
  const agentsSnapshot = await getDocs(agentsQuery)
  const agentsData = agentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as any[]
  
  console.log('✅ [ADVANCED REPORTS] Agents data loaded:', agentsData.length, 'agents')
  
  // Debug agents data
  if (agentsData.length > 0) {
    console.log('🔍 [DEBUG] First agent:', agentsData[0])
    console.log('🔍 [DEBUG] Available fields:', Object.keys(agentsData[0]))
  }
  
  // Calculate metrics
  const totalAgents = agentsData.length
  const activeAgents = agentsData.filter(agent => agent.isActive).length
  
  console.log('👥 [DEBUG] Agents status:', { totalAgents, activeAgents })
  
  const totalBalance = agentsData.reduce((sum, agent) => {
    // Try multiple field names for balance
    let balance = 0
    if (agent.currentBalance !== undefined) {
      balance = typeof agent.currentBalance === 'string' ? parseFloat(agent.currentBalance) || 0 : (agent.currentBalance || 0)
    } else if (agent.balance !== undefined) {
      balance = typeof agent.balance === 'string' ? parseFloat(agent.balance) || 0 : (agent.balance || 0)
    }
    
    if (balance !== 0) {
      console.log('💰 [DEBUG] Found agent balance:', balance, 'for agent:', agent.name || agent.id || 'unknown')
    }
    
    return sum + balance
  }, 0)
  
  console.log('💰 [DEBUG] Total agents balance:', totalBalance)
  
  const averageBalance = totalAgents > 0 ? totalBalance / totalAgents : 0
  
  // Performance breakdown
  const performanceBreakdown: { [key: string]: { count: number; value: number; percentage: number } } = {
    'ممتاز': { count: 0, value: 0, percentage: 0 },
    'جيد': { count: 0, value: 0, percentage: 0 },
    'متوسط': { count: 0, value: 0, percentage: 0 },
    'ضعيف': { count: 0, value: 0, percentage: 0 }
  }
  
  agentsData.forEach(agent => {
    const balance = typeof agent.currentBalance === 'string' ? parseFloat(agent.currentBalance) || 0 : (agent.currentBalance || 0)
    let performance = 'ضعيف'
    
    if (balance > 50000) performance = 'ممتاز'
    else if (balance > 20000) performance = 'جيد'
    else if (balance > 5000) performance = 'متوسط'
    
    performanceBreakdown[performance].count++
    performanceBreakdown[performance].value += balance
  })
  
  // Calculate percentages
  Object.keys(performanceBreakdown).forEach(perf => {
    performanceBreakdown[perf].percentage = totalAgents > 0 ? (performanceBreakdown[perf].count / totalAgents) * 100 : 0
  })
  
  // Top performers
  const topPerformers = agentsData
    .map(agent => ({
      id: agent.id,
      name: agent.name,
      value: typeof agent.currentBalance === 'string' ? parseFloat(agent.currentBalance) || 0 : (agent.currentBalance || 0),
      count: 1,
      rank: 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }))
  
  // Generate insights
  const insights = []
  
  const activeRate = activeAgents / totalAgents
  if (activeRate > 0.8) {
    insights.push({
      type: 'positive' as const,
      title: 'معدل نشاط عالي',
      description: `${(activeRate * 100).toFixed(1)}% من الوكلاء نشطون`,
      value: activeRate * 100
    })
  }
  
  return {
    summary: {
      totalRecords: totalAgents,
      totalAgents: totalAgents,
      activeAgents: activeAgents,
      totalValue: totalBalance,
      totalDebt: Math.abs(totalBalance),
      averageValue: averageBalance,
      growth: calculateGrowth(activeAgents, totalAgents - activeAgents)
    },
    timeSeries: [],
    breakdown: performanceBreakdown,
    topPerformers,
    insights
  }
}

export const generateComprehensiveReport = async (filters: AdvancedReportFilters): Promise<ComprehensiveReport> => {
  console.log('🔄 [ADVANCED REPORTS] Generating comprehensive report...')
  
  const [salesData, inventoryData, agentsData] = await Promise.all([
    fetchSalesData(filters),
    fetchInventoryData(filters),
    fetchAgentsData(filters)
  ])
  
  const overview = {
    totalRevenue: salesData.summary.totalValue,
    totalProfit: salesData.summary.totalValue * 0.2, // Estimated profit margin
    totalSales: salesData.summary.totalRecords,
    activeAgents: agentsData.topPerformers.length,
    inventoryValue: inventoryData.summary.totalValue,
    pendingDocuments: 0, // Will be calculated from documents data
    growthRate: salesData.summary.growth.changePercent,
    profitMargin: salesData.summary.totalValue > 0 ? (salesData.summary.totalValue * 0.2 / salesData.summary.totalValue) * 100 : 0
  }
  
  console.log('✅ [ADVANCED REPORTS] Comprehensive report generated')
  
  return {
    sales: salesData,
    inventory: inventoryData,
    agents: agentsData,
    documents: {
      summary: { totalRecords: 0, totalValue: 0, averageValue: 0, growth: calculateGrowth(0, 0) },
      timeSeries: [],
      breakdown: {},
      topPerformers: [],
      insights: []
    },
    financial: {
      summary: { totalRecords: 0, totalValue: 0, averageValue: 0, growth: calculateGrowth(0, 0) },
      timeSeries: [],
      breakdown: {},
      topPerformers: [],
      insights: []
    },
    overview
  }
}

// ===== EXPORT FUNCTIONS =====
export const exportToExcel = (data: any, filename: string) => {
  try {
    let csvContent = '\uFEFF' // BOM for UTF-8
    
    // Add header
    csvContent += `تقرير متقدم - ${filename}\n`
    csvContent += `تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-EG')}\n\n`
    
    // Add data based on type
    if (data.overview) {
      csvContent += 'نظرة عامة\n'
      csvContent += 'البيان,القيمة\n'
      csvContent += `إجمالي الإيرادات,${data.overview.totalRevenue}\n`
      csvContent += `إجمالي الأرباح,${data.overview.totalProfit}\n`
      csvContent += `إجمالي المبيعات,${data.overview.totalSales}\n`
      csvContent += `الوكلاء النشطون,${data.overview.activeAgents}\n`
      csvContent += `قيمة المخزون,${data.overview.inventoryValue}\n`
      csvContent += `معدل النمو,${data.overview.growthRate}%\n`
      csvContent += `هامش الربح,${data.overview.profitMargin}%\n\n`
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    return false
  }
}

export const exportToPDF = (data: any, filename: string) => {
  try {
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير متقدم - ${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; text-align: right; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .section { margin-bottom: 30px; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .data-table th, .data-table td { border: 1px solid #ddd; padding: 12px; text-align: right; }
          .data-table th { background-color: #f5f5f5; font-weight: bold; }
          .insight { padding: 15px; margin: 10px 0; border-radius: 8px; }
          .insight.positive { background-color: #d4edda; border-left: 4px solid #28a745; }
          .insight.warning { background-color: #fff3cd; border-left: 4px solid #ffc107; }
          .insight.negative { background-color: #f8d7da; border-left: 4px solid #dc3545; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير متقدم - ${filename}</h1>
          <p>تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        
        ${data.overview ? `
        <div class="section">
          <h2>نظرة عامة</h2>
          <table class="data-table">
            <tr><td>إجمالي الإيرادات</td><td>${data.overview.totalRevenue.toLocaleString()} جنيه</td></tr>
            <tr><td>إجمالي الأرباح</td><td>${data.overview.totalProfit.toLocaleString()} جنيه</td></tr>
            <tr><td>إجمالي المبيعات</td><td>${data.overview.totalSales}</td></tr>
            <tr><td>الوكلاء النشطون</td><td>${data.overview.activeAgents}</td></tr>
            <tr><td>قيمة المخزون</td><td>${data.overview.inventoryValue.toLocaleString()} جنيه</td></tr>
            <tr><td>معدل النمو</td><td>${data.overview.growthRate.toFixed(2)}%</td></tr>
            <tr><td>هامش الربح</td><td>${data.overview.profitMargin.toFixed(2)}%</td></tr>
          </table>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>مؤسسة أبو فرحان للنقل الخفيف - نظام إدارة المبيعات المتقدم</p>
        </div>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
      
      return true
    }
    return false
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    return false
  }
}

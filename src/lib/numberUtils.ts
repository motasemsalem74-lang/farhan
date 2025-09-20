/**
 * Comprehensive number formatting utilities for the project
 * Handles all number display issues consistently
 */

// Safe number conversion with fallback
export function safeNumber(value: any): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''))
    return isNaN(parsed) ? 0 : parsed
  }
  
  return 0
}

// Format currency with proper Arabic formatting
export function formatCurrency(amount: any, currency: string = 'جنيه'): string {
  const numericAmount = safeNumber(amount)
  
  if (numericAmount === 0) {
    return `0 ${currency}`
  }
  
  // Format with thousands separator
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numericAmount)
  
  return `${formatted} ${currency}`
}

// Format percentage
export function formatPercentage(value: any): string {
  const numericValue = safeNumber(value)
  
  if (numericValue === 0) {
    return '0%'
  }
  
  return `${numericValue.toFixed(1)}%`
}

// Format number with thousands separator
export function formatNumber(value: any): string {
  const numericValue = safeNumber(value)
  
  if (numericValue === 0) {
    return '0'
  }
  
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numericValue)
}

// Safe field access with fallback for missing properties
export function getSafeField(obj: any, ...paths: string[]): any {
  for (const path of paths) {
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        current = null
        break
      }
    }
    
    if (current !== null && current !== undefined) {
      return current
    }
  }
  
  return null
}

// Get safe numeric field with multiple fallback paths
export function getSafeNumericField(obj: any, ...paths: string[]): number {
  const value = getSafeField(obj, ...paths)
  return safeNumber(value)
}

// Format sale amount with fallbacks
export function formatSaleAmount(sale: any): string {
  const amount = getSafeNumericField(
    sale,
    'totalAmount',
    'salePrice', 
    'amount',
    'price'
  )
  
  return formatCurrency(amount)
}

// Format commission with fallbacks
export function formatCommission(sale: any): string {
  const commission = getSafeNumericField(
    sale,
    'totalCommission',
    'agentCommission',
    'commission'
  )
  
  return formatCurrency(commission)
}

// Format agent balance
export function formatAgentBalance(balance: any): string {
  const numericBalance = safeNumber(balance)
  
  if (numericBalance === 0) {
    return formatCurrency(0)
  }
  
  const isDebt = numericBalance < 0
  const absBalance = Math.abs(numericBalance)
  const formatted = formatCurrency(absBalance)
  
  return isDebt ? `(${formatted})` : formatted
}

// Calculate and format profit margin
export function formatProfitMargin(salePrice: any, costPrice: any): string {
  const sale = safeNumber(salePrice)
  const cost = safeNumber(costPrice)
  
  if (sale === 0 || cost === 0) {
    return '0%'
  }
  
  const margin = ((sale - cost) / sale) * 100
  return formatPercentage(margin)
}

// Format transaction amount based on type
export function formatTransactionAmount(transaction: any): string {
  const amount = getSafeNumericField(transaction, 'amount')
  const type = transaction?.type || ''
  
  if (amount === 0) {
    return formatCurrency(0)
  }
  
  // Show negative amounts in red parentheses for debts
  if (amount < 0 || type.includes('debt') || type.includes('expense')) {
    return `(${formatCurrency(Math.abs(amount))})`
  }
  
  return formatCurrency(amount)
}

// Get display name for transaction type
export function getTransactionTypeDisplay(type: string): string {
  const typeMap: Record<string, string> = {
    'sale': 'بيع',
    'payment': 'دفعة',
    'debt_increase': 'زيادة مديونية',
    'debt_decrease': 'تقليل مديونية',
    'commission': 'عمولة',
    'transfer': 'تحويل',
    'adjustment': 'تسوية',
    'refund': 'استرداد'
  }
  
  return typeMap[type] || type
}

// Validate numeric input
export function validateNumericInput(value: string): { isValid: boolean; message?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, message: 'القيمة مطلوبة' }
  }
  
  const numericValue = parseFloat(value.replace(/[^\d.-]/g, ''))
  
  if (isNaN(numericValue)) {
    return { isValid: false, message: 'يجب إدخال رقم صالح' }
  }
  
  if (numericValue < 0) {
    return { isValid: false, message: 'لا يمكن أن تكون القيمة سالبة' }
  }
  
  return { isValid: true }
}

// Format inventory count
export function formatInventoryCount(count: any): string {
  const numericCount = safeNumber(count)
  
  if (numericCount === 0) {
    return 'لا توجد أصناف'
  }
  
  if (numericCount === 1) {
    return 'صنف واحد'
  }
  
  if (numericCount === 2) {
    return 'صنفان'
  }
  
  if (numericCount <= 10) {
    return `${numericCount} أصناف`
  }
  
  return `${formatNumber(numericCount)} صنف`
}

// Format sales count
export function formatSalesCount(count: any): string {
  const numericCount = safeNumber(count)
  
  if (numericCount === 0) {
    return 'لا توجد مبيعات'
  }
  
  if (numericCount === 1) {
    return 'عملية بيع واحدة'
  }
  
  if (numericCount === 2) {
    return 'عمليتا بيع'
  }
  
  if (numericCount <= 10) {
    return `${numericCount} عمليات بيع`
  }
  
  return `${formatNumber(numericCount)} عملية بيع`
}

// Format document status count
export function formatDocumentCount(count: any, status?: string): string {
  const numericCount = safeNumber(count)
  
  if (numericCount === 0) {
    return 'لا توجد وثائق'
  }
  
  if (numericCount === 1) {
    return 'وثيقة واحدة'
  }
  
  if (numericCount === 2) {
    return 'وثيقتان'
  }
  
  if (numericCount <= 10) {
    return `${numericCount} وثائق`
  }
  
  return `${formatNumber(numericCount)} وثيقة`
}

// Format agent count
export function formatAgentCount(count: any): string {
  const numericCount = safeNumber(count)
  
  if (numericCount === 0) {
    return 'لا يوجد وكلاء'
  }
  
  if (numericCount === 1) {
    return 'وكيل واحد'
  }
  
  if (numericCount === 2) {
    return 'وكيلان'
  }
  
  if (numericCount <= 10) {
    return `${numericCount} وكلاء`
  }
  
  return `${formatNumber(numericCount)} وكيل`
}

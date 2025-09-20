import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | any | null | undefined, formatStr: string = 'yyyy/MM/dd'): string {
  if (!date) return 'غير محدد'
  
  let dateObj: Date
  
  // Handle Firebase Timestamp
  if (date && typeof date === 'object' && typeof date.toDate === 'function') {
    dateObj = date.toDate()
  } else if (date && typeof date === 'object' && date.seconds) {
    // Handle Firestore Timestamp-like object
    dateObj = new Date(date.seconds * 1000)
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else if (date instanceof Date) {
    dateObj = date
  } else {
    return 'تاريخ غير صالح'
  }
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صالح'
  }
  
  return format(dateObj, formatStr, { locale: arSA })
}

export function formatDateTime(date: Date | string | any | null | undefined): string {
  if (!date) return 'غير محدد'
  
  let dateObj: Date
  
  // Handle Firebase Timestamp
  if (date && typeof date === 'object' && typeof date.toDate === 'function') {
    dateObj = date.toDate()
  } else if (date && typeof date === 'object' && date.seconds) {
    // Handle Firestore Timestamp-like object
    dateObj = new Date(date.seconds * 1000)
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else if (date instanceof Date) {
    dateObj = date
  } else {
    return 'تاريخ غير صالح'
  }
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صالح'
  }
  
  return format(dateObj, 'yyyy/MM/dd HH:mm', { locale: arSA })
}

export function formatTimeAgo(date: Date | string | any | null | undefined): string {
  if (!date) return 'غير محدد'
  
  let dateObj: Date
  
  // Handle Firebase Timestamp
  if (date && typeof date === 'object' && typeof date.toDate === 'function') {
    dateObj = date.toDate()
  } else if (date && typeof date === 'object' && date.seconds) {
    // Handle Firestore Timestamp-like object
    dateObj = new Date(date.seconds * 1000)
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else if (date instanceof Date) {
    dateObj = date
  } else {
    return 'تاريخ غير صالح'
  }
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صالح'
  }
  
  return formatDistanceToNow(dateObj, { 
    addSuffix: true, 
    locale: arSA 
  })
}

export function formatCurrency(amount: number | string | null | undefined, currency: string = 'EGP'): string {
  // Convert to number and handle invalid values
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  
  // Check if it's a valid number
  if (isNaN(numAmount)) {
    return '0 ج.م'
  }
  
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount)
}

export function formatNumber(num: number | string | null | undefined): string {
  // Convert to number and handle invalid values
  const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0)
  
  // Check if it's a valid number
  if (isNaN(numValue)) {
    return '0'
  }
  
  return new Intl.NumberFormat('ar-EG').format(numValue)
}

export function generateTransactionId(type: string, date: Date = new Date()): string {
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  const typePrefix = {
    'warehouse_entry': 'IN',
    'warehouse_transfer': 'TR',
    'sale_to_customer': 'INV',
    'agent_invoice': 'AI',
    'payment_receipt': 'RCPT',
    'return': 'RET'
  }[type] || 'TXN'
  
  return `${typePrefix}-${year}${month}${day}-${random}`
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhoneNumber(phone: string): boolean {
  // Egyptian phone number validation
  const phoneRegex = /^(\+201|01)[0-9]{9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function isValidNationalId(id: string): boolean {
  // Egyptian national ID validation
  const idRegex = /^[0-9]{14}$/
  return idRegex.test(id)
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ')
}

export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, char => char.toUpperCase())
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'حدث خطأ غير متوقع'
}

export function downloadFile(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function convertToArabicNumerals(str: string): string {
  const arabicNumerals = '٠١٢٣٤٥٦٧٨٩'
  const englishNumerals = '0123456789'
  
  return str.replace(/[0-9]/g, (match) => {
    const index = englishNumerals.indexOf(match)
    return index !== -1 ? arabicNumerals[index] : match
  })
}

export function convertToEnglishNumerals(str: string): string {
  const arabicNumerals = '٠١٢٣٤٥٦٧٨٩'
  const englishNumerals = '0123456789'
  
  return str.replace(/[٠-٩]/g, (match) => {
    const index = arabicNumerals.indexOf(match)
    return index !== -1 ? englishNumerals[index] : match
  })
}

// Permission helpers
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

export function isSuperAdmin(userRole: string): boolean {
  return userRole === 'super_admin'
}

export function isAdmin(userRole: string): boolean {
  return userRole === 'admin' || userRole === 'super_admin'
}

export function isAgent(userRole: string): boolean {
  return userRole === 'agent'
}

export function isShowroomUser(userRole: string): boolean {
  return userRole === 'showroom_user'
}

export function canCreateSales(userRole: string): boolean {
  return ['super_admin', 'admin', 'agent', 'showroom_user'].includes(userRole)
}

export function canViewReports(userRole: string): boolean {
  return ['super_admin', 'admin'].includes(userRole)
}

export function canManageInventory(userRole: string): boolean {
  return ['super_admin', 'admin', 'showroom_user'].includes(userRole)
}

export function canManageAgents(userRole: string): boolean {
  return ['super_admin', 'admin'].includes(userRole)
}

// Vehicle type translations
export const vehicleTypeTranslations = {
  'motorcycle': 'موتوسيكل',
  'tricycle': 'تروسيكل',
  'electric_scooter': 'سكوتر كهرباء',
  'tuktuk': 'توك توك'
}

// Transaction type translations
export const transactionTypeTranslations = {
  'warehouse_entry': 'إدخال مخزني',
  'warehouse_transfer': 'تحويل مخزني',
  'sale_to_customer': 'بيع للعميل',
  'agent_invoice': 'فاتورة وكيل',
  'payment_receipt': 'سند قبض',
  'return': 'مرتجع'
}

// Document status translations
export const documentStatusTranslations = {
  'pending_submission': 'في انتظار الإرسال',
  'submitted_to_manufacturer': 'تم الإرسال للشركة',
  'received_from_manufacturer': 'تم الاستلام من الشركة',
  'sent_to_point_of_sale': 'تم الإرسال لنقطة البيع',
  'completed': 'مكتمل'
}

export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
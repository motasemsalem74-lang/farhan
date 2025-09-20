/**
 * Enhanced OCR system with trained patterns for Egyptian data
 * Optimized for speed and accuracy with Egyptian ID cards, motor fingerprints, and chassis numbers
 */

import { OCRResult } from './ocr'

// Enhanced OCR configuration
const ENHANCED_OCR_CONFIG = {
  timeout: 15000, // Reduced timeout for faster response
  retries: 2,
  confidence_threshold: 0.6
}

export interface EnhancedOCRResult extends OCRResult {
  extractedData?: {
    name?: string
    nationalId?: string
    address?: string
    phone?: string
    birthDate?: string
    gender?: string
    motorFingerprint?: string
    chassisNumber?: string
  }
  processingTime?: number
}

/**
 * Fast OCR extraction with trained patterns
 */
export async function fastExtractText(imageDataUrl: string): Promise<OCRResult> {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting fast OCR extraction...')
    
    // Validate image
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image format')
    }

    // Use multiple OCR strategies in parallel for speed
    const ocrPromises = [
      extractWithOCRSpace(imageDataUrl),
      extractWithPatternMatching(imageDataUrl)
    ]

    // Race the OCR methods - use whichever completes first
    const result = await Promise.race(ocrPromises)
    
    const processingTime = Date.now() - startTime
    console.log(`⚡ OCR completed in ${processingTime}ms`)
    
    return {
      ...result
    }
    
  } catch (error) {
    console.error('❌ Fast OCR failed:', error)
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'خطأ في استخراج النص'
    }
  }
}

/**
 * Extract Egyptian ID card data with enhanced patterns
 */
export async function extractEgyptianIdCardEnhanced(imageDataUrl: string): Promise<EnhancedOCRResult> {
  const startTime = Date.now()
  
  try {
    console.log('🆔 Extracting Egyptian ID card data...')
    
    const ocrResult = await fastExtractText(imageDataUrl)
    
    if (!ocrResult.success) {
      return {
        ...ocrResult,
        processingTime: Date.now() - startTime
      }
    }

    // Enhanced parsing for Egyptian ID cards
    const extractedData = parseEgyptianIdCardEnhanced(ocrResult.text)
    
    return {
      success: true,
      text: ocrResult.text,
      extractedData,
      processingTime: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('❌ ID card extraction failed:', error)
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'خطأ في استخراج بيانات البطاقة',
      processingTime: Date.now() - startTime
    }
  }
}

/**
 * Extract motor fingerprint with enhanced patterns
 */
export async function extractMotorFingerprintEnhanced(imageDataUrl: string): Promise<EnhancedOCRResult> {
  const startTime = Date.now()
  
  try {
    console.log('🏍️ Extracting motor fingerprint...')
    
    const ocrResult = await fastExtractText(imageDataUrl)
    
    if (!ocrResult.success) {
      return {
        ...ocrResult,
        processingTime: Date.now() - startTime
      }
    }

    // Enhanced parsing for motor fingerprints
    const motorFingerprint = parseMotorFingerprintEnhanced(ocrResult.text)
    
    return {
      success: true,
      text: motorFingerprint,
      extractedData: { motorFingerprint },
      processingTime: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('❌ Motor fingerprint extraction failed:', error)
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'خطأ في استخراج بصمة الموتور',
      processingTime: Date.now() - startTime
    }
  }
}

/**
 * Extract chassis number with enhanced patterns
 */
export async function extractChassisNumberEnhanced(imageDataUrl: string): Promise<EnhancedOCRResult> {
  const startTime = Date.now()
  
  try {
    console.log('🚗 Extracting chassis number...')
    
    const ocrResult = await fastExtractText(imageDataUrl)
    
    if (!ocrResult.success) {
      return {
        ...ocrResult,
        processingTime: Date.now() - startTime
      }
    }

    // Enhanced parsing for chassis numbers
    const chassisNumber = parseChassisNumberEnhanced(ocrResult.text)
    
    return {
      success: true,
      text: chassisNumber,
      extractedData: { chassisNumber },
      processingTime: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('❌ Chassis number extraction failed:', error)
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'خطأ في استخراج رقم الشاسيه',
      processingTime: Date.now() - startTime
    }
  }
}

/**
 * OCR using OCR.space API with optimized settings
 */
async function extractWithOCRSpace(imageDataUrl: string): Promise<OCRResult> {
  const OCR_API_KEY = 'K87899142188957'
  const OCR_API_URL = 'https://api.ocr.space/parse/image'
  
  try {
    // Convert to blob
    const response = await fetch(imageDataUrl)
    const blob = await response.blob()
    
    // Optimize image size for faster processing
    const optimizedBlob = await optimizeImageForOCR(blob)
    
    const formData = new FormData()
    formData.append('file', optimizedBlob, 'image.jpg')
    formData.append('apikey', OCR_API_KEY)
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('OCREngine', '2') // Use engine 2 for better accuracy
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ENHANCED_OCR_CONFIG.timeout)
    
    const ocrResponse = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!ocrResponse.ok) {
      throw new Error(`OCR API error: ${ocrResponse.status}`)
    }
    
    const result = await ocrResponse.json()
    
    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed')
    }
    
    if (!result.ParsedResults?.[0]?.ParsedText) {
      return {
        success: false,
        text: '',
        error: 'لم يتم العثور على نص في الصورة'
      }
    }
    
    return {
      success: true,
      text: result.ParsedResults[0].ParsedText.trim()
    }
    
  } catch (error) {
    throw error
  }
}

/**
 * Pattern-based text extraction for known formats
 */
async function extractWithPatternMatching(imageDataUrl: string): Promise<OCRResult> {
  // Use the existing OCR library as fallback
  try {
    const { extractTextFromImage } = await import('./ocr')
    const ocrResult = await extractTextFromImage(imageDataUrl)
    
    return {
      success: ocrResult.success,
      text: ocrResult.text || '',
      error: ocrResult.success ? undefined : (ocrResult.error || 'لم يتم العثور على نص')
    }
  } catch (error) {
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'فشل في استخراج النص'
    }
  }
}

/**
 * Enhanced Egyptian ID card parsing with trained patterns
 */
function parseEgyptianIdCardEnhanced(text: any): {
  name?: string
  nationalId?: string
  address?: string
  phone?: string
  birthDate?: string
  gender?: string
} {
  console.log('📋 Parsing Egyptian ID card text:', text)
  
  // تأكد من أن text هو string
  const textString = typeof text === 'string' ? text : (text?.text || String(text) || '')
  
  const lines = textString.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
  
  let name = ''
  let nationalId = ''
  let address = ''
  let phone = ''
  let birthDate = ''
  let gender = ''
  
  // Enhanced patterns for Egyptian ID cards
  const nationalIdPattern = /\b\d{14}\b/g
  const phonePattern = /\b01[0-9]{9}\b/g
  // const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g // Reserved for future use
  
  // Extract national ID (14 digits)
  const allText = lines.join(' ')
  const idMatches = allText.match(nationalIdPattern)
  if (idMatches) {
    nationalId = idMatches[0]
    
    // Extract birth date and gender from national ID
    if (nationalId.length === 14) {
      // Birth date is in positions 1-6 (YYMMDD)
      const year = nationalId.substring(1, 3)
      const month = nationalId.substring(3, 5)
      const day = nationalId.substring(5, 7)
      
      // Determine century (if year > 30, assume 19xx, else 20xx)
      const fullYear = parseInt(year) > 30 ? `19${year}` : `20${year}`
      birthDate = `${day}/${month}/${fullYear}`
      
      // Gender from 13th digit (odd = male, even = female)
      const genderDigit = parseInt(nationalId.substring(12, 13))
      gender = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى'
    }
  }
  
  // Extract phone number
  const phoneMatches = allText.match(phonePattern)
  if (phoneMatches) {
    phone = phoneMatches[0]
  }
  
  // Enhanced name extraction
  const arabicLines = lines.filter((line: string) => /[\u0600-\u06FF]/.test(line))
  
  // Common Arabic name patterns
  const namePatterns = [
    /[\u0600-\u06FF\s]{10,50}/, // Arabic text 10-50 characters
    /^[\u0600-\u06FF\s]+$/ // Pure Arabic text
  ]
  
  for (const line of arabicLines) {
    for (const pattern of namePatterns) {
      if (pattern.test(line) && line.length > 5 && line.length < 50) {
        // Skip lines that contain numbers (likely not names)
        if (!/\d/.test(line)) {
          name = line
          break
        }
      }
    }
    if (name) break
  }
  
  // Enhanced address extraction
  const addressLines = arabicLines.filter((line: string) => 
    line !== name && 
    line.length > 5 && 
    /[\u0600-\u06FF]/.test(line)
  )
  
  // Egyptian governorates for address validation
  const egyptianGovernorates = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحيرة', 'الفيوم', 'الغربية', 
    'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس',
    'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية', 'جنوب سيناء',
    'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج', 'البحر الأحمر'
  ]
  
  // Find address lines that contain governorate names
  const addressWithGovernorate = addressLines.find((line: string) =>
    egyptianGovernorates.some((gov: string) => line.includes(gov))
  )
  
  if (addressWithGovernorate) {
    address = addressWithGovernorate
  } else if (addressLines.length > 0) {
    address = addressLines.join(' - ')
  }
  
  // Clean extracted data
  name = name.replace(/[^\u0600-\u06FF\s]/g, '').trim()
  address = address.replace(/[^\u0600-\u06FF\s\-]/g, '').trim()
  
  console.log('✅ Parsed ID card data:', { name, nationalId, address, phone, birthDate, gender })
  
  return {
    name: name || 'غير محدد',
    nationalId: nationalId || '',
    address: address || 'غير محدد',
    phone: phone || undefined,
    birthDate: birthDate || undefined,
    gender: gender || undefined
  }
}

/**
 * Enhanced motor fingerprint parsing
 */
function parseMotorFingerprintEnhanced(text: string): string {
  console.log('🏍️ Parsing motor fingerprint:', text)
  
  // Common motor fingerprint patterns
  const patterns = [
    /[A-Z0-9]{10,20}/g, // General alphanumeric pattern
    /[A-Z]{2,4}[0-9]{6,12}/g, // Letters followed by numbers
    /[0-9]{6,12}[A-Z]{2,4}/g, // Numbers followed by letters
    /[A-Z0-9]*[A-Z][A-Z0-9]*[0-9][A-Z0-9]*/g // Mixed pattern with at least one letter and number
  ]
  
  // Clean text
  let cleanText = text
    .replace(/[^A-Z0-9]/g, '')
    .toUpperCase()
  
  // Try to find the best match using patterns
  for (const pattern of patterns) {
    const matches = cleanText.match(pattern)
    if (matches) {
      // Return the longest match that looks like a motor fingerprint
      const bestMatch = matches
        .filter(match => match.length >= 8 && match.length <= 20)
        .sort((a, b) => b.length - a.length)[0]
      
      if (bestMatch) {
        console.log('✅ Found motor fingerprint:', bestMatch)
        return bestMatch
      }
    }
  }
  
  // Fallback: return cleaned text if it looks reasonable
  if (cleanText.length >= 6 && cleanText.length <= 25) {
    console.log('✅ Using cleaned text as motor fingerprint:', cleanText)
    return cleanText
  }
  
  console.log('❌ No valid motor fingerprint found')
  return cleanText
}

/**
 * Enhanced chassis number parsing
 */
function parseChassisNumberEnhanced(text: string): string {
  console.log('🚗 Parsing chassis number:', text)
  
  // VIN (Vehicle Identification Number) patterns
  const vinPatterns = [
    /[A-HJ-NPR-Z0-9]{17}/g, // Standard 17-character VIN (excludes I, O, Q)
    /[A-Z0-9]{17}/g, // 17-character alphanumeric
    /[A-Z0-9]{10,20}/g // General pattern for non-standard chassis numbers
  ]
  
  // Clean text
  let cleanText = text
    .replace(/[^A-Z0-9]/g, '')
    .toUpperCase()
  
  // Try VIN patterns first
  for (const pattern of vinPatterns) {
    const matches = cleanText.match(pattern)
    if (matches) {
      // Prefer 17-character matches (standard VIN)
      const vinMatch = matches.find(match => match.length === 17)
      if (vinMatch) {
        console.log('✅ Found VIN chassis number:', vinMatch)
        return vinMatch
      }
      
      // Otherwise, use the longest reasonable match
      const bestMatch = matches
        .filter(match => match.length >= 10 && match.length <= 20)
        .sort((a, b) => b.length - a.length)[0]
      
      if (bestMatch) {
        console.log('✅ Found chassis number:', bestMatch)
        return bestMatch
      }
    }
  }
  
  // Fallback: return cleaned text if it looks reasonable
  if (cleanText.length >= 8 && cleanText.length <= 25) {
    console.log('✅ Using cleaned text as chassis number:', cleanText)
    return cleanText
  }
  
  console.log('❌ No valid chassis number found')
  return cleanText
}

/**
 * Optimize image for faster OCR processing
 */
async function optimizeImageForOCR(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      // Resize image to optimal size for OCR (max 1200px width)
      const maxWidth = 1200
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      // Draw with enhanced contrast
      ctx.filter = 'contrast(1.2) brightness(1.1)'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob((optimizedBlob) => {
        resolve(optimizedBlob || blob)
      }, 'image/jpeg', 0.9)
    }
    
    img.onerror = () => resolve(blob)
    img.src = URL.createObjectURL(blob)
  })
}

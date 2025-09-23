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
 * Enhanced Egyptian ID card parsing with improved patterns
 */
export function parseEgyptianIdCardEnhanced(text: any): {
  name?: string
  nationalId?: string
  address?: string
  phone?: string
  birthDate?: string
  gender?: string
} {
  console.log('🆔 Parsing Egyptian ID card text:', text)
  
  const textString = typeof text === 'string' ? text : (text?.text || String(text) || '')
  const lines = textString.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
  
  const result = {
    name: '',
    nationalId: '',
    address: '',
    phone: '',
    birthDate: '',
    gender: ''
  }

  // تحسين استخراج الرقم القومي بأنماط متعددة
  const nationalIdPatterns = [
    /\b\d{14}\b/g,                    // 14 رقم متتالي
    /(?:IQ|ID)\s*:?\s*(\d{10,15})/gi, // مسبوق بكلمة تعريف
    /\d{10,15}/g                      // أي رقم من 10-15 خانة
  ]

  // البحث في النص الكامل أولاً
  const fullText = lines.join(' ')
  console.log('🔍 Searching for national ID in text:', fullText)
  
  for (const pattern of nationalIdPatterns) {
    const matches = fullText.match(pattern)
    if (matches) {
      console.log('🎯 Pattern matches found:', matches)
      for (const match of matches) {
        const cleanId = match.replace(/[^\d]/g, '')
        console.log('🧹 Cleaned ID candidate:', cleanId)
        if (cleanId.length >= 10 && cleanId.length <= 15) {
          result.nationalId = cleanId.length === 14 ? cleanId : cleanId.padStart(14, '0')
          console.log('✅ Found national ID:', result.nationalId)
          break
        }
      }
      if (result.nationalId) break
    }
  }
  
  // إذا لم نجد رقم قومي، جرب البحث في كل سطر منفصل
  if (!result.nationalId) {
    console.log('🔄 Trying line-by-line search...')
    for (const line of lines) {
      const numbers = line.match(/\d+/g)
      if (numbers) {
        for (const num of numbers) {
          if (num.length >= 10 && num.length <= 15) {
            result.nationalId = num.length === 14 ? num : num.padStart(14, '0')
            console.log('✅ Found national ID in line:', result.nationalId)
            break
          }
        }
        if (result.nationalId) break
      }
    }
  }

  // تحسين استخراج الاسم
  for (const line of lines) {
    // تنظيف السطر من الرموز الغريبة
    const cleanLine = line.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\w]/g, ' ')
    const arabicMatch = cleanLine.match(/[أ-ي\s]{8,50}/)
    if (arabicMatch) {
      result.name = arabicMatch[0].trim()
      console.log('✅ Found name:', result.name)
      break
    }
  }

  // استخراج تاريخ الميلاد من الرقم القومي
  if (result.nationalId && result.nationalId.length === 14) {
    try {
      const century = result.nationalId[0] === '2' || result.nationalId[0] === '3' ? '20' : '19'
      const year = century + result.nationalId.substring(1, 3)
      const month = result.nationalId.substring(3, 5)
      const day = result.nationalId.substring(5, 7)
      
      if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        result.birthDate = `${day}/${month}/${year}`
        console.log('✅ Extracted birth date from ID:', result.birthDate)
      }
    } catch (error) {
      console.log('❌ Could not extract birth date from ID')
    }
  }

  // استخراج النوع من الرقم القومي
  if (result.nationalId && result.nationalId.length === 14) {
    const genderDigit = parseInt(result.nationalId[12])
    result.gender = genderDigit % 2 === 0 ? 'أنثى' : 'ذكر'
    console.log('✅ Extracted gender from ID:', result.gender)
  }

  // استخراج رقم الهاتف
  const phoneMatches = fullText.match(/\b01[0-9]{9}\b/g)
  if (phoneMatches) {
    result.phone = phoneMatches[0]
    console.log('✅ Found phone:', result.phone)
  }

  console.log('✅ Final parsed ID card data:', result)
  return result
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
  
  // First, try to find standard VIN patterns in the original text
  const vinPatterns = [
    /[A-HJ-NPR-Z0-9]{17}/g, // Standard 17-character VIN (excludes I, O, Q)
    /[A-Z0-9]{17}/g, // 17-character alphanumeric
    /[A-Z0-9]{15,20}/g // Extended range for non-standard chassis numbers
  ]
  
  // Try to find VIN in original text first (before cleaning)
  const originalUpper = text.toUpperCase()
  for (const pattern of vinPatterns) {
    const matches = originalUpper.match(pattern)
    if (matches) {
      console.log('🎯 Found potential VINs in original text:', matches)
      // Filter out common false positives
      const validMatches = matches.filter(match => {
        // Exclude matches that are mostly numbers or mostly letters
        const letterCount = (match.match(/[A-Z]/g) || []).length
        const numberCount = (match.match(/[0-9]/g) || []).length
        return letterCount >= 3 && numberCount >= 3 && match.length >= 15
      })
      
      if (validMatches.length > 0) {
        const bestMatch = validMatches.sort((a, b) => b.length - a.length)[0]
        console.log('✅ Found VIN chassis number:', bestMatch)
        return bestMatch
      }
    }
  }
  
  // Clean text and try again
  let cleanText = text
    .replace(/[^A-Z0-9]/g, '')
    .toUpperCase()
  
  console.log('🧹 Cleaned text:', cleanText)
  
  // Try VIN patterns on cleaned text
  for (const pattern of vinPatterns) {
    const matches = cleanText.match(pattern)
    if (matches) {
      console.log('🎯 Found matches in cleaned text:', matches)
      // Prefer 17-character matches (standard VIN)
      const vinMatch = matches.find(match => match.length === 17)
      if (vinMatch) {
        console.log('✅ Found standard VIN chassis number:', vinMatch)
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

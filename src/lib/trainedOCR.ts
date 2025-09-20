/**
 * Trained OCR system for Egyptian documents and vehicle parts
 * This module contains trained patterns and improved extraction logic
 */

import { extractTextFromImage, OCRResult } from './ocr'

/**
 * Enhanced patterns for Egyptian ID cards
 */
const EGYPTIAN_ID_PATTERNS = {
  // National ID: 14 digits (more flexible pattern)
  nationalId: /\b\d{14}\b/g,
  
  // Alternative ID patterns (in case OCR misreads some digits)
  alternativeId: /[0-9IQ]{10,17}/g,
  
  // Egyptian phone numbers
  phone: /\b01[0-9]{9}\b/g,
  
  // Arabic names (common patterns)
  arabicName: /[\u0600-\u06FF\s]{3,50}/g,
  
  // Birth date patterns (from national ID)
  birthDate: /\b(19|20)\d{2}[\/\-\.](0[1-9]|1[0-2])[\/\-\.](0[1-9]|[12]\d|3[01])\b/g,
  
  // Gender patterns (from national ID - odd=male, even=female)
  genderDigit: /\d{13}([0-9])/,
  
  // Egyptian governorates (Arabic and English)
  governorates: [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة',
    'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية',
    'الوادي الجديد', 'السويس', 'اسوان', 'اسيوط', 'بني سويف', 'بورسعيد',
    'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر',
    'قنا', 'شمال سيناء', 'سوهاج', 'CAIRO', 'GIZA', 'ALEXANDRIA'
  ],
  
  // Common OCR misreads for digits
  digitCorrections: {
    'I': '1', 'O': '0', 'S': '5', 'G': '6', 'B': '8', 'Q': '0',
    'l': '1', 'o': '0', 's': '5', 'g': '9', 'b': '6', 'q': '9'
  }
}

// Trained patterns for Motor Fingerprint
const MOTOR_PATTERNS = {
  // Common motor fingerprint formats
  standard: /[A-Z0-9]{8,20}/g,
  
  // Honda patterns
  honda: /[A-Z]{2}\d{2}E\d{6,8}/g,
  
  // Yamaha patterns  
  yamaha: /[A-Z0-9]{10,15}/g,
  
  // Suzuki patterns
  suzuki: /[A-Z]\d{2}[A-Z]\d{6}/g,
  
  // Generic alphanumeric
  generic: /[A-Z0-9]{6,25}/g
}

// Trained patterns for Chassis Number
const CHASSIS_PATTERNS = {
  // Standard VIN (17 characters)
  vin17: /[A-HJ-NPR-Z0-9]{17}/g,
  
  // Shorter chassis numbers
  short: /[A-Z0-9]{10,16}/g,
  
  // Japanese format
  japanese: /[A-Z]{3}\d{6,10}/g,
  
  // Chinese format
  chinese: /L[A-Z0-9]{16}/g
}

/**
 * Enhanced ID Card data extraction with trained patterns
 */
export async function extractEgyptianIdCard(imageDataUrl: string): Promise<{
  success: boolean
  data?: {
    name: string
    nationalId: string
    address: string
    phone?: string
    birthDate?: string
    gender?: string
  }
  confidence?: number
  error?: string
}> {
  try {
    console.log('🔍 Starting enhanced Egyptian ID card extraction...')
    
    // Use base OCR to extract text
    const ocrResult = await extractTextFromImage(imageDataUrl)
    
    if (!ocrResult.success) {
      return {
        success: false,
        error: ocrResult.error
      }
    }
    
    const text = ocrResult.text
    console.log('📄 Raw OCR text:', text)
    
    // Extract data using trained patterns
    const extractedData = parseEgyptianIdCardEnhanced(text)
    
    // Calculate confidence based on extracted fields
    let confidence = 0
    if (extractedData.nationalId) confidence += 40
    if (extractedData.name && extractedData.name !== 'غير محدد') confidence += 30
    if (extractedData.address && extractedData.address !== 'غير محدد') confidence += 20
    if (extractedData.phone) confidence += 10
    
    if (confidence < 40) {
      return {
        success: false,
        error: 'لم يتم العثور على بيانات كافية في بطاقة الرقم القومي'
      }
    }
    
    return {
      success: true,
      data: extractedData,
      confidence
    }
    
  } catch (error) {
    console.error('❌ ID card extraction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ في استخراج بيانات البطاقة'
    }
  }
}

/**
 * Enhanced motor fingerprint extraction with trained patterns
 */
export async function extractMotorFingerprintTrained(imageDataUrl: string): Promise<OCRResult> {
  try {
    console.log('🔍 Starting enhanced motor fingerprint extraction...')
    
    const ocrResult = await extractTextFromImage(imageDataUrl)
    
    if (!ocrResult.success) {
      return ocrResult
    }
    
    const text = ocrResult.text.toUpperCase()
    console.log('📄 Raw motor text:', text)
    
    // Try different patterns in order of preference
    const patterns = [
      MOTOR_PATTERNS.honda,
      MOTOR_PATTERNS.yamaha,
      MOTOR_PATTERNS.suzuki,
      MOTOR_PATTERNS.standard,
      MOTOR_PATTERNS.generic
    ]
    
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        const fingerprint = matches[0]
        
        // Validate length and format
        if (fingerprint.length >= 6 && fingerprint.length <= 25) {
          console.log('✅ Motor fingerprint found:', fingerprint)
          return {
            success: true,
            text: fingerprint,
            confidence: ocrResult.confidence
          }
        }
      }
    }
    
    // If no pattern matches, try to extract any alphanumeric sequence
    const cleanText = text.replace(/[^A-Z0-9]/g, '')
    if (cleanText.length >= 6 && cleanText.length <= 25) {
      return {
        success: true,
        text: cleanText,
        confidence: 50 // Lower confidence for fallback
      }
    }
    
    return {
      success: false,
      text: '',
      error: 'لم يتم العثور على بصمة موتور صالحة'
    }
    
  } catch (error) {
    console.error('❌ Motor fingerprint extraction failed:', error)
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'خطأ في استخراج بصمة الموتور'
    }
  }
}

/**
 * Enhanced chassis number extraction with trained patterns
 */
export async function extractChassisNumberTrained(imageDataUrl: string): Promise<OCRResult> {
  try {
    console.log('🔍 Starting enhanced chassis number extraction...')
    
    const ocrResult = await extractTextFromImage(imageDataUrl)
    
    if (!ocrResult.success) {
      return ocrResult
    }
    
    const text = ocrResult.text.toUpperCase()
    console.log('📄 Raw chassis text:', text)
    
    // Try different patterns in order of preference
    const patterns = [
      CHASSIS_PATTERNS.vin17,
      CHASSIS_PATTERNS.japanese,
      CHASSIS_PATTERNS.chinese,
      CHASSIS_PATTERNS.short
    ]
    
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        const chassisNumber = matches[0]
        
        // Validate format
        if (chassisNumber.length >= 10 && chassisNumber.length <= 17) {
          console.log('✅ Chassis number found:', chassisNumber)
          return {
            success: true,
            text: chassisNumber,
            confidence: ocrResult.confidence
          }
        }
      }
    }
    
    // Fallback: extract longest alphanumeric sequence
    const sequences = text.match(/[A-Z0-9]{8,}/g)
    if (sequences && sequences.length > 0) {
      const longestSequence = sequences.reduce((a, b) => a.length > b.length ? a : b)
      
      if (longestSequence.length >= 10) {
        return {
          success: true,
          text: longestSequence,
          confidence: 50 // Lower confidence for fallback
        }
      }
    }
    
    return {
      success: false,
      text: '',
      error: 'لم يتم العثور على رقم شاسيه صالح'
    }
    
  } catch (error) {
    console.error('❌ Chassis number extraction failed:', error)
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'خطأ في استخراج رقم الشاسيه'
    }
  }
}

/**
 * Correct OCR misreads in text
 */
function correctOCRMisreads(text: string): string {
  let correctedText = text
  
  // Apply digit corrections
  for (const [wrong, correct] of Object.entries(EGYPTIAN_ID_PATTERNS.digitCorrections)) {
    correctedText = correctedText.replace(new RegExp(wrong, 'g'), correct)
  }
  
  return correctedText
}

/**
 * Parse Egyptian national ID card text with enhanced patterns
 */
function parseEgyptianIdCardEnhanced(text: string): {
  name: string
  nationalId: string
  address: string
  phone?: string
  birthDate?: string
  gender?: string
} {
  console.log('🔍 Parsing Egyptian ID card text:', text)
  
  // Correct common OCR misreads first
  const correctedText = correctOCRMisreads(text)
  console.log('🔧 Corrected text:', correctedText)
  
  const lines = correctedText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  console.log('📝 Text lines:', lines)
  
  let name = ''
  let nationalId = ''
  let address = ''
  let phone = ''
  let birthDate = ''
  let gender = ''
  
  // Extract national ID (14 digits) - try multiple patterns
  let nationalIdMatches = correctedText.match(EGYPTIAN_ID_PATTERNS.nationalId)
  
  // If no exact 14-digit match, try alternative patterns and clean them
  if (!nationalIdMatches || nationalIdMatches.length === 0) {
    const alternativeMatches = correctedText.match(EGYPTIAN_ID_PATTERNS.alternativeId)
    if (alternativeMatches) {
      for (const match of alternativeMatches) {
        // Clean the match to keep only digits
        const cleaned = match.replace(/[^0-9]/g, '')
        if (cleaned.length === 14) {
          nationalId = cleaned
          console.log('🆔 Found National ID (cleaned):', nationalId)
          break
        }
      }
    }
  } else {
    nationalId = nationalIdMatches[0]
    console.log('🆔 Found National ID:', nationalId)
  }
  
  // Extract birth date and gender from national ID
  if (nationalId && nationalId.length === 14) {
    try {
      // Birth date: first 6 digits (YYMMDD)
      const year = parseInt(nationalId.substring(0, 2))
      const month = nationalId.substring(2, 4)
      const day = nationalId.substring(4, 6)
      
      // Convert 2-digit year to 4-digit
      const fullYear = year < 50 ? 2000 + year : 1900 + year
      birthDate = `${day}/${month}/${fullYear}`
      
      // Gender: 13th digit (odd=male, even=female)
      const genderDigit = parseInt(nationalId.charAt(12))
      gender = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى'
      
      console.log('📅 Extracted birth date:', birthDate)
      console.log('👤 Extracted gender:', gender)
    } catch (error) {
      console.warn('⚠️ Error parsing birth date/gender from ID:', error)
    }
  }
  
  // Extract phone number
  const phoneMatches = correctedText.match(EGYPTIAN_ID_PATTERNS.phone)
  if (phoneMatches && phoneMatches.length > 0) {
    phone = phoneMatches[0]
    console.log('📱 Found phone:', phone)
  }
  
  // Extract Arabic name (longest Arabic text line)
  const arabicMatches = correctedText.match(EGYPTIAN_ID_PATTERNS.arabicName)
  if (arabicMatches && arabicMatches.length > 0) {
    // Find the most likely name (longest Arabic text that's not too long)
    const nameCandidate = arabicMatches
      .filter(match => match.length > 3 && match.length < 50)
      .sort((a, b) => b.length - a.length)[0]
    
    if (nameCandidate) {
      name = nameCandidate.trim()
      console.log('👤 Found name candidate:', name)
    }
  }
  
  // Extract address (combine remaining Arabic text)
  const addressParts = arabicMatches?.filter(match => 
    match !== name && match.length > 5
  ) || []
  
  if (addressParts.length > 0) {
    address = addressParts.join(' - ').trim()
    console.log('🏠 Found address:', address)
  }
  
  // Fallback: try to find governorate names
  if (!address) {
    for (const gov of EGYPTIAN_ID_PATTERNS.governorates) {
      if (correctedText.includes(gov)) {
        address = gov
        console.log('🏛️ Found governorate:', gov)
        break
      }
    }
  }
  
  // If still no data found, try to extract from the raw lines
  if (!name && !nationalId && lines.length > 0) {
    console.log('🔍 Trying to extract from raw lines...')
    
    // Look for any sequence of digits that could be an ID
    for (const line of lines) {
      const digits = line.replace(/[^0-9]/g, '')
      if (digits.length >= 10) {
        console.log('🔢 Found digit sequence:', digits)
        if (digits.length === 14) {
          nationalId = digits
          console.log('🆔 Using as National ID:', nationalId)
          break
        }
      }
    }
    
    // Look for Arabic text that could be a name
    for (const line of lines) {
      if (/[\u0600-\u06FF]/.test(line) && line.length > 3 && line.length < 50) {
        name = line.trim()
        console.log('👤 Using as name:', name)
        break
      }
    }
  }
  
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
 * Process composite image (multiple documents in one image)
 */
export async function extractCompositeImage(imageDataUrl: string): Promise<{
  success: boolean
  data?: {
    idCard?: any
    motorFingerprint?: string
    chassisNumber?: string
  }
  error?: string
}> {
  try {
    console.log('🔍 Processing composite image...')
    
    // Try to extract all types of data
    const [idResult, motorResult, chassisResult] = await Promise.allSettled([
      extractEgyptianIdCard(imageDataUrl),
      extractMotorFingerprintTrained(imageDataUrl),
      extractChassisNumberTrained(imageDataUrl)
    ])
    
    const data: any = {}
    let hasData = false
    
    if (idResult.status === 'fulfilled' && idResult.value.success) {
      data.idCard = idResult.value.data
      hasData = true
    }
    
    if (motorResult.status === 'fulfilled' && motorResult.value.success) {
      data.motorFingerprint = motorResult.value.text
      hasData = true
    }
    
    if (chassisResult.status === 'fulfilled' && chassisResult.value.success) {
      data.chassisNumber = chassisResult.value.text
      hasData = true
    }
    
    if (!hasData) {
      return {
        success: false,
        error: 'لم يتم العثور على بيانات صالحة في الصورة'
      }
    }
    
    return {
      success: true,
      data
    }
    
  } catch (error) {
    console.error('❌ Composite image processing failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ في معالجة الصورة المجمعة'
    }
  }
}

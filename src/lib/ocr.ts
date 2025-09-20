/**
 * OCR (Optical Character Recognition) utilities
 * This module provides functions to extract text from images using various OCR services
 */

// OCR API configuration
const OCR_API_KEY = 'K87899142188957' // Free OCR.space API key
const OCR_API_URL = 'https://api.ocr.space/parse/image'

export interface OCRResult {
  success: boolean
  text: string
  confidence?: number
  error?: string
}

/**
 * Extract text from image using OCR.space API
 */
export async function extractTextFromImage(
  imageDataUrl: string
): Promise<OCRResult> {
  try {
    console.log('Starting OCR text extraction...')
    
    // Validate image data URL
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image data URL')
    }
    
    // Convert data URL to blob
    const response = await fetch(imageDataUrl)
    if (!response.ok) {
      throw new Error('Failed to process image data')
    }
    
    const blob = await response.blob()
    
    // Check blob size
    if (blob.size === 0) {
      throw new Error('Image file is empty')
    }
    
    console.log(`Image blob size: ${blob.size} bytes`)
    
    // Create form data
    const formData = new FormData()
    formData.append('file', blob, 'image.jpg')
    formData.append('apikey', OCR_API_KEY)
    formData.append('language', 'eng') // Use English as it's more reliable
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('isTable', 'false')
    formData.append('OCREngine', '2')
    
    // Call OCR API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
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
    console.log('OCR API response:', result)
    
    if (result.IsErroredOnProcessing) {
      const errorMessages = Array.isArray(result.ErrorMessage) ? result.ErrorMessage : [result.ErrorMessage]
      const errorText = errorMessages.join(', ') || 'OCR processing failed'
      throw new Error(errorText)
    }
    
    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      return {
        success: false,
        text: '',
        error: 'لم يتم العثور على نص في الصورة'
      }
    }
    
    const extractedText = result.ParsedResults[0].ParsedText || ''
    const confidence = result.ParsedResults[0].TextOverlay?.HasOverlay ? 
      result.ParsedResults[0].TextOverlay.Message : undefined
    
    console.log('Extracted text:', extractedText)
    
    return {
      success: true,
      text: extractedText.trim(),
      confidence
    }
    
  } catch (error) {
    console.error('OCR extraction failed:', error)
    
    let errorMessage = 'خطأ غير معروف في استخراج النص'
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'انتهت مهلة استخراج النص. يرجى المحاولة مرة أخرى'
      } else if (error.message.includes('File failed validation')) {
        errorMessage = 'الصورة غير صالحة أو فارغة'
      } else if (error.message.includes('size greater than 0')) {
        errorMessage = 'حجم الصورة صفر. يرجى التأكد من الصورة'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      success: false,
      text: '',
      error: errorMessage
    }
  }
}

/**
 * Extract Arabic ID card data from image
 */
export async function extractIdCardData(imageDataUrl: string): Promise<{
  success: boolean
  data?: {
    name: string
    nationalId: string
    address: string
    phone?: string
  }
  error?: string
}> {
  try {
    console.log('Extracting ID card data...')
    
    const ocrResult = await extractTextFromImage(imageDataUrl)
    
    if (!ocrResult.success) {
      return {
        success: false,
        error: ocrResult.error
      }
    }
    
    const text = ocrResult.text
    console.log('Raw OCR text for ID card:', text)
    
    // Parse Egyptian national ID patterns
    const data = parseEgyptianIdCard(text)
    
    if (!data.name && !data.nationalId) {
      return {
        success: false,
        error: 'لم يتم العثور على بيانات صالحة في بطاقة الرقم القومي'
      }
    }
    
    return {
      success: true,
      data
    }
    
  } catch (error) {
    console.error('ID card extraction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ في استخراج بيانات البطاقة'
    }
  }
}

/**
 * Parse Egyptian national ID card text
 */
function parseEgyptianIdCard(text: string): {
  name: string
  nationalId: string
  address: string
  phone?: string
} {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  let name = ''
  let nationalId = ''
  let address = ''
  let phone = ''
  
  // Common patterns for Egyptian ID cards
  const nationalIdPattern = /\b\d{14}\b/
  const phonePattern = /\b01[0-9]{9}\b/
  
  // Look for national ID (14 digits)
  for (const line of lines) {
    const idMatch = line.match(nationalIdPattern)
    if (idMatch) {
      nationalId = idMatch[0]
      break
    }
  }
  
  // Look for phone number
  for (const line of lines) {
    const phoneMatch = line.match(phonePattern)
    if (phoneMatch) {
      phone = phoneMatch[0]
      break
    }
  }
  
  // Extract name (usually the longest Arabic text line)
  const arabicLines = lines.filter(line => /[\u0600-\u06FF]/.test(line))
  if (arabicLines.length > 0) {
    // Find the line that looks most like a name (contains Arabic and is reasonably long)
    name = arabicLines
      .filter(line => line.length > 5 && line.length < 50)
      .sort((a, b) => b.length - a.length)[0] || ''
  }
  
  // Extract address (combine remaining Arabic text)
  address = arabicLines
    .filter(line => line !== name && line.length > 10)
    .join(' - ')
  
  // Clean up extracted data
  name = name.replace(/[^\u0600-\u06FF\s]/g, '').trim()
  address = address.replace(/[^\u0600-\u06FF\s\-]/g, '').trim()
  
  return {
    name: name || 'غير محدد',
    nationalId: nationalId || '',
    address: address || 'غير محدد',
    phone: phone || undefined
  }
}

/**
 * Extract motor fingerprint from image
 */
export async function extractMotorFingerprint(imageDataUrl: string): Promise<OCRResult> {
  try {
    console.log('Extracting motor fingerprint...')
    
    const ocrResult = await extractTextFromImage(imageDataUrl)
    
    if (!ocrResult.success) {
      return ocrResult
    }
    
    // Clean and format motor fingerprint
    let motorFingerprint = ocrResult.text
      .replace(/[^A-Z0-9]/g, '') // Keep only alphanumeric
      .toUpperCase()
    
    // Validate motor fingerprint format (usually alphanumeric, 10-20 characters)
    if (motorFingerprint.length < 5 || motorFingerprint.length > 25) {
      return {
        success: false,
        text: motorFingerprint,
        error: 'تنسيق بصمة الموتور غير صحيح'
      }
    }
    
    return {
      success: true,
      text: motorFingerprint,
      confidence: ocrResult.confidence
    }
    
  } catch (error) {
    console.error('Motor fingerprint extraction failed:', error)
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'خطأ في استخراج بصمة الموتور'
    }
  }
}

/**
 * Extract chassis number from image
 */
export async function extractChassisNumber(imageDataUrl: string): Promise<OCRResult> {
  try {
    console.log('Extracting chassis number...')
    
    const ocrResult = await extractTextFromImage(imageDataUrl)
    
    if (!ocrResult.success) {
      return ocrResult
    }
    
    // Clean and format chassis number
    let chassisNumber = ocrResult.text
      .replace(/[^A-Z0-9]/g, '') // Keep only alphanumeric
      .toUpperCase()
    
    // Validate chassis number format (usually 17 characters for VIN)
    if (chassisNumber.length < 10 || chassisNumber.length > 20) {
      return {
        success: false,
        text: chassisNumber,
        error: 'تنسيق رقم الشاسيه غير صحيح'
      }
    }
    
    return {
      success: true,
      text: chassisNumber,
      confidence: ocrResult.confidence
    }
    
  } catch (error) {
    console.error('Chassis number extraction failed:', error)
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'خطأ في استخراج رقم الشاسيه'
    }
  }
}

/**
 * Fallback OCR using browser's built-in capabilities (if available)
 */
export async function fallbackOCR(imageDataUrl: string): Promise<OCRResult> {
  try {
    // This is a placeholder for browser-based OCR
    // In a real implementation, you might use:
    // - Tesseract.js for client-side OCR
    // - Google Cloud Vision API
    // - Azure Computer Vision API
    
    console.log('Using fallback OCR method for image:', imageDataUrl.substring(0, 50) + '...')
    
    // For now, return a mock result
    return {
      success: false,
      text: '',
      error: 'OCR غير متاح حالياً. يرجى إدخال النص يدوياً'
    }
    
  } catch (error) {
    return {
      success: false,
      text: '',
      error: 'فشل في استخراج النص'
    }
  }
}

/**
 * Image Composer - Create composite images for document packages
 * This module creates combined images from multiple source images
 */

export interface CompositeImageOptions {
  customerIdImage?: string
  motorFingerprintImage?: string
  chassisNumberImage?: string
  customerName?: string
  motorFingerprint?: string
  chassisNumber?: string
  saleDate?: string
}

/**
 * Create a composite image combining customer ID, motor fingerprint, and chassis number
 */
export async function createCompositeImage(options: CompositeImageOptions): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      // Set canvas size - compact vertical layout
      const imageWidth = 400
      const imageHeight = 300
      const canvasWidth = imageWidth
      const canvasHeight = imageHeight * 3 // 3 images stacked vertically
      canvas.width = canvasWidth
      canvas.height = canvasHeight

      // Set background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      const loadAndDrawImage = (src: string, x: number, y: number, width: number, height: number, label: string): Promise<void> => {
        return new Promise((resolve) => {
          console.log(`🖼️ Loading ${label}:`, src ? 'URL provided' : 'No URL')
          
          if (!src) {
            // Draw placeholder with dark background
            ctx.fillStyle = '#f0f0f0'
            ctx.fillRect(x, y, width, height)
            ctx.strokeStyle = '#cccccc'
            ctx.lineWidth = 1
            ctx.strokeRect(x, y, width, height)
            ctx.fillStyle = '#666666'
            ctx.font = '16px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('صورة غير متوفرة', x + width / 2, y + height / 2)
            console.log(`⚠️ ${label}: No image URL provided`)
            resolve()
            return
          }

          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          img.onload = () => {
            try {
              console.log(`✅ ${label}: Image loaded successfully`)
              // Draw the image to fill the entire space (no borders, no margins)
              ctx.drawImage(img, x, y, width, height)
              resolve()
            } catch (error) {
              console.error(`❌ ${label}: Error drawing image:`, error)
              resolve() // Continue even if one image fails
            }
          }
          
          img.onerror = (error) => {
            console.error(`❌ ${label}: Failed to load image:`, src, error)
            // Draw placeholder on error
            ctx.fillStyle = '#f0f0f0'
            ctx.fillRect(x, y, width, height)
            ctx.strokeStyle = '#cccccc'
            ctx.lineWidth = 1
            ctx.strokeRect(x, y, width, height)
            ctx.fillStyle = '#666666'
            ctx.font = '16px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('فشل تحميل الصورة', x + width / 2, y + height / 2)
            resolve()
          }
          
          img.src = src
        })
      }

      // Load and draw all images stacked vertically with no gaps
      await Promise.all([
        // Customer ID (top)
        loadAndDrawImage(
          options.customerIdImage || '', 
          0, 
          0, 
          imageWidth, 
          imageHeight,
          'Customer ID'
        ),
        
        // Motor fingerprint (middle)
        loadAndDrawImage(
          options.motorFingerprintImage || '', 
          0, 
          imageHeight, 
          imageWidth, 
          imageHeight,
          'Motor Fingerprint'
        ),
        
        // Chassis number (bottom)
        loadAndDrawImage(
          options.chassisNumberImage || '', 
          0, 
          imageHeight * 2, 
          imageWidth, 
          imageHeight,
          'Chassis Number'
        )
      ])

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      resolve(dataUrl)

    } catch (error) {
      console.error('Error creating composite image:', error)
      reject(error)
    }
  })
}

/**
 * Create a simple composite image with text overlay
 */
export async function createSimpleComposite(
  customerName: string,
  motorFingerprint: string,
  chassisNumber: string,
  saleDate: string
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    canvas.width = 800
    canvas.height = 600
    
    // Background
    ctx.fillStyle = '#f8f9fa'
    ctx.fillRect(0, 0, 800, 600)
    
    // Border
    ctx.strokeStyle = '#dee2e6'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, 780, 580)
    
    // Title
    ctx.fillStyle = '#212529'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('وثيقة البيع', 400, 80)
    
    // Content
    ctx.font = '24px Arial'
    ctx.textAlign = 'right'
    
    const startY = 150
    const lineHeight = 50
    
    ctx.fillText(`اسم العميل: ${customerName}`, 750, startY)
    ctx.fillText(`بصمة الموتور: ${motorFingerprint}`, 750, startY + lineHeight)
    ctx.fillText(`رقم الشاسيه: ${chassisNumber}`, 750, startY + lineHeight * 2)
    ctx.fillText(`تاريخ البيع: ${saleDate}`, 750, startY + lineHeight * 3)
    
    // Footer
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#6c757d'
    ctx.fillText('تم إنشاء هذه الوثيقة تلقائياً', 400, 520)
    ctx.fillText(`${new Date().toLocaleDateString('ar-EG')}`, 400, 550)
    
    resolve(canvas.toDataURL('image/jpeg', 0.9))
  })
}

// Cloudinary configuration and upload utilities
const CLOUDINARY_CLOUD_NAME = 'dzh4fpnnw'
const CLOUDINARY_UPLOAD_PRESET = 'farhan'
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

/**
 * Allowed parameters for unsigned uploads:
 * - upload_preset (required)
 * - folder
 * - tags
 * - public_id
 * - callback
 * - context
 * - metadata
 * - face_coordinates
 * - custom_coordinates
 * - source
 * - filename_override
 * 
 * NOT ALLOWED in unsigned uploads:
 * - quality
 * - format
 * - transformation (except in upload preset)
 * - resource_type (auto-detected)
 */

export interface CloudinaryUploadResponse {
  public_id: string
  version: number
  signature: string
  width: number
  height: number
  format: string
  resource_type: string
  created_at: string
  tags: string[]
  bytes: number
  type: string
  etag: string
  placeholder: boolean
  url: string
  secure_url: string
  access_mode: string
  original_filename: string
}

export interface UploadOptions {
  folder?: string
  tags?: string[]
  transformation?: string
  // Note: quality and format are not supported in unsigned uploads
  // Use signed uploads with API secret for these features
}

/**
 * Upload image to Cloudinary
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResponse> {
  try {
    const formData = new FormData()
    
    // Add the file
    formData.append('file', file)
    
    // Add upload preset
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    
    // Add optional parameters
    if (options.folder) {
      formData.append('folder', options.folder)
    }
    
    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','))
    }
    
    // Note: quality and format are not allowed in unsigned uploads
    // These parameters require signed uploads with API secret
    
    // Upload to Cloudinary
    const response = await fetch(CLOUDINARY_API_URL, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`)
    }
    
    const result: CloudinaryUploadResponse = await response.json()
    return result
    
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    throw error
  }
}

/**
 * Upload multiple images to Cloudinary
 */
export async function uploadMultipleToCloudinary(
  files: (File | Blob)[],
  options: UploadOptions = {}
): Promise<CloudinaryUploadResponse[]> {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, options))
    const results = await Promise.all(uploadPromises)
    return results
  } catch (error) {
    console.error('Error uploading multiple files to Cloudinary:', error)
    throw error
  }
}

/**
 * Generate Cloudinary URL with transformations
 */
export function generateCloudinaryUrl(
  publicId: string,
  transformations: string[] = []
): string {
  const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`
  
  if (transformations.length === 0) {
    return `${baseUrl}/${publicId}`
  }
  
  const transformationString = transformations.join(',')
  return `${baseUrl}/${transformationString}/${publicId}`
}

/**
 * Common transformation presets
 */
export const CloudinaryTransformations = {
  // Thumbnails
  thumbnail: 'w_150,h_150,c_fill,q_auto,f_auto',
  smallThumb: 'w_100,h_100,c_fill,q_auto,f_auto',
  
  // Profile images
  profilePicture: 'w_200,h_200,c_fill,g_face,q_auto,f_auto',
  
  // Document images
  documentScan: 'w_800,h_1200,c_fit,q_auto,f_auto',
  idCard: 'w_600,h_400,c_fit,q_auto,f_auto',
  
  // Product images
  productImage: 'w_500,h_500,c_fit,q_auto,f_auto',
  productGallery: 'w_800,h_600,c_fit,q_auto,f_auto',
  
  // Optimized versions
  webOptimized: 'q_auto,f_auto',
  mobileOptimized: 'w_400,q_auto,f_auto'
}

/**
 * Delete image from Cloudinary (requires backend implementation)
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    // Note: Deletion requires server-side implementation with API secret
    // This is a placeholder for the frontend
    console.warn(`Image deletion should be implemented on the backend for security. Public ID: ${publicId}`)
    return true
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error)
    return false
  }
}

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG, PNG, أو WebP'
    }
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'
    }
  }
  
  return { valid: true }
}

/**
 * Compress image before upload
 */
export function compressImage(file: File, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions (max 1920x1080)
      const maxWidth = 1920
      const maxHeight = 1080
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('فشل في ضغط الصورة'))
          }
        },
        file.type,
        quality
      )
    }
    
    img.onerror = () => reject(new Error('فشل في تحميل الصورة'))
    img.src = URL.createObjectURL(file)
  })
}

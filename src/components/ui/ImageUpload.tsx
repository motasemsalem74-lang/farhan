import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from './Button'
import { uploadToCloudinary, validateImageFile, compressImage, CloudinaryUploadResponse } from '@/lib/cloudinary'

interface ImageUploadProps {
  onUpload: (result: CloudinaryUploadResponse) => void
  onError?: (error: string) => void
  folder?: string
  tags?: string[]
  maxFiles?: number
  accept?: string
  className?: string
  disabled?: boolean
}

export function ImageUpload({
  onUpload,
  onError,
  folder = 'al-farhan',
  tags = [],
  maxFiles = 1,
  accept = 'image/*',
  className = '',
  disabled = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return

    const filesToUpload = Array.from(files).slice(0, maxFiles)
    
    try {
      setUploading(true)

      for (const file of filesToUpload) {
        // Validate file
        const validation = validateImageFile(file)
        if (!validation.valid) {
          toast.error(validation.error)
          if (onError) onError(validation.error!)
          continue
        }

        // Compress image
        const compressedFile = await compressImage(file, 0.8)

        // Upload to Cloudinary
        const result = await uploadToCloudinary(compressedFile, {
          folder,
          tags,
          quality: 'auto',
          format: 'auto'
        })

        onUpload(result)
        toast.success('تم رفع الصورة بنجاح')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء رفع الصورة'
      toast.error(errorMessage)
      if (onError) onError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled || uploading) return
    
    const files = e.dataTransfer.files
    handleFiles(files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const openFileDialog = () => {
    if (disabled || uploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600 arabic-text">جاري رفع الصورة...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 arabic-text mb-2">
              اسحب الصور هنا أو انقر للاختيار
            </p>
            <p className="text-sm text-gray-500 arabic-text">
              JPG, PNG, WebP حتى 10 ميجابايت
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={disabled || uploading}
            >
              <Upload className="ml-2 h-4 w-4" />
              اختيار الصور
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface ImagePreviewProps {
  images: CloudinaryUploadResponse[]
  onRemove?: (index: number) => void
  className?: string
}

export function ImagePreview({ images, onRemove, className = '' }: ImagePreviewProps) {
  if (images.length === 0) return null

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {images.map((image, index) => (
        <div key={image.public_id} className="relative group">
          <img
            src={image.secure_url}
            alt={`Uploaded ${index + 1}`}
            className="w-full h-32 object-cover rounded-lg border"
          />
          {onRemove && (
            <button
              onClick={() => onRemove(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg">
            {image.original_filename || 'صورة'}
          </div>
        </div>
      ))}
    </div>
  )
}

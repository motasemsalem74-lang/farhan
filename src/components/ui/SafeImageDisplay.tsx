import React, { useState } from 'react'
import { ExternalLink, Download, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent } from './Card'

interface SafeImageDisplayProps {
  imageUrl?: string | null
  alt: string
  title: string
  className?: string
  showControls?: boolean
  downloadable?: boolean
  openInNewTab?: boolean
}

export function SafeImageDisplay({
  imageUrl,
  alt,
  title,
  className = '',
  showControls = true,
  downloadable = true,
  openInNewTab = true
}: SafeImageDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showImage, setShowImage] = useState(true)

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  // Handle image error
  const handleImageError = () => {
    setImageLoaded(false)
    setImageError(true)
  }

  // Download image
  const downloadImage = async () => {
    if (!imageUrl) return

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${alt.replace(/\s+/g, '_')}_${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  // Open in new tab
  const openInNewTabHandler = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank')
    }
  }

  // If no image URL provided
  if (!imageUrl) {
    return (
      <Card className={`${className} border-dashed border-gray-300`}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 arabic-text">لا توجد صورة متاحة</p>
          <p className="text-sm text-gray-400 arabic-text">{title}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* Title */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 arabic-text">{title}</h4>
          
          {/* Controls */}
          {showControls && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowImage(!showImage)}
                size="sm"
                variant="outline"
              >
                {showImage ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              
              {downloadable && (
                <Button
                  onClick={downloadImage}
                  size="sm"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              {openInNewTab && (
                <Button
                  onClick={openInNewTabHandler}
                  size="sm"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Image Display */}
        {showImage && (
          <div className="relative">
            {!imageLoaded && !imageError && (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 arabic-text">جاري التحميل...</span>
              </div>
            )}
            
            {imageError && (
              <div className="w-full h-48 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                  <p className="text-red-600 arabic-text">فشل في تحميل الصورة</p>
                  <Button
                    onClick={() => {
                      setImageError(false)
                      setImageLoaded(false)
                    }}
                    size="sm"
                    variant="outline"
                    className="mt-2"
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            )}
            
            <img
              src={imageUrl}
              alt={alt}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`w-full max-h-64 object-contain rounded-lg border ${
                imageLoaded ? 'block' : 'hidden'
              }`}
            />
          </div>
        )}

        {/* Image URL for debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && imageUrl && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            <p className="text-gray-600 arabic-text mb-1">رابط الصورة:</p>
            <p className="text-gray-500 font-mono">
              {imageUrl.startsWith('data:') 
                ? `${imageUrl.substring(0, 50)}... (data URL - ${Math.round(imageUrl.length / 1024)}KB)`
                : imageUrl
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

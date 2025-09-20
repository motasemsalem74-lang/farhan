import { useRef, useCallback } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'

interface SimpleMobileCaptureProps {
  onCapture: (imageDataUrl: string) => void
  onCancel: () => void
  title?: string
}

export function SimpleMobileCapture({ 
  onCapture, 
  onCancel, 
  title = "التقاط صورة"
}: SimpleMobileCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          onCapture(result)
        }
      }
      reader.readAsDataURL(file)
    }
  }, [onCapture])

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center arabic-text">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-4">
          <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
            <Camera className="h-16 w-16 text-gray-400" />
          </div>
          
          <div className="space-y-2">
            <Button onClick={triggerFileInput} className="w-full">
              <Upload className="ml-2 h-4 w-4" />
              اختيار صورة
            </Button>
            
            <Button onClick={onCancel} variant="outline" className="w-full">
              <X className="ml-2 h-4 w-4" />
              إلغاء
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}

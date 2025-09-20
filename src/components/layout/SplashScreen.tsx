import React, { useState, useEffect } from 'react'

interface SplashScreenProps {
  onComplete?: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          // Call onComplete when progress reaches 100%
          setTimeout(() => {
            onComplete?.()
          }, 500) // Small delay for smooth transition
          return 100
        }
        return prev + 2
      })
    }, 40)

    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <div className="min-h-screen al-farhan-gradient al-farhan-pattern flex items-center justify-center">
      <div className="text-center text-white p-8">
        {/* Logo Container */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <div className="text-6xl">🚗</div>
          </div>
        </div>

        {/* Company Name */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold arabic-text mb-2">
            مؤسسة أبو فرحان
          </h1>
          <p className="text-xl text-white/90 arabic-text">
            للنقل الخفيف
          </p>
        </div>

        {/* Tagline */}
        <div className="mb-8">
          <p className="text-lg text-white/80 arabic-text">
            نظام محاسبي متكامل لإدارة المخزون والمبيعات
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto mb-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Text */}
        <p className="text-sm text-white/70 arabic-text">
          جاري تحميل التطبيق... {progress}%
        </p>

        {/* Version Info */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <p className="text-xs text-white/60 arabic-text">
            الإصدار 1.0.0 - PWA
          </p>
        </div>
      </div>
    </div>
  )
}
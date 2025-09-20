import { useState, useEffect } from 'react'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    'تحميل النظام...',
    'تهيئة قاعدة البيانات...',
    'تحميل إعدادات المستخدم...',
    'جاري الإعداد النهائي...'
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2
        
        // Update current step based on progress
        const stepIndex = Math.floor((newProgress / 100) * steps.length)
        setCurrentStep(Math.min(stepIndex, steps.length - 1))
        
        if (newProgress >= 100) {
          clearInterval(timer)
          setTimeout(() => onComplete(), 500)
          return 100
        }
        return newProgress
      })
    }, 50)

    return () => clearInterval(timer)
  }, [onComplete, steps.length])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-al-farhan-600 via-al-farhan-700 to-al-farhan-800 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/20 border-t-white animate-spin" />
            <div className="h-24 w-24 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-4xl">🚗</span>
            </div>
          </div>
        </div>

        {/* Company Name */}
        <div className="mb-2">
          <h1 className="text-4xl font-bold text-white arabic-text mb-2">
            أبو فرحان للنقل الخفيف
          </h1>
          <p className="text-xl text-white/80 arabic-text">
            نظام محاسبي متكامل
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 w-80 mx-auto">
          <div className="bg-white/20 rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="bg-white h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Loading Text */}
          <p className="text-white/90 arabic-text">
            {steps[currentStep]}
          </p>
          
          {/* Progress Percentage */}
          <p className="text-white/70 text-sm mt-2">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/10 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

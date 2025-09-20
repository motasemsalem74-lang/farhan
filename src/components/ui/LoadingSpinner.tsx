import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8', 
  lg: 'w-12 h-12'
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <Loader2 
        className={cn(
          'animate-spin text-current',
          sizeClasses[size],
          className
        )} 
      />
      {text && (
        <p className="mt-2 text-sm text-muted-foreground arabic-text">
          {text}
        </p>
      )}
    </div>
  )
}
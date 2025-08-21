import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className,
  variant = 'text',
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const animationClasses = {
    pulse: 'motion-safe:animate-pulse motion-reduce:animate-none',
    wave: 'motion-safe:animate-shimmer motion-reduce:animate-none bg-gradient-to-r from-neutral-gray/20 via-neutral-light-gray/40 to-neutral-gray/20 bg-[length:200%_100%]',
    none: ''
  }

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  }

  return (
    <div
      className={cn(
        animation === 'wave' ? '' : 'bg-neutral-gray/20',
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      aria-hidden="true"
      tabIndex={-1}
      {...props}
    />
  )
}

export function SkeletonText({ 
  lines = 3, 
  className,
  ...props 
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4 w-full',
            i === lines - 1 && 'w-4/5' // Last line is shorter
          )}
          {...props}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ 
  className,
  ...props 
}: SkeletonProps) {
  return (
    <div 
      className={cn(
        'rounded-lg border border-neutral-light-gray bg-white p-6',
        className
      )}
      {...props}
    >
      <Skeleton className="h-6 w-32 mb-4" />
      <SkeletonText lines={3} className="mb-4" />
      <div className="flex gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

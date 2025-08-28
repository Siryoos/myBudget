import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  showPercentage?: boolean
  label?: string
  className?: string
  animated?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showPercentage = false,
  label,
  className,
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const colorClasses = {
    primary: 'bg-primary-trust-blue',
    secondary: 'bg-secondary-growth-green',
    success: 'bg-accent-success-emerald',
    warning: 'bg-accent-action-orange',
    danger: 'bg-accent-warning-red',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-neutral-dark-gray">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-neutral-gray">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full bg-neutral-light-gray rounded-full overflow-hidden',
          sizeClasses[size],
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${percentage.toFixed(0)}%`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-HTTP_INTERNAL_SERVER_ERROR ease-out',
            colorClasses[color],
            animated && 'animate-pulse-gentle',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Screen reader only text */}
      <span className="sr-only">
        {label && `${label}: `}
        {value} of {max} ({percentage.toFixed(0)}%)
      </span>
    </div>
  );
}

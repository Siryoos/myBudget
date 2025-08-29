import { forwardRef } from 'react';

import { cn } from '@/lib/utils';
import type { ButtonProps } from '@/types';

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    children,
    leftIcon,
    rightIcon,
    iconOnly = false,
    ariaLabel,
    fullWidth = false,
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary: 'bg-primary-trust-blue text-white hover:bg-primary-trust-blue-dark focus:ring-primary-trust-blue',
      secondary: 'bg-neutral-light-gray text-neutral-dark-gray hover:bg-neutral-light-gray/70 focus:ring-neutral-gray',
      outline: 'border-2 border-primary-trust-blue text-primary-trust-blue hover:bg-primary-trust-blue hover:text-white focus:ring-primary-trust-blue',
      ghost: 'text-neutral-gray hover:bg-neutral-light-gray hover:text-neutral-dark-gray focus:ring-neutral-gray',
      danger: 'bg-accent-expense-red text-white hover:bg-accent-expense-red/90 focus:ring-accent-expense-red',
    };

    const sizes = {
      xs: 'px-2 py-1 text-xs min-h-[32px] rounded-md',
      sm: 'px-3 py-1.5 text-sm min-h-[40px] rounded-md',
      md: 'px-4 py-2 text-sm min-h-[44px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
      xl: 'px-6 py-3 text-base min-h-[52px] text-lg',
    };

    const content = (
      <>
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {leftIcon && <span className={cn('mr-2 inline-flex', iconOnly && '!mr-0')}>{leftIcon}</span>}
        {!iconOnly && <span className="truncate">{children}</span>}
        {rightIcon && <span className={cn('ml-2 inline-flex', iconOnly && '!ml-0')}>{rightIcon}</span>}
        {iconOnly && !children && (leftIcon || rightIcon)}
      </>
    );

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[((size === 'small' ? 'sm' : size) as keyof typeof sizes) || 'md'],
          loading && 'cursor-wait',
          iconOnly && 'px-2',
          fullWidth && 'w-full',
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        aria-label={iconOnly ? ariaLabel : undefined}
        role="button"
        {...props}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };

// Accessible button group
type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement> & { label?: string };

export function ButtonGroup({ label, className, children, ...props }: ButtonGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex rounded-md shadow-sm overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
}

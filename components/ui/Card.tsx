import { forwardRef } from 'react';

import { cn } from '@/lib/utils';
import type { CardProps } from '@/types';

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, subtitle, actions, hoverable = false, hover, onClick, children, ...props }, ref) => {
    const isHoverable = hoverable || hover || !!onClick;
    const interactiveProps = onClick
      ? {
          role: 'button' as const,
          tabIndex: 0,
          onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          },
        }
      : {};
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-md shadow-sm border border-neutral-gray/10 overflow-hidden',
          isHoverable && 'hover:shadow-lg transition-shadow duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-trust-blue',
          className,
        )}
        onClick={onClick}
        {...interactiveProps}
        {...props}
      >
        {(title || subtitle || actions) && (
          <div className="p-6 pb-0 border-b border-neutral-gray/10">
            <div className="flex items-center justify-between">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-neutral-dark-gray">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-neutral-gray">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center space-x-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    );
  },
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pb-0 border-b border-neutral-gray/10', className)} {...props}>
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

const CardContent = forwardRef<HTMLDivElement, CardProps>(({ className, noPadding, children, ...props }, ref) => (
  <div ref={ref} className={cn(noPadding ? 'p-0' : 'p-6', className)} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
      <div
        ref={ref}
        className={cn('px-6 py-4 border-t border-neutral-gray/10 bg-neutral-light-gray/50', className)}
        {...props}
      >
        {children}
      </div>
    ),
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };

// Lightweight status cards
export function CardLoading({ title = 'Loading...', className }: { title?: string; className?: string }) {
  return (
    <div className={cn('bg-white rounded-md shadow-sm border border-neutral-gray/10 p-6', className)} role="status" aria-live="polite">
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-trust-blue mr-3" />
        <span className="text-neutral-gray text-sm sr-only">Loading...</span>
      </div>
    </div>
  );
}

import { XCircleIcon } from '@heroicons/react/24/solid';
export function CardError({ message = 'errorLoading', onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('bg-white rounded-md shadow-sm border border-accent-expense-red/20 p-6', className)} role="alert">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-accent-expense-red">
          <XCircleIcon className="h-5 w-5 mr-2" />
          {message}
        </div>
        {onRetry && (
          <button onClick={onRetry} className="px-3 py-1.5 text-xs rounded-md border border-accent-expense-red/40 text-accent-expense-red hover:bg-accent-expense-red/10 focus:outline-none focus:ring-2 focus:ring-accent-expense-red">Retry</button>
        )}
      </div>
    </div>
  );
}

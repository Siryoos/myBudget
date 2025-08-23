import { forwardRef } from 'react';

import { cn } from '@/lib/utils';
import type { CardProps } from '@/types';

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, subtitle, actions, hoverable = false, children, ...props }, ref) => (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-md shadow-sm border border-neutral-gray/10 overflow-hidden',
          hoverable && 'hover:shadow-md transition-shadow duration-200 cursor-pointer',
          className,
        )}
        {...props}
      >
        {(title || subtitle || actions) && (
          <div className="px-6 py-4 border-b border-neutral-gray/10">
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
    ),
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
      <div
        ref={ref}
        className={cn('px-6 py-4 border-b border-neutral-gray/10', className)}
        {...props}
      >
        {children}
      </div>
    ),
);

CardHeader.displayName = 'CardHeader';

const CardContent = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
      <div
        ref={ref}
        className={cn('p-6', className)}
        {...props}
      >
        {children}
      </div>
    ),
);

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

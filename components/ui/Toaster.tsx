'use client';

import React from 'react';
import { useToast } from '@/hooks/useToast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 w-[320px] max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={
            'rounded-lg shadow-md border px-4 py-3 bg-white text-sm ' +
            (t.variant === 'success'
              ? 'border-secondary-growth-green/30'
              : t.variant === 'error'
              ? 'border-accent-warning-red/30'
              : t.variant === 'warning'
              ? 'border-yellow-500/30'
              : 'border-neutral-gray/30')
          }
        >
          <div className="flex items-start">
            <div className="flex-1">
              <div className="font-medium text-neutral-dark-gray">{t.title}</div>
              {t.description && (
                <div className="mt-1 text-neutral-gray">{t.description}</div>
              )}
            </div>
            <div className="ml-2 flex items-center space-x-2">
              {t.action && (
                <button
                  onClick={t.action.onClick}
                  className="text-primary-trust-blue hover:underline"
                >
                  {t.action.label}
                </button>
              )}
              <button
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="text-neutral-gray hover:text-neutral-dark-gray"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


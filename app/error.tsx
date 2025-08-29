'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-neutral-light-gray">
        <div className="bg-white shadow-sm rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-neutral-dark-gray mb-2">Something went wrong</h1>
          <p className="text-neutral-gray mb-4">An unexpected error occurred. Please try again.</p>
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-md border border-neutral-gray/30 text-neutral-dark-gray hover:bg-neutral-light-gray"
            >
              Try again
            </button>
            <Link href="/" className="px-4 py-2 rounded-md bg-primary-trust-blue text-white hover:bg-primary-trust-blue/90">
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}


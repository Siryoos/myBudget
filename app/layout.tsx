import type { Metadata } from 'next';
import { headers } from 'next/headers';
import React from 'react';
import './globals.css';
import '@/lib/setup-globals';


import ClientLayout from './ClientLayout';
import { SkipLink } from '@/components/ui/SkipLink';

export const metadata: Metadata = {
  title: {
    template: '%s | SmartSave',
    default: 'SmartSave - Personal Finance Management Platform',
  },
  description: 'A comprehensive personal finance website designed to encourage saving behavior through psychological nudges and intuitive UI/UX',
  keywords: ['finance', 'savings', 'budget', 'money management', 'personal finance'],
  authors: [{ name: 'SmartSave Team' }],
  creator: 'SmartSave',
  publisher: 'SmartSave',
  robots: 'index, follow',
  metadataBase: new URL('https://smartsave.finance'),
  openGraph: {
    type: 'website',
    siteName: 'SmartSave',
    title: 'SmartSave - Personal Finance Management Platform',
    description: 'Take control of your finances with intelligent saving tools and personalized insights',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartSave - Personal Finance Management Platform',
    description: 'Take control of your finances with intelligent saving tools and personalized insights',
    images: ['/og-image.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1E5A8D',
};

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  // Get the locale from headers (set by middleware)
  const headersList = headers();
  const textDirection = headersList.get('x-text-direction') || 'ltr';
  const locale = headersList.get('x-locale') || 'en';

  return (
    <html lang={locale} dir={textDirection}>
      <head>
        <link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Roboto-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Roboto-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/RobotoMono-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="font-primary antialiased">
        {/* Accessibility skip link at top for keyboard users */}
        <SkipLink />
        <ClientLayout locale={locale}>{children}</ClientLayout>
      </body>
    </html>
  );
}

// Ensure app-level layout opts out of static pre-rendering to keep client-context-only trees safe during build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

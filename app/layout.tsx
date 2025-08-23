import React from 'react';
import type { Metadata } from 'next';
import { Inter, Roboto, Roboto_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';

import ClientLayout from './ClientLayout';


const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

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
    <html
      lang={locale}
      dir={textDirection}
      className={`${inter.variable} ${roboto.variable} ${robotoMono.variable}`}
    >
      <body className="font-primary antialiased">
        <ClientLayout locale={locale}>
          <div className="min-h-screen bg-neutral-light-gray">
            <Header />
            <div className="flex">
              <Navigation />
              <main className="flex-1 lg:ml-0" id="main-content">
                <div className="container-responsive py-6">
                  {children}
                </div>
              </main>
            </div>
          </div>

          {/* Accessibility skip link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-trust-blue text-white px-4 py-2 rounded-md z-50"
          >
            {/* Intentionally not using i18n hook in server component; client will still be localized */}
            Skip to main content
          </a>
        </ClientLayout>
      </body>
    </html>
  );
}

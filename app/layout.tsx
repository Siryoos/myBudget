import { Inter, Roboto, Roboto_Mono } from 'next/font/google'
import './globals.css'
import { Metadata } from 'next'
import { Navigation } from '@/components/layout/Navigation'
import { Header } from '@/components/layout/Header'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
})

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
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#1E5A8D',
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
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${roboto.variable} ${robotoMono.variable}`}
    >
      <body className="font-primary antialiased">
        <div className="min-h-screen bg-neutral-light-gray">
          <Header />
          <div className="flex">
            <Navigation />
            <main className="flex-1 lg:ml-0">
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
          Skip to main content
        </a>
      </body>
    </html>
  )
}

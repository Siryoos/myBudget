
import type { ReactNode } from 'react';

interface LocaleLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export default function LocaleLayout({
  children,
}: LocaleLayoutProps) {
  return children;
}

// Force dynamic rendering for all locale-scoped pages to avoid SSG/pre-render issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Generate static params for all supported locales
export const generateStaticParams = () => [
    { locale: 'en' },
    { locale: 'fa' },
    { locale: 'ar' },
  ];

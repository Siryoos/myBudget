import { headers } from 'next/headers';
import { ReactNode } from 'react';

interface LocaleLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export default function LocaleLayout({ 
  children,
  params: { locale }
}: LocaleLayoutProps) {
  return children;
}

// Generate static params for all supported locales
export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'fa' },
    { locale: 'ar' }
  ];
}

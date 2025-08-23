
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

// Generate static params for all supported locales
export const generateStaticParams = () => {
  return [
    { locale: 'en' },
    { locale: 'fa' },
    { locale: 'ar' },
  ];
}

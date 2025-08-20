'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { I18nProvider } from '@/lib/i18n-provider';
import { getDirection } from '@/lib/i18n';

interface ClientLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export default function ClientLayout({ children, locale }: ClientLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Set document direction based on locale
    const dir = getDirection(locale);
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nProvider locale={locale}>
      {children}
    </I18nProvider>
  );
}

'use client';

import React, { useEffect } from 'react';

import { getDirection } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n-provider';

interface ClientLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export default function ClientLayout({ children, locale }: ClientLayoutProps) {
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

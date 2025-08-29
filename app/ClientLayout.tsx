'use client';

import React, { useEffect, useState } from 'react';

import { getDirection } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n-provider';
import { AppProvider } from '@/contexts/AppProvider';
import { Toaster } from '@/components/ui/Toaster';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';

interface ClientLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export default function ClientLayout({ children, locale }: ClientLayoutProps) {
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    // Set document direction based on locale
    const dir = getDirection(locale);
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nProvider locale={locale}>
      <AppProvider>
        <div className="min-h-screen bg-neutral-light-gray">
          <Header onMenuToggle={() => setNavOpen(true)} />
          <div className="flex">
            <Navigation isOpen={navOpen} onClose={() => setNavOpen(false)} />
            <main className="flex-1 lg:ml-0" id="main-content">
              <div className="container-responsive py-6">{children}</div>
            </main>
          </div>
        </div>
        <Toaster />
      </AppProvider>
    </I18nProvider>
  );
}

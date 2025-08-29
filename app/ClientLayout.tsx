'use client';

import React, { useEffect, useState } from 'react';

import { getDirection } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n-provider';
import { AppProvider } from '@/contexts/AppProvider';
import { Toaster } from '@/components/ui/Toaster';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import KeyboardShortcuts from '@/components/layout/KeyboardShortcuts';

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
    // Apply persisted theme and contrast
    const persistedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const persistedContrast = typeof window !== 'undefined' ? localStorage.getItem('contrast') : null;
    if (persistedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (persistedContrast === 'high') {
      document.documentElement.dataset.contrast = 'high';
    } else {
      document.documentElement.dataset.contrast = 'normal';
    }
  }, [locale]);

  return (
    <I18nProvider locale={locale}>
      <AppProvider>
        <div className="min-h-screen bg-neutral-light-gray">
          <Header onMenuToggle={() => setNavOpen(true)} isMenuOpen={navOpen} />
          <div className="flex">
            <Navigation isOpen={navOpen} onClose={() => setNavOpen(false)} />
            <main className="flex-1 lg:ml-0" id="main-content">
              <div className="container-responsive py-6">{children}</div>
            </main>
          </div>
          <KeyboardShortcuts locale={locale} onOpenNav={() => setNavOpen(true)} onCloseNav={() => setNavOpen(false)} />
        </div>
        <Toaster />
      </AppProvider>
    </I18nProvider>
  );
}

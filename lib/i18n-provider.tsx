'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Initialize i18next with optimized configuration
const initI18n = async () => {
  if (!i18n.isInitialized) {
    await i18n
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',
        ns: ['common', 'dashboard', 'budget', 'goals', 'transactions', 'education', 'settings', 'auth', 'errors'],
        defaultNS: 'common',
        interpolation: {
          escapeValue: false,
        },
        backend: {
          // Match Next.js App Route at app/locales/[lng]/[ns]/route.ts
          loadPath: '/locales/{{lng}}/{{ns}}',
          requestOptions: {
            cache: 'default',
          },
        },
        detection: {
          order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
          caches: ['cookie'],
          lookupCookie: 'NEXT_LOCALE',
        },
        react: {
          useSuspense: false,
        },
        // Preload common namespace to avoid initial loading issues
        preload: ['en'],
        // Wait for translations to load before rendering
        initImmediate: false,
      });
  }
  return i18n;
};

interface I18nProviderProps {
  children: ReactNode;
  locale?: string;
}

const I18nContext = createContext<{
  locale: string;
  isLoading: boolean;
}>({
  locale: 'en',
  isLoading: true,
});

export function I18nProvider({ children, locale = 'en' }: I18nProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocale, setCurrentLocale] = useState(locale);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initI18n();
        
        // Change language if locale prop changes
        if (i18n.language !== locale) {
          await i18n.changeLanguage(locale);
        }
        
        setCurrentLocale(locale);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setIsLoading(false);
      }
    };

    initialize();
  }, [locale]);

  // Show loading state while i18n is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
          <p className="text-neutral-gray">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <I18nContext.Provider value={{ locale: currentLocale, isLoading }}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

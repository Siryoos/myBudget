'use client';

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { I18nextProvider , initReactI18next } from 'react-i18next';

// Initialize i18next with optimized configuration
const initI18n = async () => {
  if (!i18n.isInitialized) {
    console.log('🌐 Initializing i18n...');

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
          // Match Next.js API Route at app/api/locales/[lng]/[ns]/route.ts
          loadPath: '/api/locales/{{lng}}/{{ns}}',
          requestOptions: {
            cache: 'no-store', // Disable caching for instant language switching
          },
          // Add error handling for failed requests
          parse: (data: string) => {
            try {
              return JSON.parse(data);
            } catch (error) {
              console.error('Failed to parse translation data:', error);
              return {};
            }
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
        // Preload common namespaces to avoid initial loading issues
        preload: ['en', 'ar', 'fa'],
        // Wait for translations to load before rendering
        initImmediate: false,
        // Enable instant language switching
        load: 'languageOnly',
        // Clear cache on language change
        cleanCode: true,
        // Add retry logic for failed requests
        saveMissing: false,
        returnEmptyString: false,
        returnNull: false,
      });

    console.log('✅ i18n initialized successfully');
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
  changeLanguage: (newLocale: string) => Promise<void>;
}>({
  locale: 'en',
  isLoading: true,
  changeLanguage: async () => {},
});

export function I18nProvider({ children, locale = 'en' }: I18nProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocale, setCurrentLocale] = useState(locale);

  const changeLanguage = async (newLocale: string) => {
    try {
      setIsLoading(true);
      console.log(`Changing language from ${currentLocale} to ${newLocale}`);

      // Simply change language - let i18next handle resource management
      if (i18n.isInitialized) {
        await i18n.changeLanguage(newLocale);

        // Ensure critical namespaces are loaded for the new locale
        const criticalNamespaces = ['common', 'dashboard'];
        await Promise.all(
          criticalNamespaces.map(ns => i18n.loadNamespaces(ns)),
        );
      }

      setCurrentLocale(newLocale);
      console.log(`Language successfully changed to ${newLocale}`);
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error; // Re-throw to let callers handle the error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await initI18n();

        // Change language if locale prop changes
        if (i18n.language !== locale) {
          await i18n.changeLanguage(locale);
        }

        // Ensure all required namespaces are loaded for the current locale
        const requiredNamespaces = ['common', 'dashboard'];
        await Promise.all(
          requiredNamespaces.map(ns =>
            i18n.loadNamespaces(ns),
          ),
        );

        setCurrentLocale(locale);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setIsLoading(false);
      }
    };

    initialize();
  }, [locale]);

  // Listen for language changes from other components
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setCurrentLocale(lng);
    };

    if (i18n.isInitialized) {
      i18n.on('languageChanged', handleLanguageChanged);
    }

    return () => {
      if (i18n.isInitialized) {
        i18n.off('languageChanged', handleLanguageChanged);

        // Clean up loaded namespaces on unmount to prevent memory leaks
        const loadedNamespaces = i18n.reportNamespaces?.getUsedNamespaces() || [];
        loadedNamespaces.forEach(ns => {
          // Only remove non-critical namespaces
          if (!['common', 'errors'].includes(ns)) {
            i18n.removeResourceBundle(currentLocale, ns);
          }
        });
      }
    };
  }, [currentLocale]);

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
    <I18nContext.Provider value={{ locale: currentLocale, isLoading, changeLanguage }}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

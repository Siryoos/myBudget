'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n, initI18n } from './i18n';

// Use the centralized i18n initialization from lib/i18n.ts

interface I18nProviderProps {
  children: React.ReactNode;
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

/**
 * React provider that initializes and manages i18n state, exposes locale controls, and wraps children with i18next context.
 *
 * Initializes i18n (via initI18n), synchronizes with the optional `locale` prop, loads critical namespaces, and exposes a `changeLanguage` function through I18nContext. Handles initialization timeouts, a fallback minimal init path, and cleanup of non-critical namespaces on unmount. While initializing a full-screen loading UI is rendered; on initialization failure the provider renders children with a limited i18n context or without i18n if initialization did not complete.
 *
 * The provided I18nContext value shape: { locale: string; isLoading: boolean; changeLanguage: (newLocale: string) => Promise<void> }.
 *
 * @param children - React nodes to render inside the provider.
 * @param locale - Initial locale to use (default: 'en'). Should be a locale string recognized by the i18n configuration (e.g., "en", "fr").
 * @returns A React element that provides i18n context and (when available) an I18nextProvider wrapping `children`.
 */
export function I18nProvider({ children, locale = 'en' }: I18nProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [hasError, setHasError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const changeLanguage = async (newLocale: string) => {
    try {
      setIsLoading(true);
      setHasError(false);
      console.log(`Changing language from ${currentLocale} to ${newLocale}`);

      // Simply change language - let i18next handle resource management
      if (i18n.isInitialized) {
        await i18n.changeLanguage(newLocale);

        // Ensure critical namespaces are loaded for the new locale
        const criticalNamespaces = ['common', 'dashboard'];
        await Promise.all(
          criticalNamespaces.map(ns =>
            i18n.loadNamespaces(ns),
          ),
        );
      }

      setCurrentLocale(newLocale);
      setIsLoading(false);
      console.log(`✅ Language changed to ${newLocale}`);
    } catch (error) {
      console.error(`❌ Failed to change language to ${newLocale}:`, error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      // Prevent race conditions by checking if already initializing
      if (isInitializing) {
        console.log('🔄 i18n initialization already in progress, waiting...');
        return;
      }

      setIsInitializing(true);

      try {
        console.log('🔄 Starting i18n initialization...');
        const success = await initI18n();

        if (!success) {
          console.warn('⚠️ i18n initialization failed, trying fallback...');
          // Try minimal initialization
          try {
            await i18n.init({
              fallbackLng: 'en',
              debug: false,
              ns: ['common'],
              defaultNS: 'common',
              interpolation: { escapeValue: false },
            });
            console.log('✅ Fallback i18n initialization successful');
          } catch (fallbackError) {
            console.error('❌ Fallback i18n initialization also failed:', fallbackError);
            setHasError(true);
            setIsLoading(false);
            setIsInitializing(false);
            return;
          }
        }

        // Change language if locale prop changes
        if (i18n.language !== locale) {
          console.log(`🔄 Changing language to ${locale}...`);
          await i18n.changeLanguage(locale);
        }

        // Ensure all required namespaces are loaded for the current locale
        const requiredNamespaces = ['common', 'dashboard'];
        console.log(`🔄 Loading namespaces: ${requiredNamespaces.join(', ')}...`);
        await Promise.all(
          requiredNamespaces.map(ns =>
            i18n.loadNamespaces(ns),
          ),
        );

        setCurrentLocale(locale);
        setIsLoading(false);
        setIsInitializing(false);
        console.log('✅ I18nProvider initialization complete');
      } catch (error) {
        console.error('❌ I18nProvider initialization failed:', error);
        setHasError(true);
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ i18n initialization timeout, forcing completion');
      setIsLoading(false);
      setIsInitializing(false);
    }, 10000);

    void initialize();

    return () => {
      clearTimeout(timeoutId);
      setIsInitializing(false);
    };
  }, [locale, isInitializing]);

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
        // Use a safer approach by tracking namespaces that were loaded during this session
        const allLanguages = i18n.languages || [];
        const criticalNamespaces = ['common', 'errors'];

        allLanguages.forEach(lang => {
          // Get loaded namespaces for this language
          const loadedNamespaces = Object.keys(i18n.getResourceBundle(lang, '') || {});
          loadedNamespaces.forEach(ns => {
            // Only remove non-critical namespaces to prevent memory leaks
            if (!criticalNamespaces.includes(ns)) {
              try {
                i18n.removeResourceBundle(lang, ns);
              } catch (error) {
                // Silently handle cleanup errors
                console.debug('Failed to clean up namespace:', ns, error);
              }
            }
          });
        });
      }
    };
  }, [currentLocale]);

  // Show loading state while i18n is initializing
  if (isLoading) {
    console.log('🔄 I18nProvider is in loading state...');
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
          <p className="text-neutral-gray">Loading...</p>
          <p className="text-sm text-neutral-gray mt-2">Initializing translations...</p>
        </div>
      </div>
    );
  }

  // Show error state if i18n failed to initialize
  if (hasError) {
    console.warn('⚠️ I18nProvider showing error state, rendering children anyway');
    return (
      <I18nContext.Provider value={{ locale: currentLocale, isLoading: false, changeLanguage }}>
        <I18nextProvider i18n={i18n}>
          {children}
        </I18nextProvider>
      </I18nContext.Provider>
    );
  }

  // Final fallback: if everything fails, just render children without i18n
  if (!i18n.isInitialized) {
    console.warn('⚠️ i18n not initialized, rendering children without i18n context');
    return (
      <I18nContext.Provider value={{ locale: currentLocale, isLoading: false, changeLanguage }}>
        {children}
      </I18nContext.Provider>
    );
  }

  console.log('✅ I18nProvider rendering children with locale:', currentLocale);
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

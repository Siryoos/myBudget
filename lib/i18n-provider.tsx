'use client';

import { createContext, useContext, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Initialize i18next
i18n
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
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['cookie'],
      lookupCookie: 'NEXT_LOCALE',
    },
    react: {
      useSuspense: false,
    },
  });

interface I18nProviderProps {
  children: ReactNode;
  locale?: string;
}

const I18nContext = createContext<{
  locale: string;
}>({
  locale: 'en',
});

export function I18nProvider({ children, locale = 'en' }: I18nProviderProps) {
  // Change language if locale prop changes
  if (i18n.language !== locale) {
    i18n.changeLanguage(locale);
  }

  return (
    <I18nContext.Provider value={{ locale }}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import i18n from 'i18next';
import { useI18n } from './i18n-provider';

export function useTranslation(namespace?: string | string[]) {
  const [isReady, setIsReady] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const translation = useI18nextTranslation(namespace);
  const { locale, changeLanguage } = useI18n();

  const checkReady = useCallback(() => {
    const namespaces = Array.isArray(namespace) ? namespace : [namespace || 'common'];
    const allLoaded = namespaces.every(ns => i18n.hasLoadedNamespace(ns));
    
    if (allLoaded || i18n.isInitialized) {
      setIsReady(true);
    }
  }, [namespace]);

  useEffect(() => {
    // Check immediately
    checkReady();

    // Listen for namespace loaded events
    const handleLoaded = () => {
      checkReady();
      setForceUpdate(prev => prev + 1);
    };
    
    const handleLanguageChanged = () => {
      checkReady();
      setForceUpdate(prev => prev + 1);
    };

    i18n.on('loaded', handleLoaded);
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('loaded', handleLoaded);
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [checkReady, locale]);

  // Force re-render when language changes
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [locale]);

  const t: (key: string, options?: Record<string, any>) => string = (key, options) => {
    // Always try to translate, even if not ready
    try {
      if (translation.t && typeof translation.t === 'function') {
        const result = (translation.t as unknown as (k: string, o?: any) => string)(key, options);
        // If translation returns the key, it might not be loaded yet
        if (result === key && !isReady) {
          // Return loading placeholder or default value
          return options?.defaultValue || options?.loadingPlaceholder || '...';
        }
        return result;
      }
    } catch (error) {
      console.warn('Translation error:', error);
    }
    
    // Fallback to default value or key
    return options?.defaultValue || key;
  };

  // Enhanced changeLanguage function that ensures all components are updated
  const enhancedChangeLanguage = useCallback(async (newLocale: string) => {
    try {
      // Use the provider's changeLanguage function
      await changeLanguage(newLocale);
      
      // Force a re-render of all components using this hook
      setForceUpdate(prev => prev + 1);
      
      // Clear any cached translations
      if (i18n.isInitialized) {
        const namespaces = Array.isArray(namespace) ? namespace : [namespace || 'common'];
        namespaces.forEach(ns => {
          i18n.removeResourceBundle(locale, ns);
        });
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }, [changeLanguage, locale, namespace]);

  return {
    ...translation,
    isReady,
    t,
    changeLanguage: enhancedChangeLanguage,
    forceUpdate,
  };
}

import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import i18n from 'i18next';

export function useTranslation(namespace?: string | string[]) {
  const [isReady, setIsReady] = useState(false);
  const translation = useI18nextTranslation(namespace);

  useEffect(() => {
    const checkReady = () => {
      const namespaces = Array.isArray(namespace) ? namespace : [namespace || 'common'];
      const allLoaded = namespaces.every(ns => i18n.hasLoadedNamespace(ns));
      
      if (allLoaded || i18n.isInitialized) {
        setIsReady(true);
      }
    };

    // Check immediately
    checkReady();

    // Listen for namespace loaded events
    const handleLoaded = () => checkReady();
    i18n.on('loaded', handleLoaded);
    i18n.on('languageChanged', handleLoaded);

    return () => {
      i18n.off('loaded', handleLoaded);
      i18n.off('languageChanged', handleLoaded);
    };
  }, [namespace]);

  const t: (key: string, options?: Record<string, any>) => string = (key, options) => {
    if (!isReady) {
      if (options && typeof options.defaultValue === 'string') return options.defaultValue;
      return key;
    }
    // Cast to a broadly compatible signature
    return (translation.t as unknown as (k: string, o?: any) => string)(key, options);
  };

  return {
    ...translation,
    isReady,
    t,
  };
}

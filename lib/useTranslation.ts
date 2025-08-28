import { useCallback, useEffect, useState } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';

/**
 * React hook that wraps react-i18next's translation utilities and exposes a curated i18n API.
 *
 * Uses react-i18next's useTranslation(namespace) under the hood and returns a safe translate
 * function plus helpers for language/resource management.
 *
 * @param namespace - Optional namespace to scope translations (passed to react-i18next's hook).
 * @returns An object containing:
 *  - `t`: safe translate function that returns the key on error,
 *  - `i18n`: the underlying i18n instance,
 *  - `ready`: boolean indicating whether translations are ready,
 *  - `changeLanguage(language)`: async language switcher,
 *  - `getCurrentLanguage()`: current language code,
 *  - `getAvailableLanguages()`: available language codes,
 *  - resource helpers: `hasResourceBundle`, `loadNamespaces`, `loadLanguages`, `reloadResources`,
 *    `getDataByLanguage`, `hasLoadedNamespace`, `getResource`, `addResource`, `addResources`,
 *    `addResourceBundle`, `removeResourceBundle`.
 */
export const useTranslation = (namespace?: string) => {
  const { t, i18n, ready } = useI18nTranslation(namespace);
  const [isReady, setIsReady] = useState(ready);

  useEffect(() => {
    setIsReady(ready);
  }, [ready]);

  const translate = useCallback((key: string, options?: Record<string, unknown>): string => {
    try {
      return t(key, options);
    } catch (error) {
      // console.error('Translation error:', error);
      return key;
    }
  }, [t]);

  const changeLanguage = useCallback(async (language: string) => {
    try {
      await i18n.changeLanguage(language);
    } catch (error) {
      // console.error('Language change error:', error);
    }
  }, [i18n]);

  const getCurrentLanguage = useCallback((): string => i18n.language, [i18n]);

  const getAvailableLanguages = useCallback((): readonly string[] => i18n.languages, [i18n]);

  const hasResourceBundle = useCallback(
    (language: string, ns: string): boolean => i18n.hasResourceBundle(language, ns),
    [i18n]
  );

  const loadNamespaces = useCallback(async (namespaces: string | string[]) => {
    try {
      await i18n.loadNamespaces(namespaces);
    } catch (error) {
      // console.error('Namespace loading error:', error);
    }
  }, [i18n]);

  const loadLanguages = useCallback(async (languages: string | string[]) => {
    try {
      await i18n.loadLanguages(languages);
    } catch (error) {
      // console.error('Language loading error:', error);
    }
  }, [i18n]);

  const reloadResources = useCallback(
    async (languages?: string | string[], namespaces?: string | string[]) => {
      try {
        await i18n.reloadResources(languages, namespaces);
      } catch (error) {
        // console.error('Resource reload error:', error);
      }
    },
    [i18n]
  );

  const getDataByLanguage = useCallback(
    (language: string) => i18n.getDataByLanguage(language),
    [i18n]
  );

  const hasLoadedNamespace = useCallback(
    (namespace: string): boolean => i18n.hasLoadedNamespace(namespace),
    [i18n]
  );

  const getResource = useCallback(
    (language: string, namespace: string, key: string, options?: Record<string, unknown>) =>
      i18n.getResource(language, namespace, key, options),
    [i18n]
  );

  const addResource = useCallback(
    (
      language: string,
      namespace: string,
      key: string,
      value: string,
      options?: Record<string, unknown>
    ) => {
      i18n.addResource(language, namespace, key, value, options);
    },
    [i18n]
  );

  const addResources = useCallback((language: string, namespace: string, resources: Record<string, string>) => {
    i18n.addResources(language, namespace, resources);
  }, [i18n]);

  const addResourceBundle = useCallback(
    (
      language: string,
      namespace: string,
      resources: Record<string, unknown>,
      deep?: boolean,
      overwrite?: boolean
    ) => {
      i18n.addResourceBundle(language, namespace, resources, deep, overwrite);
    },
    [i18n]
  );

  const removeResourceBundle = useCallback((language: string, namespace: string) => {
    i18n.removeResourceBundle(language, namespace);
  }, [i18n]);

  return {
    t: translate,
    i18n,
    ready: isReady,
    changeLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    hasResourceBundle,
    loadNamespaces,
    loadLanguages,
    reloadResources,
    getDataByLanguage,
    hasLoadedNamespace,
    getResource,
    addResource,
    addResources,
    addResourceBundle,
    removeResourceBundle,
  };
};

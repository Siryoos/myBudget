module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fa', 'ar'],
    localeDetection: true,
  },
  fallbackLng: 'en',
  ns: [
    'common',
    'dashboard',
    'budget',
    'goals',
    'transactions',
    'education',
    'settings',
    'auth',
    'errors'
  ],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false
  },
  react: {
    useSuspense: false
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};

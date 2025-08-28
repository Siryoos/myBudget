import { format, formatDistanceToNow } from 'date-fns';
import { enUS, ar, faIR } from 'date-fns/locale';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

// RTL locales
const RTL_LOCALES = ['fa', 'ar'];

// Date locales mapping
const DATE_LOCALES = {
  en: enUS,
  ar,
  fa: faIR,
};

// Currency configurations
const CURRENCY_CONFIG = {
  en: {
    code: 'USD',
    symbol: '$',
    position: 'before',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  fa: {
    code: 'IRR',
    symbol: '﷼',
    position: 'after',
    decimals: 0,
    thousandsSeparator: '٬',
    decimalSeparator: '٫',
  },
  ar: {
    code: 'SAR',
    symbol: 'ر.س',
    position: 'after',
    decimals: 2,
    thousandsSeparator: '٬',
    decimalSeparator: '٫',
  },
};

// Number formatting for different locales
const NUMBER_SYSTEMS = {
  en: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  fa: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
  ar: ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
};

const i18n = i18next
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next);

const initI18n = async function(): Promise<boolean> {
  try {
    await i18n.init({
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',
      ns: ['common', 'dashboard', 'budget', 'goals', 'transactions', 'education', 'settings', 'auth', 'errors'],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false,
      },
      backend: {
        loadPath: '/api/locales/{{lng}}/{{ns}}',
        requestOptions: {
          cache: 'no-store',
        },
      },
      detection: {
        order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage', 'cookie'],
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    return false;
  }
};

const changeLanguage = async function(lng: string) {
  await i18n.changeLanguage(lng);
};

const getCurrentLanguage = function() {
  return i18n.language;
};

const getAvailableLanguages = function() {
  return i18n.languages;
};

const addResourceBundle = function(lng: string, ns: string, resources: Record<string, unknown>, deep?: boolean, overwrite?: boolean) {
  i18n.addResourceBundle(lng, ns, resources, deep, overwrite);
};

const hasResourceBundle = function(lng: string, ns: string) {
  return i18n.hasResourceBundle(lng, ns);
};

const getResourceBundle = function(lng: string, ns: string) {
  return i18n.getResourceBundle(lng, ns);
};

const removeResourceBundle = function(lng: string, ns: string) {
  i18n.removeResourceBundle(lng, ns);
};

const getFixedT = function(lng: string, ns: string) {
  return i18n.getFixedT(lng, ns);
};

const exists = function(key: string, options?: { lng?: string; ns?: string }) {
  return i18n.exists(key, options);
};

const t = function(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options);
};

const loadNamespaces = async function(ns: string | string[]) {
  await i18n.loadNamespaces(ns);
};

const loadLanguages = async function(lngs: string | string[]) {
  await i18n.loadLanguages(lngs);
};

const reloadResources = async function(lngs?: string | string[], ns?: string | string[]) {
  await i18n.reloadResources(lngs, ns);
};

const getDataByLanguage = function(lng: string) {
  return i18n.getDataByLanguage(lng);
};

const hasLoadedNamespace = function(ns: string) {
  return i18n.hasLoadedNamespace(ns);
};

const getResource = function(lng: string, ns: string, key: string, options?: Record<string, unknown>) {
  return i18n.getResource(lng, ns, key, options);
};

const addResource = function(lng: string, ns: string, key: string, value: string, options?: Record<string, unknown>) {
  i18n.addResource(lng, ns, key, value, options);
};

const addResources = function(lng: string, ns: string, resources: Record<string, string>) {
  i18n.addResources(lng, ns, resources);
};

/**
 * Get text direction for a locale
 */
export function getDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}

/**
 * Convert Arabic/Latin digits in a number or numeric string into the locale's digit glyphs.
 *
 * Falls back to English digits when the locale is not recognized. Non-digit characters are preserved.
 *
 * @param num - Numeric value or numeric string to convert.
 * @param locale - Locale code used to select digit glyphs (e.g., 'en', 'fa', 'ar').
 * @returns The input formatted as a string with digits replaced by the locale's digit glyphs.
 */
export function toLocaleDigits(num: number | string, locale: string): string {
  const digits = NUMBER_SYSTEMS[locale as keyof typeof NUMBER_SYSTEMS] || NUMBER_SYSTEMS.en;
  return String(num).replace(/[0-9]/g, (digit) => digits[parseInt(digit, 10)]);
}

/**
 * Format number with locale-specific formatting
 */
export function formatNumber(num: number, locale: string, options?: Intl.NumberFormatOptions): string {
  const formatted = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar-SA' : 'en-US', options).format(num);
  return formatted;
}

/**
 * Format a numeric amount as a locale-aware currency string.
 *
 * Uses the module's currency configuration for the given `locale` (symbol, placement,
 * decimal count and separators) and delegates numeric formatting to `formatNumber`.
 *
 * @param amount - The monetary value in major units (e.g., 1234.5 represents 1,234.50)
 * @param locale - Locale key used to look up currency configuration (falls back to `en`)
 * @returns A formatted currency string including the currency symbol in the configured position
 */
export function formatCurrency(amount: number, locale: string): string {
  const config = CURRENCY_CONFIG[locale as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.en;

  const formattedNumber = formatNumber(amount, locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  if (config.position === 'before') {
    return `${config.symbol}${formattedNumber}`;
  }
  return `${formattedNumber} ${config.symbol}`;
}

/**
 * Format date with locale-specific formatting
 */
export function formatDate(date: Date | string | number, locale: string, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const dateLocale = DATE_LOCALES[locale as keyof typeof DATE_LOCALES] || DATE_LOCALES.en;

  return format(dateObj, formatStr, { locale: dateLocale });
}

/**
 * Format relative time with locale-specific formatting
 */
export function formatRelativeTime(date: Date | string | number, locale: string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const dateLocale = DATE_LOCALES[locale as keyof typeof DATE_LOCALES] || DATE_LOCALES.en;

  return formatDistanceToNow(dateObj, { locale: dateLocale, addSuffix: true });
}

/**
 * Get locale-specific date format pattern
 */
export function getDateFormat(locale: string): string {
  const formats = {
    en: 'MM/dd/yyyy',
    fa: 'yyyy/MM/dd',
    ar: 'dd/MM/yyyy',
  };

  return formats[locale as keyof typeof formats] || formats.en;
}

/**
 * Get locale-specific time format pattern
 */
export function getTimeFormat(locale: string, is24Hour: boolean = false): string {
  if (is24Hour) {
    return 'HH:mm';
  }

  const formats = {
    en: 'h:mm a',
    fa: 'HH:mm',
    ar: 'h:mm a',
  };

  return formats[locale as keyof typeof formats] || formats.en;
}

/**
 * Parse locale-specific number input
 */
export function parseLocaleNumber(value: string, locale: string): number {
  // Remove currency symbols and spaces
  let cleaned = value.replace(/[^\d.,٫٬۰-۹٠-٩-]/g, '');

  // Convert locale digits to Western digits
  const westernDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const localeDigits = NUMBER_SYSTEMS[locale as keyof typeof NUMBER_SYSTEMS] || NUMBER_SYSTEMS.en;

  localeDigits.forEach((digit, index) => {
    cleaned = cleaned.replace(new RegExp(digit, 'g'), westernDigits[index]);
  });

  // Handle decimal separators
  const config = CURRENCY_CONFIG[locale as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.en;
  cleaned = cleaned.replace(new RegExp(`\\${config.thousandsSeparator}`, 'g'), '');
  cleaned = cleaned.replace(new RegExp(`\\${config.decimalSeparator}`, 'g'), '.');

  return parseFloat(cleaned) || 0;
}

/**
 * Get locale-specific currency symbol
 */
export function getCurrencySymbol(locale: string): string {
  const config = CURRENCY_CONFIG[locale as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.en;
  return config.symbol;
}

/**
 * Returns the ISO 4217 currency code for the given locale.
 *
 * Falls back to the default English currency configuration if the locale is not recognized.
 *
 * @param locale - Locale identifier (e.g., `'en'`, `'fa'`, `'ar'`) used to look up the currency configuration
 * @returns The currency code (e.g., `USD`, `IRR`, `SAR`) for the resolved locale
 */
export function getCurrencyCode(locale: string): string {
  const config = CURRENCY_CONFIG[locale as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.en;
  return config.code;
}

// Export i18n instance and functions
export { i18n, initI18n, changeLanguage, getCurrentLanguage, getAvailableLanguages, addResourceBundle, hasResourceBundle, getResourceBundle, removeResourceBundle, getFixedT, exists, t, loadNamespaces, loadLanguages, reloadResources, getDataByLanguage, hasLoadedNamespace, getResource, addResource, addResources };

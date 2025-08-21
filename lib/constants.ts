/**
 * Application constants for supported currencies and languages
 */

// Supported ISO currency codes (major currencies)
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
  'KRW', 'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF',
  'RUB', 'TRY', 'ZAR', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'BDT', 'PKR'
] as const;

// Supported language locales (ISO 639-1)
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'bn', 'ur', 'fa', 'tr', 'nl', 'sv', 'da', 'no',
  'fi', 'pl', 'cs', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl', 'et',
  'lv', 'lt', 'mt', 'el', 'he', 'th', 'vi', 'id', 'ms', 'tl'
] as const;

// Type definitions for TypeScript
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Default values
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Currency display names
export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  BRL: 'Brazilian Real',
  KRW: 'South Korean Won',
  MXN: 'Mexican Peso',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  NOK: 'Norwegian Krone',
  SEK: 'Swedish Krona',
  DKK: 'Danish Krone',
  PLN: 'Polish Złoty',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  RUB: 'Russian Ruble',
  TRY: 'Turkish Lira',
  ZAR: 'South African Rand',
  THB: 'Thai Baht',
  MYR: 'Malaysian Ringgit',
  IDR: 'Indonesian Rupiah',
  PHP: 'Philippine Peso',
  VND: 'Vietnamese Dong',
  BDT: 'Bangladeshi Taka',
  PKR: 'Pakistani Rupee'
};

// Language display names
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ar: 'العربية',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ur: 'اردو',
  fa: 'فارسی',
  tr: 'Türkçe',
  nl: 'Nederlands',
  sv: 'Svenska',
  da: 'Dansk',
  no: 'Norsk',
  fi: 'Suomi',
  pl: 'Polski',
  cs: 'Čeština',
  hu: 'Magyar',
  ro: 'Română',
  bg: 'Български',
  hr: 'Hrvatski',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  et: 'Eesti',
  lv: 'Latviešu',
  lt: 'Lietuvių',
  mt: 'Malti',
  el: 'Ελληνικά',
  he: 'עברית',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  tl: 'Tagalog'
};

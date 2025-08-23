import { format, formatDistanceToNow } from 'date-fns';
import { enUS, ar, faIR } from 'date-fns/locale';

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

/**
 * Get text direction for a locale
 */
export function getDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}

/**
 * Convert number to locale-specific digits
 */
export function toLocaleDigits(num: number | string, locale: string): string {
  const digits = NUMBER_SYSTEMS[locale as keyof typeof NUMBER_SYSTEMS] || NUMBER_SYSTEMS.en;
  return String(num).replace(/[0-9]/g, (digit) => digits[parseInt(digit)]);
}

/**
 * Format number with locale-specific formatting
 */
export function formatNumber(num: number, locale: string, options?: Intl.NumberFormatOptions): string {
  const formatted = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar-SA' : 'en-US', options).format(num);
  return formatted;
}

/**
 * Format currency with locale-specific formatting
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
 * Get locale-specific currency code
 */
export function getCurrencyCode(locale: string): string {
  const config = CURRENCY_CONFIG[locale as keyof typeof CURRENCY_CONFIG] || CURRENCY_CONFIG.en;
  return config.code;
}

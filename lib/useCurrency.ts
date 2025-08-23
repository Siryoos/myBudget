import { formatCurrency as formatCurrencyI18n } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n-provider';

/**
 * Custom hook for currency formatting with localization
 */
export function useCurrency() {
  const { locale } = useI18n();

  const formatCurrency = (amount: number): string => formatCurrencyI18n(amount, locale);

  return {
    formatCurrency,
    locale,
  };
}

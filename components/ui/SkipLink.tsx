'use client';

import { useTranslation } from '@/lib/useTranslation';

export const SkipLink = () => {
  const { t } = useTranslation('common');
  
  return (
    <a
      href="#main-content"
      className="absolute left-0 top-0 -translate-y-full focus:translate-y-0 bg-primary-trust-blue text-white px-4 py-2 z-[10000] transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-trust-blue"
    >
      {t('skipLink.main', { defaultValue: 'Skip to main content' })}
    </a>
  );
};
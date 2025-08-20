'use client'

import { useTranslation } from 'react-i18next'

export function BudgetHeader() {
  const { t } = useTranslation('budget')

  return (
    <div className="bg-gradient-to-r from-primary-trust-blue to-primary-trust-blue-light rounded-lg p-6 text-white">
      <h1 className="text-3xl font-bold mb-2">{t('page.title')}</h1>
      <p className="text-primary-trust-blue-light">
        {t('page.subtitle')}
      </p>
    </div>
  )
}

export default BudgetHeader



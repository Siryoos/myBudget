'use client';

import { useEffect, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/useTranslation';

type StepKey = 'pickMethod' | 'createGoal' | 'addTransaction';

const STORAGE_KEY = 'smartsave.onboarding.v1';

export function OnboardingChecklist() {
  const { t } = useTranslation('dashboard');
  const [visible, setVisible] = useState(true);
  const [steps, setSteps] = useState<Record<StepKey, boolean>>({
    pickMethod: false,
    createGoal: false,
    addTransaction: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setSteps({ ...steps, ...parsed.steps });
          setVisible(parsed.visible !== false);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ steps, visible }));
    } catch {}
  }, [steps, visible]);

  const complete = Object.values(steps).every(Boolean);
  if (!visible || complete) return null;

  const toggle = (key: StepKey) => setSteps(s => ({ ...s, [key]: !s[key] }));

  return (
    <Card data-tour="onboarding-checklist">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('onboarding.title', { defaultValue: 'Let’s get you set up' })}
            </h3>
            <p className="text-sm text-neutral-gray">
              {t('onboarding.subtitle', { defaultValue: 'A quick checklist to personalize your experience.' })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setVisible(false)}>
            {t('onboarding.dismiss', { defaultValue: 'Dismiss' })}
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-neutral-gray/30 text-primary-trust-blue focus:ring-primary-trust-blue"
              checked={steps.pickMethod}
              onChange={() => toggle('pickMethod')}
            />
            <span>
              <span className="block text-sm font-medium text-neutral-dark-gray">
                {t('onboarding.pickMethod.title', { defaultValue: 'Choose a budgeting method' })}
              </span>
              <span className="block text-xs text-neutral-gray">
                {t('onboarding.pickMethod.desc', { defaultValue: 'Explore 50/30/20, Zero‑based, Envelope, and more to find your fit.' })}
              </span>
            </span>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-neutral-gray/30 text-primary-trust-blue focus:ring-primary-trust-blue"
              checked={steps.createGoal}
              onChange={() => toggle('createGoal')}
            />
            <span>
              <span className="block text-sm font-medium text-neutral-dark-gray">
                {t('onboarding.createGoal.title', { defaultValue: 'Create your first savings goal' })}
              </span>
              <span className="block text-xs text-neutral-gray">
                {t('onboarding.createGoal.desc', { defaultValue: 'Use templates (Emergency Fund, Vacation, etc.) or create your own.' })}
              </span>
            </span>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-neutral-gray/30 text-primary-trust-blue focus:ring-primary-trust-blue"
              checked={steps.addTransaction}
              onChange={() => toggle('addTransaction')}
            />
            <span>
              <span className="block text-sm font-medium text-neutral-dark-gray">
                {t('onboarding.addTransaction.title', { defaultValue: 'Add or import transactions' })}
              </span>
              <span className="block text-xs text-neutral-gray">
                {t('onboarding.addTransaction.desc', { defaultValue: 'Start tracking spending to unlock insights and budgets.' })}
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={() => setVisible(false)}>
            {t('onboarding.later', { defaultValue: 'Do this later' })}
          </Button>
          <Button
            size="sm"
            onClick={() => setSteps({ pickMethod: true, createGoal: true, addTransaction: true })}
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            {t('onboarding.complete', { defaultValue: 'Mark as complete' })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


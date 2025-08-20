'use client'

import { useState } from 'react'
import { 
  BanknotesIcon,
  PlusIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, sanitizeNumberInput } from '@/lib/utils'
import { useTranslation } from '@/lib/useTranslation'

interface QuickSaveWidgetProps {
  defaultAmounts?: number[]
  customAmountEnabled?: boolean
  celebrationAnimation?: boolean
}

export function QuickSaveWidget({
  defaultAmounts = [10, 25, 50, 100],
  customAmountEnabled = true,
  celebrationAnimation = true,
}: QuickSaveWidgetProps) {
  const { t } = useTranslation(['dashboard'])
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const handleQuickSave = async (amount: number) => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (celebrationAnimation) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 2000)
      }
      
      // Reset form
      setSelectedAmount(null)
      setCustomAmount('')
      setShowCustomInput(false)
      
      console.log(`Saved ${formatCurrency(amount)}`)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomAmountSubmit = () => {
    const amount = sanitizeNumberInput(customAmount)
    if (amount > 0) {
      handleQuickSave(amount)
    }
  }

  const getSelectedAmount = () => {
    if (showCustomInput) {
      return sanitizeNumberInput(customAmount)
    }
    return selectedAmount || 0
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center">
          <div className="bg-secondary-growth-green/10 rounded-lg p-2 mr-3">
            <BanknotesIcon className="h-6 w-6 text-secondary-growth-green" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('dashboard:quickSave.title', { defaultValue: 'Quick Save' })}
            </h3>
            <p className="text-sm text-neutral-gray">
              {t('dashboard:quickSave.description', { defaultValue: 'Every dollar saved is a step towards your goals' })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Celebration overlay */}
        {showCelebration && (
          <div className="absolute inset-0 bg-secondary-growth-green/10 flex items-center justify-center z-10 animate-celebrate">
            <div className="text-center">
              <SparklesIcon className="h-12 w-12 text-secondary-growth-green mx-auto mb-2 animate-bounce" />
              <div className="text-lg font-bold text-secondary-growth-green">
                {t('dashboard:quickSave.greatJob', { defaultValue: 'Great job! 🎉' })}
              </div>
              <div className="text-sm text-neutral-gray">
                {t('dashboard:quickSave.successfullySaved', { defaultValue: 'You\'ve successfully saved' })} {formatCurrency(getSelectedAmount())}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
              {t('dashboard:quickSave.chooseAmount', { defaultValue: 'Choose an amount' })}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {defaultAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount)
                    setShowCustomInput(false)
                    setCustomAmount('')
                  }}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                    selectedAmount === amount && !showCustomInput
                      ? 'border-secondary-growth-green bg-secondary-growth-green/10 text-secondary-growth-green'
                      : 'border-neutral-gray/30 hover:border-secondary-growth-green/50 text-neutral-dark-gray'
                  }`}
                  disabled={isLoading}
                >
                  <div className="font-semibold">{formatCurrency(amount)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          {customAmountEnabled && (
            <div>
              <button
                onClick={() => {
                  setShowCustomInput(!showCustomInput)
                  setSelectedAmount(null)
                }}
                className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                  showCustomInput
                    ? 'border-secondary-growth-green bg-secondary-growth-green/10 text-secondary-growth-green'
                    : 'border-neutral-gray/30 hover:border-secondary-growth-green/50 text-neutral-dark-gray'
                }`}
                disabled={isLoading}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {t('dashboard:quickSave.customAmount', { defaultValue: 'Custom Amount' })}
              </button>

              {showCustomInput && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label htmlFor="custom-amount" className="sr-only">
                      {t('dashboard:quickSave.customAmount', { defaultValue: 'Enter custom amount' })}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-neutral-gray">$</span>
                      </div>
                      <input
                        id="custom-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="block w-full pl-7 pr-3 py-2 border border-neutral-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-growth-green focus:border-secondary-growth-green"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => {
              if (showCustomInput) {
                handleCustomAmountSubmit()
              } else if (selectedAmount) {
                handleQuickSave(selectedAmount)
              }
            }}
            disabled={isLoading || (!selectedAmount && !showCustomInput) || (showCustomInput && !customAmount)}
            loading={isLoading}
          >
            {isLoading ? (
              t('dashboard:quickSave.saving', { defaultValue: 'Saving...' })
            ) : (
              <>
                <BanknotesIcon className="h-5 w-5 mr-2" />
                {t('dashboard:quickSave.save', { defaultValue: 'Save' })} {formatCurrency(getSelectedAmount())}
              </>
            )}
          </Button>

          {/* Motivational Message */}
          <div className="bg-primary-trust-blue/5 rounded-lg p-3 text-center">
            <p className="text-sm text-primary-trust-blue font-medium">
              {t('dashboard:quickSave.tip', { defaultValue: '💡 Tip: Small, consistent savings add up quickly!' })}
            </p>
            <p className="text-xs text-neutral-gray mt-1">
              {t('dashboard:quickSave.weeklySavings', { 
                amount: formatCurrency(25), 
                annual: formatCurrency(1300),
                defaultValue: 'Saving $25 weekly = $1,300 annually'
              })}
            </p>
          </div>

          {/* Recent Savings */}
          <div className="border-t border-neutral-gray/20 pt-4">
            <h4 className="text-sm font-medium text-neutral-dark-gray mb-2">
              {t('dashboard:quickSave.recentSaves', { defaultValue: 'Recent Quick Saves' })}
            </h4>
            <div className="space-y-2">
              {[
                { amount: 50, date: 'Today' },
                { amount: 25, date: 'Yesterday' },
                { amount: 100, date: '3 days ago' },
              ].map((save, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-gray">{save.date}</span>
                  <span className="font-medium text-secondary-growth-green">
                    +{formatCurrency(save.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

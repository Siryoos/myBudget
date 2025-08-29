'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/useTranslation';
import { Button } from '@/components/ui/Button';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export interface TourStep {
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  actions?: TourAction[];
  spotlightPadding?: number;
  skipable?: boolean;
}

export interface TourAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  storageKey?: string;
  startTour?: boolean;
  showProgress?: boolean;
  allowKeyboardNavigation?: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: TourStep['placement'];
}

export function OnboardingTour({
  steps,
  onComplete,
  onSkip,
  storageKey = 'smartsave-onboarding',
  startTour = false,
  showProgress = true,
  allowKeyboardNavigation = true,
}: OnboardingTourProps) {
  const { t } = useTranslation('onboarding');
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if tour has been completed before
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const completed = localStorage.getItem(storageKey);
      if (!completed && startTour) {
        setIsActive(true);
      }
    } else if (startTour) {
      setIsActive(true);
    }
  }, [storageKey, startTour]);

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const findTarget = () => {
      const target = document.querySelector(steps[currentStep].target);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        
        // Calculate tooltip position
        const placement = steps[currentStep].placement || 'bottom';
        const padding = 20;
        let position: TooltipPosition = {
          top: 0,
          left: 0,
          placement,
        };

        switch (placement) {
          case 'top':
            position.top = rect.top - padding;
            position.left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            position.top = rect.bottom + padding;
            position.left = rect.left + rect.width / 2;
            break;
          case 'left':
            position.top = rect.top + rect.height / 2;
            position.left = rect.left - padding;
            break;
          case 'right':
            position.top = rect.top + rect.height / 2;
            position.left = rect.right + padding;
            break;
          case 'center':
            position.top = window.innerHeight / 2;
            position.left = window.innerWidth / 2;
            break;
        }

        setTooltipPosition(position);

        // Scroll element into view
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    };

    // Initial find
    findTarget();

    // Re-find on window resize
    const handleResize = () => findTarget();
    window.addEventListener('resize', handleResize);
    
    // Re-find periodically in case of DOM changes
    const interval = setInterval(findTarget, 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [isActive, currentStep, steps]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive || !allowKeyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleSkip();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, allowKeyboardNavigation]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsActive(false);
    onSkip?.();
  };

  const handleComplete = () => {
    setIsActive(false);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'completed');
    }
    onComplete?.();
  };

  const startTourAgain = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        onClick={(e) => {
          if (e.target === overlayRef.current && currentStepData.skipable !== false) {
            handleSkip();
          }
        }}
      >
        {/* Dark overlay with spotlight */}
        <div className="absolute inset-0 bg-black/50">
          {targetRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bg-transparent"
              style={{
                top: targetRect.top - (currentStepData.spotlightPadding || 8),
                left: targetRect.left - (currentStepData.spotlightPadding || 8),
                width: targetRect.width + (currentStepData.spotlightPadding || 8) * 2,
                height: targetRect.height + (currentStepData.spotlightPadding || 8) * 2,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                borderRadius: '8px',
              }}
            />
          )}
        </div>

        {/* Tooltip */}
        {tooltipPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bg-white rounded-lg shadow-2xl p-6 max-w-sm"
            style={{
              top: tooltipPosition.placement === 'bottom' ? tooltipPosition.top : 
                   tooltipPosition.placement === 'top' ? tooltipPosition.top - 200 :
                   tooltipPosition.top - 100,
              left: tooltipPosition.placement === 'left' ? tooltipPosition.left - 350 :
                    tooltipPosition.placement === 'right' ? tooltipPosition.left :
                    tooltipPosition.left - 175,
              transform: tooltipPosition.placement === 'center' ? 'translate(-50%, -50%)' : undefined,
            }}
          >
            {/* Close button */}
            {currentStepData.skipable !== false && (
              <button
                onClick={handleSkip}
                className="absolute top-2 right-2 p-1 text-neutral-gray hover:text-neutral-dark-gray hover:bg-neutral-light-gray rounded-full"
                aria-label={t('tour.close', { defaultValue: 'Close tour' })}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}

            {/* Content */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-dark-gray pr-8">
                {t(currentStepData.title, { defaultValue: currentStepData.title })}
              </h3>
              <p className="text-sm text-neutral-gray">
                {t(currentStepData.content, { defaultValue: currentStepData.content })}
              </p>

              {/* Custom actions */}
              {currentStepData.actions && currentStepData.actions.length > 0 && (
                <div className="flex gap-2 pt-2">
                  {currentStepData.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'secondary'}
                      size="sm"
                      onClick={action.action}
                    >
                      {t(action.label, { defaultValue: action.label })}
                    </Button>
                  ))}
                </div>
              )}

              {/* Progress indicator */}
              {showProgress && (
                <div className="pt-4 border-t border-neutral-gray/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-neutral-gray">
                      {t('tour.progress', { 
                        defaultValue: 'Step {{current}} of {{total}}',
                        current: currentStep + 1,
                        total: steps.length
                      })}
                    </span>
                    <div className="flex gap-1">
                      {steps.map((_, index) => (
                        <div
                          key={index}
                          className={`h-1.5 w-1.5 rounded-full transition-colors ${
                            index <= currentStep
                              ? 'bg-primary-trust-blue'
                              : 'bg-neutral-gray/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="h-1 bg-neutral-gray/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-trust-blue"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  {t('tour.previous', { defaultValue: 'Previous' })}
                </Button>

                <div className="flex gap-2">
                  {currentStepData.skipable !== false && currentStep < steps.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                    >
                      {t('tour.skip', { defaultValue: 'Skip tour' })}
                    </Button>
                  )}
                  
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleNext}
                    className="flex items-center gap-1"
                  >
                    {currentStep === steps.length - 1 ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        {t('tour.complete', { defaultValue: 'Complete' })}
                      </>
                    ) : (
                      <>
                        {t('tour.next', { defaultValue: 'Next' })}
                        <ChevronRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// Hook to manage tour state
export function useOnboardingTour(storageKey = 'smartsave-onboarding') {
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(storageKey);
      setHasCompletedTour(!!completed);
      setShouldShowTour(!completed);
    }
  }, [storageKey]);

  const resetTour = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
      setHasCompletedTour(false);
      setShouldShowTour(true);
    }
  };

  const completeTour = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'completed');
      setHasCompletedTour(true);
      setShouldShowTour(false);
    }
  };

  return {
    hasCompletedTour,
    shouldShowTour,
    resetTour,
    completeTour,
  };
}
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useTranslation } from '@/lib/useTranslation';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';

export type FeedbackType = 'success' | 'error' | 'info' | 'warning';

export interface FeedbackOptions {
  type: FeedbackType;
  title: string;
  message?: string;
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
  showConfetti?: boolean;
  animate?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

interface FeedbackProps extends FeedbackOptions {
  id: string;
  onDismiss: (id: string) => void;
}

const FeedbackItem: React.FC<FeedbackProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  position = 'top',
  showConfetti = false,
  animate = true,
  action,
  onClose,
  onDismiss,
}) => {
  const { t } = useTranslation('common');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  useEffect(() => {
    if (showConfetti && type === 'success') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      });
    }
  }, [showConfetti, type]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss(id);
      onClose?.();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-white" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-white" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-white" />;
      case 'info':
      default:
        return <InformationCircleIcon className="h-5 w-5 text-white" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-secondary-growth-green';
      case 'error':
        return 'bg-accent-expense-red';
      case 'warning':
        return 'bg-accent-action-orange';
      case 'info':
      default:
        return 'bg-primary-trust-blue';
    }
  };

  const positionClasses = {
    top: 'top-4',
    bottom: 'bottom-4',
    center: 'top-1/2 -translate-y-1/2',
  };

  const motionVariants = {
    initial: animate
      ? position === 'top'
        ? { opacity: 0, y: -20, scale: 0.95 }
        : position === 'bottom'
        ? { opacity: 0, y: 20, scale: 0.95 }
        : { opacity: 0, scale: 0.9 }
      : { opacity: 1 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: animate
      ? position === 'top'
        ? { opacity: 0, y: -20, scale: 0.95 }
        : position === 'bottom'
        ? { opacity: 0, y: 20, scale: 0.95 }
        : { opacity: 0, scale: 0.9 }
      : { opacity: 0 },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          layout
          initial={motionVariants.initial}
          animate={motionVariants.animate}
          exit={motionVariants.exit}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed ${positionClasses[position]} left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4`}
        >
          <div className={`${getBackgroundColor()} text-white rounded-lg shadow-lg overflow-hidden`}>
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">{getIcon()}</div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium">{title}</h3>
                  {message && <p className="mt-1 text-sm opacity-90">{message}</p>}
                  {action && (
                    <button
                      onClick={action.onClick}
                      className="mt-2 text-sm font-medium underline hover:no-underline"
                    >
                      {action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="ml-4 flex-shrink-0 rounded-md hover:bg-white/20 p-1"
                  aria-label={t('common:actions.close', { defaultValue: 'Close' })}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            {duration > 0 && (
              <motion.div
                className="h-1 bg-white/30"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Global feedback manager
class FeedbackManager {
  private listeners: ((feedback: FeedbackOptions & { id: string }) => void)[] = [];
  private feedbackQueue: (FeedbackOptions & { id: string })[] = [];

  show(options: FeedbackOptions) {
    const id = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const feedback = { ...options, id };
    
    this.feedbackQueue.push(feedback);
    this.listeners.forEach(listener => listener(feedback));
  }

  subscribe(listener: (feedback: FeedbackOptions & { id: string }) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  success(title: string, options?: Partial<FeedbackOptions>) {
    this.show({ ...options, type: 'success', title });
  }

  error(title: string, options?: Partial<FeedbackOptions>) {
    this.show({ ...options, type: 'error', title });
  }

  info(title: string, options?: Partial<FeedbackOptions>) {
    this.show({ ...options, type: 'info', title });
  }

  warning(title: string, options?: Partial<FeedbackOptions>) {
    this.show({ ...options, type: 'warning', title });
  }
}

export const feedbackManager = new FeedbackManager();

// React component to render feedbacks
export function FeedbackContainer() {
  const [feedbacks, setFeedbacks] = useState<(FeedbackOptions & { id: string })[]>([]);

  useEffect(() => {
    const unsubscribe = feedbackManager.subscribe((feedback) => {
      setFeedbacks(prev => [...prev, feedback]);
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  if (feedbacks.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <div className="relative w-full h-full">
        {feedbacks.map((feedback, index) => (
          <div
            key={feedback.id}
            className="pointer-events-auto"
            style={{
              position: 'absolute',
              top: feedback.position === 'top' ? `${(index + 1) * 80}px` : undefined,
              bottom: feedback.position === 'bottom' ? `${(index + 1) * 80}px` : undefined,
              width: '100%',
            }}
          >
            <FeedbackItem {...feedback} onDismiss={handleDismiss} />
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

// React hook for using feedback
export function useFeedback() {
  const { t } = useTranslation('common');

  const showFeedback = useCallback((options: FeedbackOptions) => {
    feedbackManager.show(options);
  }, []);

  const success = useCallback((title: string, options?: Partial<FeedbackOptions>) => {
    feedbackManager.success(title, options);
  }, []);

  const error = useCallback((title: string, options?: Partial<FeedbackOptions>) => {
    feedbackManager.error(title, options);
  }, []);

  const info = useCallback((title: string, options?: Partial<FeedbackOptions>) => {
    feedbackManager.info(title, options);
  }, []);

  const warning = useCallback((title: string, options?: Partial<FeedbackOptions>) => {
    feedbackManager.warning(title, options);
  }, []);

  // Predefined feedback messages
  const saveSuccess = useCallback((amount?: number) => {
    const title = amount
      ? t('feedback.saveSuccess', { defaultValue: `Successfully saved {{amount}}!`, amount })
      : t('feedback.saveSuccessGeneric', { defaultValue: 'Successfully saved!' });
    
    success(title, {
      showConfetti: true,
      message: t('feedback.saveMessage', { defaultValue: 'Keep up the great work!' }),
    });
  }, [t, success]);

  const goalAchieved = useCallback((goalName: string) => {
    success(
      t('feedback.goalAchieved', { defaultValue: `Goal achieved: {{goalName}}!`, goalName }),
      {
        showConfetti: true,
        duration: 8000,
        message: t('feedback.goalMessage', { defaultValue: 'Congratulations on reaching your goal!' }),
      }
    );
  }, [t, success]);

  const budgetWarning = useCallback((category: string, percentage: number) => {
    warning(
      t('feedback.budgetWarning', { defaultValue: 'Budget Alert' }),
      {
        message: t('feedback.budgetMessage', {
          defaultValue: `You've used {{percentage}}% of your {{category}} budget`,
          percentage,
          category,
        }),
        action: {
          label: t('feedback.viewBudget', { defaultValue: 'View Budget' }),
          onClick: () => window.location.href = '/budget',
        },
      }
    );
  }, [t, warning]);

  return {
    showFeedback,
    success,
    error,
    info,
    warning,
    saveSuccess,
    goalAchieved,
    budgetWarning,
  };
}

// Achievement animations
export function AchievementAnimation({ type = 'star' }: { type?: 'star' | 'trophy' | 'badge' }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getEmoji = () => {
    switch (type) {
      case 'trophy':
        return '🏆';
      case 'badge':
        return '🥇';
      case 'star':
      default:
        return '⭐';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl z-[10000]"
        >
          {getEmoji()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
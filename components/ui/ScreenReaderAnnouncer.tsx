'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timeout?: number;
}

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive', timeout?: number) => void;
  clear: () => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

export function ScreenReaderAnnouncer({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite', timeout = 5000) => {
    const id = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const announcement: Announcement = { id, message, priority, timeout };
    
    setAnnouncements(prev => [...prev, announcement]);

    if (timeout > 0) {
      setTimeout(() => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }, timeout);
    }
  }, []);

  const clear = useCallback(() => {
    setAnnouncements([]);
  }, []);

  const contextValue: AnnouncerContextType = {
    announce,
    clear,
  };

  return (
    <AnnouncerContext.Provider value={contextValue}>
      {children}
      {mounted && createPortal(
        <>
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announcements
              .filter(a => a.priority === 'polite')
              .map(a => a.message)
              .join('. ')}
          </div>
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="sr-only"
          >
            {announcements
              .filter(a => a.priority === 'assertive')
              .map(a => a.message)
              .join('. ')}
          </div>
        </>,
        document.body
      )}
    </AnnouncerContext.Provider>
  );
}

export function useScreenReaderAnnouncer() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useScreenReaderAnnouncer must be used within ScreenReaderAnnouncer');
  }
  return context;
}

// Common announcement helpers
export function useAccessibilityAnnouncements() {
  const { announce } = useScreenReaderAnnouncer();

  const announcePageChange = useCallback((pageName: string) => {
    announce(`Now on ${pageName} page`, 'polite');
  }, [announce]);

  const announceFormError = useCallback((errorMessage: string) => {
    announce(`Form error: ${errorMessage}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite');
  }, [announce]);

  const announceLoading = useCallback((itemName: string) => {
    announce(`Loading ${itemName}`, 'polite');
  }, [announce]);

  const announceLoadingComplete = useCallback((itemName: string) => {
    announce(`${itemName} loaded`, 'polite');
  }, [announce]);

  const announceItemCount = useCallback((count: number, itemType: string) => {
    const plural = count !== 1 ? 's' : '';
    announce(`${count} ${itemType}${plural} found`, 'polite');
  }, [announce]);

  const announceActionResult = useCallback((action: string, success: boolean) => {
    const status = success ? 'successful' : 'failed';
    announce(`${action} ${status}`, success ? 'polite' : 'assertive');
  }, [announce]);

  return {
    announcePageChange,
    announceFormError,
    announceSuccess,
    announceLoading,
    announceLoadingComplete,
    announceItemCount,
    announceActionResult,
  };
}

// Focus management utilities
export function useFocusManagement() {
  const [focusHistory, setFocusHistory] = useState<HTMLElement[]>([]);

  const saveFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      setFocusHistory(prev => [...prev, activeElement]);
    }
  }, []);

  const restoreFocus = useCallback(() => {
    setFocusHistory(prev => {
      const newHistory = [...prev];
      const lastElement = newHistory.pop();
      if (lastElement && lastElement.focus) {
        lastElement.focus();
      }
      return newHistory;
    });
  }, []);

  const focusFirst = useCallback((container: HTMLElement) => {
    const focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }
  }, []);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  return {
    saveFocus,
    restoreFocus,
    focusFirst,
    trapFocus,
  };
}
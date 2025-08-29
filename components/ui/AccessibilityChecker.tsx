'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/lib/useTranslation';

interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  element: string;
  message: string;
  wcagCriteria: string;
  fix: string;
}

export function AccessibilityChecker({ enabled = false }: { enabled?: boolean }) {
  const { t } = useTranslation('accessibility');
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkAccessibility = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    setIsChecking(true);
    const foundIssues: AccessibilityIssue[] = [];

    // Check for images without alt text
    const images = document.querySelectorAll('img:not([alt]), img[alt=""]');
    images.forEach((img, index) => {
      foundIssues.push({
        id: `img-alt-${index}`,
        type: 'error',
        element: img.outerHTML.substring(0, 100),
        message: 'Image missing alt text',
        wcagCriteria: '1.1.1 Non-text Content',
        fix: 'Add descriptive alt text to the image',
      });
    });

    // Check for missing form labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    inputs.forEach((input, index) => {
      const id = (input as HTMLInputElement).id;
      if (!id || !document.querySelector(`label[for="${id}"]`)) {
        foundIssues.push({
          id: `input-label-${index}`,
          type: 'error',
          element: input.outerHTML.substring(0, 100),
          message: 'Form input missing label',
          wcagCriteria: '3.3.2 Labels or Instructions',
          fix: 'Add a label element or aria-label attribute',
        });
      }
    });

    // Check for insufficient color contrast
    const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button');
    textElements.forEach((element, index) => {
      const style = window.getComputedStyle(element);
      const bgColor = style.backgroundColor;
      const textColor = style.color;
      
      // Simple contrast check (in production, use a proper algorithm)
      if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor) {
        // This is a simplified check - in reality, you'd calculate the actual contrast ratio
        const isDarkBg = bgColor.includes('0, 0, 0') || bgColor.includes('dark');
        const isLightText = textColor.includes('255, 255, 255') || textColor.includes('light');
        
        if (isDarkBg === isLightText) {
          // Likely good contrast
        } else if (element.tagName.toLowerCase() !== 'button') {
          foundIssues.push({
            id: `contrast-${index}`,
            type: 'warning',
            element: element.tagName.toLowerCase() + '.' + element.className,
            message: 'Potentially insufficient color contrast',
            wcagCriteria: '1.4.3 Contrast (Minimum)',
            fix: 'Ensure text has at least 4.5:1 contrast ratio',
          });
        }
      }
    });

    // Check for missing skip links
    const mainContent = document.querySelector('#main-content');
    const skipLink = document.querySelector('a[href="#main-content"]');
    if (mainContent && !skipLink) {
      foundIssues.push({
        id: 'skip-link',
        type: 'warning',
        element: 'body',
        message: 'Missing skip to main content link',
        wcagCriteria: '2.4.1 Bypass Blocks',
        fix: 'Add a skip link at the beginning of the page',
      });
    }

    // Check for missing page title
    if (!document.title || document.title.trim() === '') {
      foundIssues.push({
        id: 'page-title',
        type: 'error',
        element: 'head > title',
        message: 'Page missing title',
        wcagCriteria: '2.4.2 Page Titled',
        fix: 'Add a descriptive title to the page',
      });
    }

    // Check for keyboard accessibility
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    interactiveElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        foundIssues.push({
          id: `tabindex-${index}`,
          type: 'warning',
          element: element.outerHTML.substring(0, 100),
          message: 'Positive tabindex detected',
          wcagCriteria: '2.4.3 Focus Order',
          fix: 'Use tabindex="0" or "-1" instead of positive values',
        });
      }
    });

    // Check for proper heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level - lastLevel > 1) {
        foundIssues.push({
          id: `heading-${index}`,
          type: 'warning',
          element: heading.outerHTML.substring(0, 100),
          message: `Heading level skipped (h${lastLevel} to h${level})`,
          wcagCriteria: '1.3.1 Info and Relationships',
          fix: 'Use proper heading hierarchy without skipping levels',
        });
      }
      lastLevel = level;
    });

    // Check for ARIA attributes
    const ariaElements = document.querySelectorAll('[role]');
    ariaElements.forEach((element, index) => {
      const role = element.getAttribute('role');
      const requiredAriaAttributes: Record<string, string[]> = {
        'button': [],
        'link': [],
        'navigation': ['aria-label'],
        'main': [],
        'complementary': ['aria-label', 'aria-labelledby'],
        'contentinfo': [],
        'banner': [],
        'region': ['aria-label', 'aria-labelledby'],
        'alert': [],
        'alertdialog': ['aria-label', 'aria-labelledby', 'aria-describedby'],
        'dialog': ['aria-label', 'aria-labelledby'],
        'tablist': [],
        'tab': ['aria-selected', 'aria-controls'],
        'tabpanel': ['aria-labelledby'],
      };

      if (role && requiredAriaAttributes[role]) {
        const required = requiredAriaAttributes[role];
        const hasRequired = required.length === 0 || required.some(attr => element.hasAttribute(attr));
        
        if (!hasRequired) {
          foundIssues.push({
            id: `aria-${index}`,
            type: 'error',
            element: element.outerHTML.substring(0, 100),
            message: `Missing required ARIA attributes for role="${role}"`,
            wcagCriteria: '4.1.2 Name, Role, Value',
            fix: `Add one of these attributes: ${required.join(' or ')}`,
          });
        }
      }
    });

    // Check for duplicate IDs
    const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
    duplicateIds.forEach((id, index) => {
      foundIssues.push({
        id: `duplicate-id-${index}`,
        type: 'error',
        element: `id="${id}"`,
        message: `Duplicate ID found: "${id}"`,
        wcagCriteria: '4.1.1 Parsing',
        fix: 'Ensure all IDs are unique',
      });
    });

    setIssues(foundIssues);
    setIsChecking(false);
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      checkAccessibility();
      
      // Re-check on DOM changes
      const observer = new MutationObserver(() => {
        checkAccessibility();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['alt', 'aria-label', 'aria-labelledby', 'role'],
      });

      return () => observer.disconnect();
    }
  }, [enabled, checkAccessibility]);

  if (!enabled || issues.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white rounded-lg shadow-lg border border-neutral-gray/20 p-4 z-[9998] max-h-96 overflow-auto">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <span className="mr-2">♿</span>
        {t('checker.title', { defaultValue: 'Accessibility Issues' })}
        <span className="ml-2 text-sm font-normal text-neutral-gray">
          ({issues.length})
        </span>
      </h3>
      
      {isChecking ? (
        <p className="text-sm text-neutral-gray">
          {t('checker.checking', { defaultValue: 'Checking accessibility...' })}
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.slice(0, 10).map((issue) => (
            <li key={issue.id} className="text-sm">
              <div className="flex items-start">
                <span
                  className={`mr-2 ${
                    issue.type === 'error'
                      ? 'text-accent-expense-red'
                      : issue.type === 'warning'
                      ? 'text-accent-action-orange'
                      : 'text-primary-trust-blue'
                  }`}
                >
                  {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{issue.message}</p>
                  <p className="text-xs text-neutral-gray">
                    WCAG {issue.wcagCriteria}
                  </p>
                  <p className="text-xs text-secondary-growth-green mt-1">
                    Fix: {issue.fix}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {issues.length > 10 && (
        <p className="text-sm text-neutral-gray mt-2">
          {t('checker.more', { 
            defaultValue: 'And {{count}} more issues...', 
            count: issues.length - 10 
          })}
        </p>
      )}
    </div>
  );
}

// Hook for programmatic accessibility checks
export function useAccessibilityCheck() {
  const checkElement = useCallback((element: HTMLElement): AccessibilityIssue[] => {
    const issues: AccessibilityIssue[] = [];
    
    // Check specific element for common issues
    if (element.tagName === 'IMG' && !element.getAttribute('alt')) {
      issues.push({
        id: `img-alt-check`,
        type: 'error',
        element: element.tagName,
        message: 'Image missing alt text',
        wcagCriteria: '1.1.1 Non-text Content',
        fix: 'Add descriptive alt text',
      });
    }
    
    // Check interactive elements
    if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
      const hasLabel = element.getAttribute('aria-label') || 
                      element.getAttribute('aria-labelledby') ||
                      (element.id && document.querySelector(`label[for="${element.id}"]`));
      
      if (!hasLabel) {
        issues.push({
          id: `label-check`,
          type: 'error',
          element: element.tagName,
          message: 'Interactive element missing accessible label',
          wcagCriteria: '4.1.2 Name, Role, Value',
          fix: 'Add aria-label or associated label element',
        });
      }
    }
    
    return issues;
  }, []);
  
  return { checkElement };
}
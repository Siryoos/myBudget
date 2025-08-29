'use client';

import {
  HomeIcon,
  ChartBarIcon,
  BanknotesIcon,
  CreditCardIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  BanknotesIcon as BanknotesIconSolid,
  CreditCardIcon as CreditCardIconSolid,
  AcademicCapIcon as AcademicCapIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/lib/i18n-provider';
import { useTranslation } from '@/lib/useTranslation';
import { cn, formatCurrency } from '@/lib/utils';
import type { NavigationItem } from '@/types';
import { useFinancialSummary, useTransactions } from '@/contexts/AppProvider';

const getNavigationItems = (t: any, locale: string): NavigationItem[] => [
  {
    id: 'dashboard',
    label: t('navigation.dashboard'),
    href: `/${locale}/dashboard`,
    icon: 'home',
  },
  {
    id: 'budget',
    label: t('navigation.budget'),
    href: `/${locale}/budget`,
    icon: 'chart-bar',
  },
  {
    id: 'goals',
    label: t('navigation.goals'),
    href: `/${locale}/goals`,
    icon: 'banknotes',
  },
  {
    id: 'transactions',
    label: t('navigation.transactions'),
    href: `/${locale}/transactions`,
    icon: 'credit-card',
  },
  {
    id: 'learn',
    label: t('navigation.education'),
    href: `/${locale}/learn`,
    icon: 'academic-cap',
  },
  {
    id: 'settings',
    label: t('navigation.settings'),
    href: `/${locale}/settings`,
    icon: 'cog',
  },
];

const iconMap = {
  home: { outline: HomeIcon, solid: HomeIconSolid },
  'chart-bar': { outline: ChartBarIcon, solid: ChartBarIconSolid },
  banknotes: { outline: BanknotesIcon, solid: BanknotesIconSolid },
  'credit-card': { outline: CreditCardIcon, solid: CreditCardIconSolid },
  'academic-cap': { outline: AcademicCapIcon, solid: AcademicCapIconSolid },
  cog: { outline: Cog6ToothIcon, solid: Cog6ToothIconSolid },
};

interface NavigationProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Navigation({ isOpen = false, onClose }: NavigationProps) {
  const pathname = usePathname();
  const { t } = useTranslation('common');
  const { locale } = useI18n();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const { netIncome } = useFinancialSummary();
  const { loading: txLoading } = useTransactions();
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);

  // Manage focus and Escape key when mobile nav opens
  useEffect(() => {
    if (!isOpen) {return;}
    // Focus close button for accessibility
    closeBtnRef.current?.focus();

    // Close on Escape
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
      // Simple focus trap when drawer is open
      if (e.key === 'Tab' && navRef.current) {
        const focusable = navRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {return;}
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !navRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !navRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', onKey);

    // Lock body scroll when open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Swipe to close on mobile
  useEffect(() => {
    if (!isOpen || !navRef.current) {return;}
    const el = navRef.current;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchCurrentX.current = e.touches[0].clientX;
    };
    const onTouchMove = (e: TouchEvent) => {
      touchCurrentX.current = e.touches[0].clientX;
    };
    const onTouchEnd = () => {
      if (touchStartX.current != null && touchCurrentX.current != null) {
        const deltaX = touchCurrentX.current - touchStartX.current;
        // Close if swiped left sufficiently (LTR) or right sufficiently (RTL)
        const dir = document.documentElement.dir || 'ltr';
        const threshold = 60;
        if ((dir === 'ltr' && deltaX < -threshold) || (dir === 'rtl' && deltaX > threshold)) {
          onClose?.();
        }
      }
      touchStartX.current = null;
      touchCurrentX.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', onTouchEnd as any);
    };
  }, [isOpen, onClose]);

  // Get navigation items with translations
  const navigationItems = getNavigationItems(t, locale);

  const isActiveRoute = (href: string) => {
    // hrefs are already localized (e.g., /en/dashboard)
    if (href.endsWith('/dashboard')) {
      const homePath = `/${locale}`;
      return pathname === homePath || pathname === href;
    }
    return pathname.startsWith(href);
  };

  const getIcon = (iconName: string, isActive: boolean, isHovered: boolean) => {
    const icons = iconMap[iconName as keyof typeof iconMap];
    if (!icons) {return null;}

    const IconComponent = (isActive || isHovered) ? icons.solid : icons.outline;
    return <IconComponent className="h-6 w-6" />;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Navigation sidebar */}
      <nav
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-screen xs:w-screen sm:w-[100vw] md:w-[280px] lg:w-[320px] bg-white dark:bg-neutral-light-gray shadow-lg transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        id="main-nav"
        aria-label="Main navigation"
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-labelledby="nav-title"
        tabIndex={isOpen ? -1 : undefined}
        ref={navRef as any}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-gray/10 lg:hidden">
          <h2 id="nav-title" className="text-lg font-semibold text-primary-trust-blue">
            SmartSave
          </h2>
          <button
            type="button"
            className="p-2 rounded-md text-neutral-gray hover:bg-neutral-light-gray hover:text-neutral-dark-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
            onClick={onClose}
            aria-label="Close navigation menu"
            ref={closeBtnRef}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            const isHovered = hoveredItem === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group min-h-[44px]',
                  isActive
                    ? 'bg-primary-trust-blue text-white shadow-sm'
                    : 'text-neutral-gray hover:bg-neutral-light-gray hover:text-neutral-dark-gray',
                )}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (onClose) {onClose();}
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="flex-shrink-0 mr-3">
                  {item.icon && getIcon(item.icon, isActive, isHovered)}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      'ml-2 px-2 py-1 text-xs rounded-full',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-accent-action-orange text-white',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer section - show a live financial summary instead of static placeholder */}
        <div className="p-4 border-t border-neutral-gray/10">
          <div className="bg-gradient-to-r from-primary-trust-blue to-secondary-growth-green rounded-lg p-4 text-white">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-8 w-8" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{t('navigation.summary.totalBalance', { defaultValue: 'Total Balance' })}</p>
                <p className="text-lg font-bold" aria-live="polite">
                  {txLoading ? '—' : formatCurrency(netIncome || 0, undefined, locale)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-[320px] flex-shrink-0" aria-hidden="true" />
    </>
  );
}

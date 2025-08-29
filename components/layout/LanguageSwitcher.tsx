'use client';

import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import i18n from 'i18next';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

import { getDirection } from '@/lib/i18n';
import { useToast } from '@/hooks/useToast';


type Locale = 'en' | 'fa' | 'ar';

interface Language {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

interface LanguageSwitcherProps {
  currentLocale?: string;
}

export default function LanguageSwitcher({ currentLocale = 'en' }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();

  // Use the passed locale prop, fallback to extracting from pathname if not provided
  const locale = (currentLocale && languages.find(lang => lang.code === currentLocale))
    ? currentLocale as Locale
    : 'en';

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation and Escape to close
  useEffect(() => {
    if (!isOpen) {return;}

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        const items = dropdownRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
        if (!items || items.length === 0) {return;}
        const currentIndex = Array.from(items).findIndex(el => el === document.activeElement);
        let nextIndex = 0;
        if (e.key === 'ArrowDown') nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 0;
        if (e.key === 'ArrowUp') nextIndex = currentIndex >= 0 ? (currentIndex - 1 + items.length) % items.length : items.length - 1;
        if (e.key === 'Home') nextIndex = 0;
        if (e.key === 'End') nextIndex = items.length - 1;
        e.preventDefault();
        items[nextIndex].focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Focus first item on open
    const items = dropdownRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (items && items[0]) { setTimeout(() => items[0].focus(), 0); }
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleLanguageChange = async (newLocale: Locale) => {
    // Calculate the new path first so it's available in both try and catch blocks
    const segments = pathname.split('/');
    const hasLocale = languages.some(lang => lang.code === segments[1]);

    let newPath: string;
    if (hasLocale) {
      segments[1] = newLocale;
      newPath = segments.join('/');
    } else {
      newPath = `/${newLocale}${pathname}`;
    }

    // Preserve existing query parameters and hash
    const queryString = searchParams?.toString();
    if (queryString && queryString.length > 0) {
      newPath += `?${queryString}`;
    }
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash) {
      newPath += hash;
    }

    try {
      // Clear all cached translations and namespaces
      if (i18n.isInitialized && i18n.reportNamespaces) {
        // Remove all loaded namespaces
        const loadedNamespaces = i18n.reportNamespaces.getUsedNamespaces();
        loadedNamespaces.forEach(ns => {
          i18n.removeResourceBundle(newLocale, ns);
        });

        // Clear the language detector cache
        if ((i18n as any).languageDetector) {
          (i18n as any).languageDetector.cacheUserLanguage(newLocale);
        }
      }

      // Set cookie for persistence
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;

      // Update HTML dir attribute
      document.documentElement.dir = getDirection(newLocale);
      document.documentElement.lang = newLocale;

      // Prefer client-side navigation for smoother UX
      router.replace(newPath);
      setIsOpen(false);
    } catch (error) {
      toast({ title: 'Language change failed', description: 'Please try again', variant: 'error' });
      // Fallback to router navigation if something goes wrong
      router.push(newPath);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-gray hover:text-neutral-black transition-colors rounded-md hover:bg-neutral-light-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:ring-offset-2"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
        ref={buttonRef}
      >
        <GlobeAltIcon className="w-5 h-5" />
        <span className="hidden sm:block">{currentLanguage.flag} {currentLanguage.nativeName}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`
                  w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-neutral-light-gray transition-colors
                  ${locale === language.code ? 'bg-primary-trust-blue/10 text-primary-trust-blue' : 'text-neutral-gray'}
                `}
                role="menuitem"
              >
                <span className="text-lg">{language.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-xs text-neutral-gray">{language.name}</div>
                </div>
                {locale === language.code && (
                  <svg className="w-4 h-4 text-primary-trust-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { getDirection } from '@/lib/i18n';

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

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Extract current locale from pathname
  const pathSegments = pathname.split('/');
  const currentLocale = (pathSegments[1] && languages.find(lang => lang.code === pathSegments[1])) 
    ? pathSegments[1] as Locale
    : 'en';
  
  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

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

  const handleLanguageChange = (locale: Locale) => {
    // Update the pathname with the new locale
    const segments = pathname.split('/');
    const hasLocale = languages.some(lang => lang.code === segments[1]);
    
    let newPath: string;
    if (hasLocale) {
      segments[1] = locale;
      newPath = segments.join('/');
    } else {
      newPath = `/${locale}${pathname}`;
    }
    
    // Set cookie for persistence
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
    
    // Update HTML dir attribute
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
    
    // Navigate to new locale
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-gray hover:text-neutral-black transition-colors rounded-md hover:bg-neutral-light-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:ring-offset-2"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
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
                  ${currentLocale === language.code ? 'bg-primary-trust-blue/10 text-primary-trust-blue' : 'text-neutral-gray'}
                `}
                role="menuitem"
              >
                <span className="text-lg">{language.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-xs text-neutral-gray">{language.name}</div>
                </div>
                {currentLocale === language.code && (
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

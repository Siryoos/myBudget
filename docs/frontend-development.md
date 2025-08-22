# Frontend Development Guide

This guide covers frontend development for the SmartSave Personal Finance Platform, including component development, state management, styling, and best practices.

## 🎨 Component Architecture

### Component Structure

```
components/
├── common/                 # Shared components
│   ├── Button/            # Button variants
│   ├── Input/             # Form inputs
│   ├── Modal/             # Modal dialogs
│   └── Loading/           # Loading states
├── layout/                 # Layout components
│   ├── Header/            # Navigation header
│   ├── Sidebar/           # Side navigation
│   ├── Footer/            # Page footer
│   └── PageWrapper/       # Page container
├── dashboard/              # Dashboard components
│   ├── Overview/          # Financial overview
│   ├── Charts/            # Data visualizations
│   ├── QuickActions/      # Common actions
│   └── Insights/          # Financial insights
├── budget/                 # Budget management
│   ├── BudgetForm/        # Budget creation/editing
│   ├── BudgetList/        # Budget display
│   ├── CategoryManager/   # Category management
│   └── BudgetTracker/     # Spending tracking
├── goals/                  # Savings goals
│   ├── GoalWizard/        # Goal creation
│   ├── GoalProgress/      # Progress tracking
│   ├── GoalList/          # Goal management
│   └── QuickSave/         # Quick saving
├── transactions/           # Transaction management
│   ├── TransactionForm/   # Transaction entry
│   ├── TransactionList/   # Transaction display
│   ├── TransactionFilter/ # Search and filtering
│   └── ImportExport/      # Data import/export
└── settings/               # User settings
    ├── Profile/            # User profile
    ├── Preferences/        # App preferences
    ├── Security/           # Security settings
    └── Notifications/      # Notification preferences
```

### Component Design Principles

#### Atomic Design
- **Atoms**: Basic building blocks (Button, Input, Icon)
- **Molecules**: Simple combinations (SearchBar, FormField)
- **Organisms**: Complex components (Header, Sidebar)
- **Templates**: Page layouts
- **Pages**: Complete user experiences

#### Component Patterns
- **Compound Components**: Related components that work together
- **Render Props**: Flexible component composition
- **Higher-Order Components**: Cross-cutting concerns
- **Custom Hooks**: Reusable logic extraction

## 🧩 Common Components

### Button Component

```tsx
// components/common/Button/Button.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'hover:bg-gray-100 focus:ring-gray-500',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-gray-500'
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
      },
      fullWidth: {
        true: 'w-full'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Input Component

```tsx
// components/common/Input/Input.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300',
        error: 'border-red-500 focus:ring-red-500',
        success: 'border-green-500 focus:ring-green-500'
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
    const inputId = React.useId();
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            className={cn(
              inputVariants({ variant: error ? 'error' : variant, size, className }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10'
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
```

### Modal Component

```tsx
// components/common/Modal/Modal.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true
}: ModalProps) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleOverlayClick}
      />
      
      {/* Modal */}
      <div
        className={cn(
          'relative bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto',
          sizeClasses[size]
        )}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

## 🔄 State Management

### Context API Implementation

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, AuthState, AuthAction } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('accessToken');
    if (token) {
      validateToken(token);
    } else {
      dispatch({ type: 'AUTH_FAILURE' });
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const user = await response.json();
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token }
        });
      } else {
        localStorage.removeItem('accessToken');
        dispatch({ type: 'AUTH_FAILURE' });
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
      dispatch({ type: 'AUTH_FAILURE' });
    }
  };

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const { user, tokens } = await response.json();
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token: tokens.accessToken }
      });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Custom Hooks

```tsx
// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);

  const callback = ([entry]: IntersectionObserverEntry[]) => {
    setIsIntersecting(entry.isIntersecting);
    setEntry(entry);
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(callback, options);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return { ref: elementRef, isIntersecting, entry };
}
```

## 🎨 Styling & Design System

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
```

### CSS Utilities

```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply bg-gray-50 text-gray-900;
  }
  
  h1 {
    @apply text-3xl font-bold text-gray-900;
  }
  
  h2 {
    @apply text-2xl font-semibold text-gray-900;
  }
  
  h3 {
    @apply text-xl font-semibold text-gray-900;
  }
  
  h4 {
    @apply text-lg font-medium text-gray-900;
  }
  
  h5 {
    @apply text-base font-medium text-gray-900;
  }
  
  h6 {
    @apply text-sm font-medium text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors;
  }
  
  .btn-danger {
    @apply bg-danger-600 text-white px-4 py-2 rounded-md hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 transition-colors;
  }
  
  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }
  
  .card-hover {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .gradient-text {
    @apply bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent;
  }
}
```

## 🌍 Internationalization

### Translation Hook

```tsx
// hooks/useTranslation.ts
import { useTranslation as useNextI18n } from 'next-i18next';
import { useRouter } from 'next/router';

export function useTranslation(namespaces: string | string[] = 'common') {
  const router = useRouter();
  const { t, i18n, ready } = useNextI18n(namespaces);
  
  const isRTL = i18n.dir() === 'rtl';
  const currentLocale = i18n.language;
  
  const changeLanguage = async (locale: string) => {
    const { pathname, asPath, query } = router;
    await i18n.changeLanguage(locale);
    
    // Update router locale
    router.push({ pathname, query }, asPath, { locale });
  };
  
  const formatCurrency = (amount: number, currency = 'USD') => {
    const formatter = new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  };
  
  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    const formatter = new Intl.DateTimeFormat(currentLocale, options);
    return formatter.format(date);
  };
  
  return {
    t,
    ready,
    i18n,
    isRTL,
    currentLocale,
    changeLanguage,
    formatCurrency,
    formatDate
  };
}
```

### RTL Support

```tsx
// components/common/Layout.tsx
import { useTranslation } from '@/hooks/useTranslation';

export function Layout({ children }: { children: React.ReactNode }) {
  const { isRTL, currentLocale } = useTranslation();
  
  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={currentLocale}
      className={`min-h-screen ${isRTL ? 'font-arabic' : 'font-english'}`}
    >
      <Header />
      <main className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <Sidebar />
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

## 📱 Responsive Design

### Breakpoint Utilities

```tsx
// hooks/useBreakpoint.ts
import { useState, useEffect } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width < breakpoints.sm) {
        setBreakpoint('sm');
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (width < breakpoints.md) {
        setBreakpoint('md');
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
      } else if (width < breakpoints.lg) {
        setBreakpoint('lg');
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
      } else if (width < breakpoints.xl) {
        setBreakpoint('xl');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      } else {
        setBreakpoint('2xl');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints
  };
}
```

### Responsive Components

```tsx
// components/common/ResponsiveContainer.tsx
import React from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
}

export function ResponsiveContainer({ 
  children, 
  mobile, 
  tablet, 
  desktop 
}: ResponsiveContainerProps) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  if (isMobile && mobile) {
    return <>{mobile}</>;
  }

  if (isTablet && tablet) {
    return <>{tablet}</>;
  }

  if (isDesktop && desktop) {
    return <>{desktop}</>;
  }

  return <>{children}</>;
}

// Usage example
function Dashboard() {
  return (
    <ResponsiveContainer
      mobile={<MobileDashboard />}
      tablet={<TabletDashboard />}
      desktop={<DesktopDashboard />}
    >
      <DefaultDashboard />
    </ResponsiveContainer>
  );
}
```

## 🧪 Testing

### Component Testing

```tsx
// __tests__/components/common/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/common/Button/Button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    
    let button = screen.getByRole('button', { name: /secondary/i });
    expect(button).toHaveClass('bg-gray-200');
    
    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole('button', { name: /danger/i });
    expect(button).toHaveClass('bg-red-600');
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Testing

```tsx
// __tests__/hooks/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns initial value when no stored value', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));
    
    expect(result.current[0]).toBe('initial');
  });

  it('returns stored value when available', () => {
    window.localStorage.setItem('test', JSON.stringify('stored'));
    
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));
    
    expect(result.current[0]).toBe('stored');
  });

  it('updates stored value', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });
    
    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(window.localStorage.getItem('test')!)).toBe('updated');
  });

  it('handles function updates', () => {
    const { result } = renderHook(() => useLocalStorage('test', 0));
    
    act(() => {
      result.current[1](prev => prev + 1);
    });
    
    expect(result.current[0]).toBe(1);
  });
});
```

## 🚀 Performance Optimization

### Code Splitting

```tsx
// app/dashboard/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load dashboard components
const DashboardOverview = dynamic(() => import('@/components/dashboard/Overview'), {
  loading: () => <DashboardSkeleton />
});

const DashboardCharts = dynamic(() => import('@/components/dashboard/Charts'), {
  loading: () => <ChartsSkeleton />
});

const DashboardInsights = dynamic(() => import('@/components/dashboard/Insights'), {
  loading: () => <InsightsSkeleton />
});

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardOverview />
      </Suspense>
      
      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardCharts />
      </Suspense>
      
      <Suspense fallback={<InsightsSkeleton />}>
        <DashboardInsights />
      </Suspense>
    </div>
  );
}
```

### Memoization

```tsx
// components/dashboard/Charts.tsx
import React, { useMemo } from 'react';
import { LineChart, PieChart, BarChart } from '@/components/charts';

interface ChartsProps {
  data: any;
  period: string;
}

export function DashboardCharts({ data, period }: ChartsProps) {
  // Memoize chart data processing
  const processedData = useMemo(() => {
    return {
      lineData: processLineChartData(data, period),
      pieData: processPieChartData(data, period),
      barData: processBarChartData(data, period)
    };
  }, [data, period]);

  // Memoize chart components to prevent unnecessary re-renders
  const charts = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <LineChart data={processedData.lineData} />
      <PieChart data={processedData.pieData} />
      <BarChart data={processedData.barData} />
    </div>
  ), [processedData]);

  return charts;
}
```

## 📚 Best Practices

### Component Organization
- **Single Responsibility**: Each component should have one clear purpose
- **Composition over Inheritance**: Use composition to build complex components
- **Props Interface**: Define clear prop interfaces for all components
- **Default Props**: Provide sensible defaults for optional props

### Performance
- **React.memo**: Use for components that receive stable props
- **useMemo/useCallback**: Memoize expensive calculations and callbacks
- **Lazy Loading**: Implement code splitting for large components
- **Bundle Analysis**: Regularly analyze bundle size and optimize

### Accessibility
- **Semantic HTML**: Use proper HTML elements for their intended purpose
- **ARIA Labels**: Provide descriptive labels for screen readers
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Color Contrast**: Maintain sufficient contrast ratios for text readability

### Testing
- **Unit Tests**: Test individual components and hooks
- **Integration Tests**: Test component interactions
- **Accessibility Tests**: Use tools like axe-core for accessibility testing
- **Visual Regression**: Test for unexpected UI changes

---

**Next Steps**: Explore [Backend Development](backend-development.md) for API implementation details, or [Implementation Guides](implementation-guides.md) for specific feature implementations.

# Implementation Guides

This guide covers the implementation of key features in the SmartSave Personal Finance Platform, including behavioral psychology features, translation system, and other advanced implementations.

## 🧠 Behavioral Psychology Implementation

### Overview

SmartSave implements comprehensive behavioral psychology enhancements designed to increase user engagement and saving behavior through proven psychological techniques.

### Core Behavioral Principles

#### 1. Loss Aversion Reframing
- **What it is**: Reframing goals to emphasize avoiding negative outcomes rather than gaining positive ones
- **Why it works**: People are 2-3x more motivated to avoid losses than to achieve gains
- **Implementation**: Goal creation wizard with "Avoid Loss" vs "Achieve Goal" framing options

#### 2. Future Self Visualization
- **What it is**: Showing users the future value of their current savings with compound interest projections
- **Why it works**: Creates emotional connection between current actions and future outcomes
- **Implementation**: Interactive charts showing 1, 5, 10, and 20-year projections

#### 3. Enhanced Gamification
- **What it is**: Comprehensive achievement system with badges, points, and challenges
- **Why it works**: Leverages dopamine-driven reward systems and social comparison
- **Implementation**: Achievement system with progress tracking and leaderboards

#### 4. Social Proof Integration
- **What it is**: Normalizing saving behavior through peer comparison and trend data
- **Why it works**: People are more likely to adopt behaviors they see others doing
- **Implementation**: Peer comparison metrics, popular saving times, and community insights

#### 5. Anchoring Optimization
- **What it is**: Using strategic defaults and peer data to influence saving amounts
- **Why it works**: Initial values (anchors) significantly influence subsequent decisions
- **Implementation**: A/B testing of default amounts and dynamic suggestions based on goals

### Implementation Components

#### Enhanced GoalWizard

**File**: `components/goals/GoalWizard.tsx`

**Features**:
- Loss aversion vs achievement framing selection
- Photo upload for emotional connection
- Risk awareness messaging
- Behavioral psychology explanations

**Usage**:
```tsx
<GoalWizard
  onGoalCreated={handleGoalCreated}
  visualGoalSetting={true}
  milestoneBreakdown={true}
/>
```

#### Enhanced GoalProgressTracker

**File**: `components/goals/GoalProgressTracker.tsx`

**Features**:
- Multiple visual styles (progress bar, thermometer, jar)
- Future self projections with compound interest
- Enhanced animations and celebrations
- Photo integration

**Usage**:
```tsx
<GoalProgressTracker
  showFutureProjections={true}
  celebrationAnimations={true}
  visualStyles={['progressBar', 'thermometer', 'jar']}
/>
```

#### QuickSaveWidget

**File**: `components/goals/QuickSaveWidget.tsx`

**Features**:
- A/B testing for default amounts
- Dynamic defaults based on user goals
- Social proof integration
- Anchoring optimization

**Usage**:
```tsx
<QuickSaveWidget
  goals={goals}
  showSocialProof={true}
  enableAnchoring={true}
  onQuickSave={handleQuickSave}
/>
```

#### AchievementSystem

**File**: `components/goals/AchievementSystem.tsx`

**Features**:
- Multiple achievement categories
- Progress tracking
- Points system
- Community leaderboard
- Unlock animations

**Usage**:
```tsx
<AchievementSystem
  userId={userId}
  showLeaderboard={true}
  enableNotifications={true}
  onAchievementUnlocked={handleAchievement}
/>
```

### Behavioral Psychology Hooks

#### useBehavioralNudge

```typescript
// hooks/useBehavioralNudge.ts
import { useState, useEffect } from 'react';

interface NudgeConfig {
  type: 'loss-aversion' | 'social-proof' | 'future-self' | 'anchoring';
  frequency: 'daily' | 'weekly' | 'monthly';
  conditions: Record<string, any>;
}

export function useBehavioralNudge(config: NudgeConfig) {
  const [shouldShowNudge, setShouldShowNudge] = useState(false);
  const [nudgeContent, setNudgeContent] = useState<any>(null);

  useEffect(() => {
    const checkNudgeConditions = async () => {
      // Check if conditions are met for showing nudge
      const conditionsMet = await evaluateConditions(config.conditions);
      
      if (conditionsMet) {
        const content = await generateNudgeContent(config.type);
        setNudgeContent(content);
        setShouldShowNudge(true);
      }
    };

    checkNudgeConditions();
  }, [config]);

  const dismissNudge = () => {
    setShouldShowNudge(false);
    // Track nudge dismissal for analytics
    trackNudgeInteraction(config.type, 'dismissed');
  };

  const actOnNudge = () => {
    setShouldShowNudge(false);
    // Track nudge action for analytics
    trackNudgeInteraction(config.type, 'acted');
  };

  return {
    shouldShowNudge,
    nudgeContent,
    dismissNudge,
    actOnNudge
  };
}
```

#### useGoalFraming

```typescript
// hooks/useGoalFraming.ts
import { useState, useEffect } from 'react';

interface GoalFramingOptions {
  lossAversion: string;
  achievement: string;
  neutral: string;
}

export function useGoalFraming(goalType: string, userPreferences: any) {
  const [framing, setFraming] = useState<'loss-aversion' | 'achievement' | 'neutral'>('neutral');
  const [framingText, setFramingText] = useState('');

  useEffect(() => {
    // Determine optimal framing based on user behavior and preferences
    const optimalFraming = determineOptimalFraming(goalType, userPreferences);
    setFraming(optimalFraming);
    
    // Generate appropriate text for the chosen framing
    const text = generateFramingText(goalType, optimalFraming);
    setFramingText(text);
  }, [goalType, userPreferences]);

  const reframeGoal = (newFraming: typeof framing) => {
    setFraming(newFraming);
    const text = generateFramingText(goalType, newFraming);
    setFramingText(text);
    
    // Track framing change for A/B testing
    trackFramingChange(goalType, newFraming);
  };

  return {
    framing,
    framingText,
    reframeGoal
  };
}
```

### A/B Testing Framework

#### Experiment Configuration

```typescript
// lib/experiments/config.ts
export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  trafficSplit: number; // Percentage of users to include
  startDate: Date;
  endDate?: Date;
  metrics: string[];
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // Traffic distribution weight
  config: Record<string, any>;
}

export const BEHAVIORAL_EXPERIMENTS: Experiment[] = [
  {
    id: 'goal-framing-2024',
    name: 'Goal Framing Optimization',
    description: 'Test different goal framing approaches for engagement',
    variants: [
      {
        id: 'loss-aversion',
        name: 'Loss Aversion',
        weight: 0.33,
        config: { framing: 'loss-aversion', messaging: 'avoid-loss' }
      },
      {
        id: 'achievement',
        name: 'Achievement',
        weight: 0.33,
        config: { framing: 'achievement', messaging: 'gain-focused' }
      },
      {
        id: 'control',
        name: 'Control',
        weight: 0.34,
        config: { framing: 'neutral', messaging: 'standard' }
      }
    ],
    trafficSplit: 0.1, // 10% of users
    startDate: new Date('2024-01-01'),
    metrics: ['goal_creation_rate', 'goal_completion_rate', 'user_engagement']
  }
];
```

#### Experiment Hook

```typescript
// hooks/useExperiment.ts
import { useState, useEffect } from 'react';
import { Experiment, ExperimentVariant } from '@/lib/experiments/config';

export function useExperiment(experimentId: string, userId: string) {
  const [variant, setVariant] = useState<ExperimentVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const assignVariant = async () => {
      try {
        const assignedVariant = await assignUserToVariant(experimentId, userId);
        setVariant(assignedVariant);
      } catch (error) {
        console.error('Failed to assign experiment variant:', error);
        // Fallback to control variant
        setVariant(getControlVariant(experimentId));
      } finally {
        setIsLoading(false);
      }
    };

    assignVariant();
  }, [experimentId, userId]);

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (variant) {
      trackExperimentEvent(experimentId, variant.id, eventName, properties);
    }
  };

  return {
    variant,
    isLoading,
    trackEvent
  };
}
```

## 🌍 Translation System Implementation

### Overview

SmartSave implements a comprehensive translation system supporting multiple languages with instant switching and RTL layout support.

### Supported Languages

- **English** (en) - Default language
- **Arabic** (ar) - RTL support
- **Persian** (fa) - RTL support
- **Spanish** (es) - LTR support
- **French** (fr) - LTR support

### File Structure

```
public/locales/
├── en/                    # English translations
│   ├── common.json       # Common UI elements
│   ├── dashboard.json    # Dashboard-specific content
│   ├── budget.json       # Budget module content
│   ├── goals.json        # Goals module content
│   ├── transactions.json # Transactions module content
│   ├── education.json    # Education module content
│   ├── settings.json     # Settings module content
│   ├── auth.json         # Authentication content
│   └── errors.json       # Error messages
├── ar/                    # Arabic translations
│   └── [same structure]
├── fa/                    # Persian translations
│   └── [same structure]
├── es/                    # Spanish translations
│   └── [same structure]
└── fr/                    # French translations
    └── [same structure]
```

### Translation Hook

#### Basic Usage

```typescript
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
  
  const formatNumber = (number: number, options?: Intl.NumberFormatOptions) => {
    const formatter = new Intl.NumberFormat(currentLocale, options);
    return formatter.format(number);
  };
  
  return {
    t,
    ready,
    i18n,
    isRTL,
    currentLocale,
    changeLanguage,
    formatCurrency,
    formatDate,
    formatNumber
  };
}
```

#### Advanced Usage with Multiple Namespaces

```typescript
// hooks/useTranslation.ts (continued)
export function useTranslationAdvanced(namespaces: string[]) {
  const { t, i18n, ready } = useNextI18n(namespaces);
  
  // Force re-render when language changes
  const [forceUpdate, setForceUpdate] = useState(0);
  
  useEffect(() => {
    const handleLanguageChange = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  return {
    t,
    ready,
    i18n,
    forceUpdate,
    isRTL: i18n.dir() === 'rtl',
    currentLocale: i18n.language
  };
}
```

### Component Implementation

#### Basic Component Translation

```tsx
// components/common/Button.tsx
import { useTranslation } from '@/hooks/useTranslation';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', size = 'md', children, onClick }: ButtonProps) {
  const { t, ready } = useTranslation(['common']);
  
  if (!ready) {
    return <div className="animate-pulse bg-gray-200 rounded h-10 w-20" />;
  }
  
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

#### Advanced Component with Dynamic Content

```tsx
// components/dashboard/FinancialInsights.tsx
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency, formatDate } from '@/hooks/useTranslation';

interface FinancialInsightsProps {
  insights: {
    monthlySavings: number;
    budgetUtilization: number;
    goalProgress: number;
    lastUpdated: Date;
  };
}

export function FinancialInsights({ insights }: FinancialInsightsProps) {
  const { t, isRTL, currentLocale } = useTranslation(['dashboard', 'common']);
  
  const getInsightColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'text-green-600';
    if (value >= threshold * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      <h2 className="text-xl font-semibold">
        {t('dashboard:insights.title')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {t('dashboard:insights.monthlySavings')}
          </h3>
          <p className={`text-2xl font-bold ${getInsightColor(insights.monthlySavings, 500)}`}>
            {formatCurrency(insights.monthlySavings)}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {t('dashboard:insights.budgetUtilization')}
          </h3>
          <p className={`text-2xl font-bold ${getInsightColor(insights.budgetUtilization, 0.8)}`}>
            {formatNumber(insights.budgetUtilization, { style: 'percent', minimumFractionDigits: 1 })}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {t('dashboard:insights.goalProgress')}
          </h3>
          <p className={`text-2xl font-bold ${getInsightColor(insights.goalProgress, 0.7)}`}>
            {formatNumber(insights.goalProgress, { style: 'percent', minimumFractionDigits: 1 })}
          </p>
        </div>
      </div>
      
      <p className="text-sm text-gray-500">
        {t('dashboard:insights.lastUpdated')}: {formatDate(insights.lastUpdated)}
      </p>
    </div>
  );
}
```

### RTL Layout Support

#### RTL-Aware Components

```tsx
// components/common/Layout.tsx
import { useTranslation } from '@/hooks/useTranslation';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
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

#### RTL-Aware Styling

```css
/* styles/rtl.css */
[dir="rtl"] .ml-4 {
  margin-left: 0;
  margin-right: 1rem;
}

[dir="rtl"] .mr-4 {
  margin-right: 0;
  margin-left: 1rem;
}

[dir="rtl"] .pl-4 {
  padding-left: 0;
  padding-right: 1rem;
}

[dir="rtl"] .pr-4 {
  padding-right: 0;
  padding-left: 1rem;
}

[dir="rtl"] .text-left {
  text-align: right;
}

[dir="rtl"] .text-right {
  text-align: left;
}

[dir="rtl"] .flex-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .flex-row-reverse {
  flex-direction: row;
}
```

### Translation Management

#### Translation File Structure

```json
// public/locales/en/common.json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "remove": "Remove"
  },
  "status": {
    "loading": "Loading...",
    "success": "Success!",
    "error": "Error occurred",
    "empty": "No data available"
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email address",
    "minLength": "Must be at least {min} characters",
    "maxLength": "Must be no more than {max} characters"
  }
}
```

```json
// public/locales/ar/common.json
{
  "actions": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "add": "إضافة",
    "remove": "إزالة"
  },
  "status": {
    "loading": "جاري التحميل...",
    "success": "تم بنجاح!",
    "error": "حدث خطأ",
    "empty": "لا توجد بيانات متاحة"
  },
  "validation": {
    "required": "هذا الحقل مطلوب",
    "email": "يرجى إدخال عنوان بريد إلكتروني صحيح",
    "minLength": "يجب أن يكون على الأقل {min} أحرف",
    "maxLength": "يجب ألا يزيد عن {max} أحرف"
  }
}
```

#### Dynamic Translation Loading

```typescript
// lib/translation-loader.ts
import { i18n } from 'next-i18next';

export async function preloadTranslation(locale: string, namespaces: string[]) {
  try {
    await Promise.all(
      namespaces.map(namespace => 
        i18n.loadNamespaces([namespace])
      )
    );
    
    // Preload common phrases for better performance
    await i18n.loadNamespaces(['common']);
    
    return true;
  } catch (error) {
    console.error(`Failed to preload translations for ${locale}:`, error);
    return false;
  }
}

export async function changeLanguageWithPreload(locale: string) {
  // Preload translations before changing language
  const success = await preloadTranslation(locale, ['common', 'dashboard']);
  
  if (success) {
    await i18n.changeLanguage(locale);
    return true;
  }
  
  return false;
}
```

## 🔒 Security Implementation

### Authentication & Authorization

#### JWT Token Management

```typescript
// lib/auth/token-manager.ts
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

export class TokenManager {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor() {
    this.secret = process.env.JWT_SECRET!;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  generateAccessToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    };

    return jwt.sign(payload, this.secret, { 
      expiresIn: this.expiresIn,
      issuer: 'smartsave',
      audience: 'smartsave-users'
    });
  }

  generateRefreshToken(user: User): string {
    const payload = {
      userId: user.id,
      type: 'refresh'
    };

    return jwt.sign(payload, this.secret, { 
      expiresIn: this.refreshExpiresIn,
      issuer: 'smartsave',
      audience: 'smartsave-users'
    });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'smartsave',
        audience: 'smartsave-users'
      });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
```

#### Role-Based Access Control

```typescript
// lib/auth/rbac.ts
export enum UserRole {
  USER = 'user',
  PREMIUM_USER = 'premium_user',
  ADMIN = 'admin'
}

export enum Permission {
  VIEW_DASHBOARD = 'view_dashboard',
  MANAGE_BUDGETS = 'manage_budgets',
  MANAGE_GOALS = 'manage_goals',
  VIEW_REPORTS = 'view_reports',
  MANAGE_USERS = 'manage_users',
  SYSTEM_ADMIN = 'system_admin'
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_BUDGETS,
    Permission.MANAGE_GOALS
  ],
  [UserRole.PREMIUM_USER]: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_BUDGETS,
    Permission.MANAGE_GOALS,
    Permission.VIEW_REPORTS
  ],
  [UserRole.ADMIN]: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_BUDGETS,
    Permission.MANAGE_GOALS,
    Permission.VIEW_REPORTS,
    Permission.MANAGE_USERS,
    Permission.SYSTEM_ADMIN
  ]
};

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
}

export function requirePermission(permission: Permission) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      const user = this.getCurrentUser();
      if (!hasPermission(user.role, permission)) {
        throw new Error('Insufficient permissions');
      }
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}
```

### Input Validation & Sanitization

#### Zod Schema Validation

```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

export const userRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
    .regex(/^(?=.*[!@#$%^&*])/, 'Password must contain at least one special character'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  dateOfBirth: z.string()
    .datetime('Invalid date format')
    .refine(date => new Date(date) < new Date(), 'Date of birth must be in the past'),
  phoneNumber: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .optional(),
  preferences: z.object({
    currency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']).default('USD'),
    language: z.enum(['en', 'es', 'fr', 'de', 'ar', 'fa']).default('en'),
    timezone: z.string().default('UTC'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      sms: z.boolean().default(false)
    }).default({}),
    privacy: z.object({
      shareData: z.boolean().default(false),
      analytics: z.boolean().default(true),
      marketing: z.boolean().default(false)
    }).default({})
  }).optional()
});

export const budgetCreateSchema = z.object({
  name: z.string()
    .min(1, 'Budget name is required')
    .max(255, 'Budget name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Budget name contains invalid characters'),
  amount: z.number()
    .positive('Amount must be positive')
    .max(999999999.99, 'Amount too large'),
  period: z.enum(['weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Period must be weekly, monthly, or yearly' })
  }),
  startDate: z.string()
    .datetime('Invalid start date format')
    .refine(date => new Date(date) >= new Date(), 'Start date must be in the future or today'),
  endDate: z.string()
    .datetime('Invalid end date format'),
  categories: z.array(z.object({
    name: z.string()
      .min(1, 'Category name is required')
      .max(100, 'Category name too long'),
    amount: z.number()
      .positive('Category amount must be positive')
      .max(999999999.99, 'Category amount too large'),
    color: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
      .optional(),
    icon: z.string()
      .max(50, 'Icon name too long')
      .optional()
  }))
  .min(1, 'At least one category is required')
  .max(20, 'Too many categories')
  .refine(categories => {
    const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
    return Math.abs(totalAmount - 100) < 0.01; // Allow small rounding differences
  }, 'Category amounts must sum to 100%')
});

export const transactionCreateSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(999999999.99, 'Amount too large'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description too long')
    .regex(/^[a-zA-Z0-9\s\-_.,!?]+$/, 'Description contains invalid characters'),
  transactionDate: z.string()
    .datetime('Invalid transaction date format')
    .refine(date => new Date(date) <= new Date(), 'Transaction date cannot be in the future'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Type must be income or expense' })
  }),
  budgetCategoryId: z.string()
    .uuid('Invalid category ID format')
    .optional(),
  tags: z.array(z.string())
    .max(10, 'Too many tags')
    .optional(),
  receipt: z.object({
    filename: z.string().max(255, 'Filename too long'),
    size: z.number().max(10 * 1024 * 1024, 'File too large (max 10MB)'),
    type: z.string().regex(/^image\/(jpeg|png|gif|webp)$/, 'Invalid file type')
  }).optional()
});
```

#### Input Sanitization

```typescript
// lib/security/sanitizer.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export class InputSanitizer {
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Remove script tags and event handlers
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Remove SQL injection patterns
    const sqlPatterns = [
      /(\b(select|insert|update|delete|drop|create|alter|exec|execute|union|declare)\b)/gi,
      /(\b(and|or|not)\b)/gi,
      /(--|#|\/\*|\*\/)/g,
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/gi
    ];
    
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Remove XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload/gi,
      /onerror/gi,
      /onclick/gi
    ];
    
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }
  
  static sanitizeHTML(html: string): string {
    if (typeof html !== 'string') {
      return '';
    }
    
    // Use DOMPurify for HTML sanitization
    return purify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false
    });
  }
  
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') {
      return '';
    }
    
    // Basic email validation and sanitization
    const sanitized = email.toLowerCase().trim();
    
    // Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      return '';
    }
    
    return sanitized;
  }
  
  static sanitizeNumber(input: any): number | null {
    if (typeof input === 'number') {
      return isFinite(input) ? input : null;
    }
    
    if (typeof input === 'string') {
      const parsed = parseFloat(input);
      return isFinite(parsed) ? parsed : null;
    }
    
    return null;
  }
  
  static sanitizeDate(input: any): Date | null {
    if (input instanceof Date) {
      return isFinite(input.getTime()) ? input : null;
    }
    
    if (typeof input === 'string') {
      const parsed = new Date(input);
      return isFinite(parsed.getTime()) ? parsed : null;
    }
    
    if (typeof input === 'number') {
      const parsed = new Date(input);
      return isFinite(parsed.getTime()) ? parsed : null;
    }
    
    return null;
  }
}
```

## 🚀 Performance Optimization

### Code Splitting & Lazy Loading

#### Route-Based Code Splitting

```typescript
// app/layout.tsx
import dynamic from 'next/dynamic';

// Lazy load non-critical components
const Analytics = dynamic(() => import('@/components/Analytics'), {
  ssr: false,
  loading: () => <div className="h-8 bg-gray-200 animate-pulse rounded" />
});

const ChatWidget = dynamic(() => import('@/components/ChatWidget'), {
  ssr: false,
  loading: () => <div className="fixed bottom-4 right-4 w-12 h-12 bg-blue-500 rounded-full animate-pulse" />
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <ChatWidget />
      </body>
    </html>
  );
}
```

#### Component-Level Lazy Loading

```typescript
// components/dashboard/Charts.tsx
import dynamic from 'next/dynamic';

// Lazy load chart components
const LineChart = dynamic(() => import('@/components/charts/LineChart'), {
  loading: () => <ChartSkeleton />
});

const PieChart = dynamic(() => import('@/components/charts/PieChart'), {
  loading: () => <ChartSkeleton />
});

const BarChart = dynamic(() => import('@/components/charts/BarChart'), {
  loading: () => <ChartSkeleton />
});

export function DashboardCharts({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <LineChart data={data.trends} />
      <PieChart data={data.categories} />
      <BarChart data={data.comparison} />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
      <div className="h-48 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}
```

### Caching Strategies

#### API Response Caching

```typescript
// lib/cache/api-cache.ts
import { Redis } from 'ioredis';

export class APICache {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${prefix}:${sortedParams}`;
  }
}

// Cache decorator
export function cache(ttl: number = 300) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cacheInstance = new APICache();
    
    descriptor.value = async function(...args: any[]) {
      const cacheKey = cacheInstance.generateKey(
        `${target.constructor.name}.${propertyKey}`,
        { args: JSON.stringify(args) }
      );
      
      // Try to get from cache
      const cached = await cacheInstance.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await cacheInstance.set(cacheKey, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}
```

#### Database Query Caching

```typescript
// lib/database/cached-repository.ts
import { APICache } from '@/lib/cache/api-cache';

export abstract class CachedRepository {
  protected cache: APICache;
  protected cacheTTL: number = 300; // 5 minutes

  constructor() {
    this.cache = new APICache();
  }

  protected async getCached<T>(
    key: string,
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.cache.get<T>(key);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const data = await fetchFunction();
    
    // Cache the result
    await this.cache.set(key, data, this.cacheTTL);
    
    return data;
  }

  protected async invalidateCache(pattern: string): Promise<void> {
    await this.cache.invalidate(pattern);
  }

  protected generateCacheKey(prefix: string, params: Record<string, any>): string {
    return this.cache.generateKey(prefix, params);
  }
}

// Example usage
export class CachedUserRepository extends CachedRepository {
  async findById(id: string): Promise<User | null> {
    const cacheKey = this.generateCacheKey('user', { id });
    
    return this.getCached(cacheKey, async () => {
      // Database query implementation
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    // Invalidate related cache entries
    await this.invalidateCache(`user:${id}`);
    await this.invalidateCache('users:list');
    
    // Perform update
    // ... implementation
  }
}
```

---

**Next Steps**: Explore [Frontend Development](frontend-development.md) for UI component development, or [Security & Best Practices](security-best-practices.md) for security implementation details.

/* 
  Test suite for lib/utils utilities.

  Framework note: This suite uses Jest-style APIs (describe/it/expect, jest.useFakeTimers/jest.setSystemTime).
  If the project uses Vitest, replace "jest" with "vi" in timer/system time calls, or add small shims.
*/

import {
  cn,
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
  formatDate,
  formatRelativeTime,
  calculatePercentage,
  calculateProgress,
  debounce,
  throttle,
  generateId,
  isValidEmail,
  getBudgetCategoryColor,
  getGoalStatusColor,
  formatTimeRemaining,
  getTimeBasedGreeting,
  sanitizeNumberInput,
  calculateCompoundInterest,
  getBudgetMethodConfig,
  isTouchDevice,
  getSafeAreaInsets,
} from '../../lib/utils'; // Adjust path if utils.ts resides elsewhere

// For environments where globals may be missing (e.g., Node without JSDOM)
declare const global: any;

const usingVitest = typeof (global as any).vi !== 'undefined';
const clock = usingVitest ? (global as any).vi : (global as any).jest;

describe('cn (class name combiner)', () => {
  it('combines strings, arrays and objects with truthy values', () => {
    const result = cn('a', ['b', null], { c: true, d: false }, undefined, 0 && 'z', 'e');
    expect(result.split(/\s+/).sort().join(' ')).toBe('a b c e');
  });

  it('returns empty string for all falsy inputs', () => {
    // @ts-expect-error testing runtime behavior with falsy values
    const result = cn(null, undefined, false, 0, '');
    expect(result).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats USD en-US with 2 decimals', () => {
    expect(formatCurrency(1234.5, 'USD', 'en-US')).toBe('$1,234.50');
  });
  it('formats EUR de-DE locale', () => {
    const s = formatCurrency(9876.543, 'EUR', 'de-DE');
    expect(s).toMatch(/[€]/);
    // Typical de-DE: 9.876,54 €
    expect(s).toMatch(/9[.,]876[.,]54/);
  });
});

describe('formatPercentage', () => {
  it('applies default precision 1', () => {
    expect(formatPercentage(12.345)).toBe('12.3%');
  });
  it('applies custom precision', () => {
    expect(formatPercentage(12.345, 3)).toBe('12.345%');
  });
});

describe('formatCompactNumber', () => {
  it('abbreviates thousands', () => {
    const s = formatCompactNumber(12_300, 'en-US');
    // "12.3K" or "12K" depending on rounding; maxFractionDigits:1 -> "12.3K"
    expect(s).toMatch(/^12(\.|,)?3?K$/);
  });
  it('abbreviates millions', () => {
    const s = formatCompactNumber(2_500_000, 'en-US');
    expect(s).toMatch(/^2(\.|,)?5?M$/);
  });
});

describe('formatDate', () => {
  it('formats a Date with default pattern', () => {
    const date = new Date('2023-10-05T12:00:00Z');
    expect(formatDate(date)).toMatch(/Oct 05, 2023|Oct 5, 2023/);
  });
  it('formats from string with custom pattern', () => {
    expect(formatDate('2024-02-29', 'yyyy/MM/dd')).toBe('2024/02/29');
  });
});

describe('formatRelativeTime', () => {
  const base = new Date('2025-03-15T10:00:00Z');

  beforeAll(() => {
    clock.useFakeTimers?.();
    clock.setSystemTime?.(base);
    if (!clock.useFakeTimers) {
      // Fallback if neither vi/jest timers are available; may be ignored in some runners
      (Date as any).now = () => base.getTime();
    }
  });

  afterAll(() => {
    clock.useRealTimers?.();
  });

  it('returns "Today" when date is today', () => {
    expect(formatRelativeTime(new Date('2025-03-15T08:00:00Z'))).toBe('Today');
  });

  it('returns "Yesterday" for previous day', () => {
    expect(formatRelativeTime(new Date('2025-03-14T23:59:59Z'))).toBe('Yesterday');
  });

  it('returns weekday name for dates this week', () => {
    const s = formatRelativeTime(new Date('2025-03-13T09:00:00Z'));
    // Example: "Thursday"
    expect(s).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
  });

  it('returns "MMM dd" for dates earlier in this month', () => {
    const s = formatRelativeTime(new Date('2025-03-01T00:00:00Z'));
    expect(s).toMatch(/Mar/);
  });

  it('returns distance with suffix for older dates', () => {
    const s = formatRelativeTime(new Date('2024-12-31T00:00:00Z'));
    // e.g., "in 2 months" or "2 months ago" depending on relative direction
    expect(s).toMatch(/ago|in/);
  });
});

describe('calculatePercentage', () => {
  it('returns 0 when total is 0', () => {
    expect(calculatePercentage(50, 0)).toBe(0);
  });
  it('handles normal values', () => {
    expect(calculatePercentage(25, 200)).toBeCloseTo(12.5);
  });
});

describe('calculateProgress', () => {
  it('computes capped percentage and remaining with incomplete progress', () => {
    const res = calculateProgress(30, 100);
    expect(res).toEqual({ percentage: 30, remaining: 70, isComplete: false });
  });
  it('caps percentage at 100 and marks complete', () => {
    const res = calculateProgress(150, 100);
    expect(res).toEqual({ percentage: 100, remaining: 0, isComplete: true });
  });
  it('never returns negative remaining', () => {
    const res = calculateProgress(120, 0);
    expect(res.remaining).toBe(0);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    clock.useFakeTimers?.();
  });
  afterEach(() => {
    clock.runAllTimers?.();
    clock.useRealTimers?.();
  });

  it('delays calls and only invokes once after wait', () => {
    const spy = usingVitest ? (global as any).vi.fn() : (global as any).jest.fn();
    const fn = debounce(spy, 200);

    fn('a');
    fn('b');
    fn('c');

    expect(spy).not.toHaveBeenCalled();
    clock.advanceTimersByTime?.(199);
    expect(spy).not.toHaveBeenCalled();
    clock.advanceTimersByTime?.(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('c');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    clock.useFakeTimers?.();
  });
  afterEach(() => {
    clock.runAllTimers?.();
    clock.useRealTimers?.();
  });

  it('invokes immediately then throttles subsequent calls within limit', () => {
    const spy = usingVitest ? (global as any).vi.fn() : (global as any).jest.fn();
    const fn = throttle(spy, 300);

    fn(1);
    fn(2);
    fn(3);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(1);

    clock.advanceTimersByTime?.(299);
    fn(4);
    expect(spy).toHaveBeenCalledTimes(1);

    clock.advanceTimersByTime?.(1);
    fn(5);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(5);
  });
});

describe('generateId', () => {
  const realRandom = Math.random;
  const base = 1731324800000; // fixed epoch example

  beforeAll(() => {
    clock.useFakeTimers?.();
    clock.setSystemTime?.(new Date(base));
    Math.random = () => 0.123456789; // "0.3w5e11264..." when toString(36)
  });

  afterAll(() => {
    Math.random = realRandom;
    clock.useRealTimers?.();
  });

  it('combines base36 random substring and timestamp', () => {
    const id = generateId();
    // Should be random-part (no "0.") + base36 timestamp
    const parts = id.match(/^[0-9a-z]+$/);
    expect(parts).toBeTruthy();
    expect(id.length).toBeGreaterThan(6);
  });

  it('generates different values over time', () => {
    const a = generateId();
    clock.advanceTimersByTime?.(1);
    const b = generateId();
    expect(a).not.toEqual(b);
  });
});

describe('isValidEmail', () => {
  it('accepts valid addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.domain.co')).toBe(true);
  });
  it('rejects invalid addresses', () => {
    expect(isValidEmail('no-at-symbol')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@@example.com')).toBe(false);
    expect(isValidEmail('user@ example.com')).toBe(false);
  });
});

describe('getBudgetCategoryColor', () => {
  it('returns red at or above 100% spent', () => {
    expect(getBudgetCategoryColor(100, 100)).toBe('text-accent-warning-red');
    expect(getBudgetCategoryColor(120, 100)).toBe('text-accent-warning-red');
  });
  it('returns orange at or above 80% but below 100%', () => {
    expect(getBudgetCategoryColor(80, 100)).toBe('text-accent-action-orange');
    expect(getBudgetCategoryColor(99, 100)).toBe('text-accent-action-orange');
  });
  it('returns gray at or above 60% but below 80%', () => {
    expect(getBudgetCategoryColor(60, 100)).toBe('text-neutral-gray');
    expect(getBudgetCategoryColor(79, 100)).toBe('text-neutral-gray');
  });
  it('returns green below 60%', () => {
    expect(getBudgetCategoryColor(0, 100)).toBe('text-secondary-growth-green');
    expect(getBudgetCategoryColor(59, 100)).toBe('text-secondary-growth-green');
  });
  it('treats allocated=0 as critical (Infinity ratio)', () => {
    expect(getBudgetCategoryColor(50, 0)).toBe('text-accent-warning-red');
  });
});

describe('getGoalStatusColor', () => {
  it('returns emerald at 100% or more', () => {
    expect(getGoalStatusColor(100, 100)).toBe('text-accent-success-emerald');
    expect(getGoalStatusColor(120, 100)).toBe('text-accent-success-emerald');
  });
  it('returns green at >=75% and <100%', () => {
    expect(getGoalStatusColor(75, 100)).toBe('text-secondary-growth-green');
    expect(getGoalStatusColor(99, 100)).toBe('text-secondary-growth-green');
  });
  it('returns orange at >=50% and <75%', () => {
    expect(getGoalStatusColor(50, 100)).toBe('text-accent-action-orange');
    expect(getGoalStatusColor(74, 100)).toBe('text-accent-action-orange');
  });
  it('returns blue below 50%', () => {
    expect(getGoalStatusColor(0, 100)).toBe('text-primary-trust-blue');
  });
  it('handles target=0 by returning blue (progress coerced to 0)', () => {
    expect(getGoalStatusColor(10, 0)).toBe('text-primary-trust-blue');
  });
});

describe('formatTimeRemaining', () => {
  const base = new Date('2025-01-01T00:00:00Z');

  beforeAll(() => {
    clock.useFakeTimers?.();
    clock.setSystemTime?.(base);
  });

  afterAll(() => {
    clock.useRealTimers?.();
  });

  it('returns Overdue when targetDate <= now', () => {
    expect(formatTimeRemaining(new Date('2024-12-31T23:59:59Z'))).toBe('Overdue');
    expect(formatTimeRemaining(new Date('2025-01-01T00:00:00Z'))).toBe('Overdue');
  });

  it('returns "1 day left" for exactly one day', () => {
    expect(formatTimeRemaining(new Date('2025-01-02T00:00:00Z'))).toBe('1 day left');
  });

  it('returns days for < 30 days', () => {
    expect(formatTimeRemaining(new Date('2025-01-10T00:00:00Z'))).toBe('9 days left');
  });

  it('returns months for < 365 days (ceil by 30-day months)', () => {
    // 60 days -> 2 months
    expect(formatTimeRemaining(new Date('2025-03-02T00:00:00Z'))).toBe('2 months left');
    // 30 days -> 1 month
    expect(formatTimeRemaining(new Date('2025-01-31T00:00:00Z'))).toBe('1 month left');
  });

  it('returns years for >= 365 days (ceil)', () => {
    // 365 days -> 1 year
    expect(formatTimeRemaining(new Date('2026-01-01T00:00:00Z'))).toBe('1 year left');
    // 366..730 -> 2 years left (ceil)
    expect(formatTimeRemaining(new Date('2027-01-01T00:00:00Z'))).toBe('2 years left');
  });
});

describe('getTimeBasedGreeting', () => {
  const realDate = Date;

  function mockHour(hour: number) {
    const base = new Date('2025-06-01T00:00:00Z');
    const fake = class extends Date {
      constructor(...args: any[]) {
        super(...(args.length ? args : [base]));
      }
      getHours() {
        return hour;
      }
    } as unknown as DateConstructor;
    // @ts-ignore override global Date
    global.Date = fake;
  }

  afterEach(() => {
    // @ts-ignore
    global.Date = realDate;
  });

  it('morning (<12)', () => {
    mockHour(9);
    expect(getTimeBasedGreeting()).toBe('Good morning');
  });
  it('afternoon (<17)', () => {
    mockHour(16);
    expect(getTimeBasedGreeting()).toBe('Good afternoon');
  });
  it('evening (>=17)', () => {
    mockHour(20);
    expect(getTimeBasedGreeting()).toBe('Good evening');
  });
});

describe('sanitizeNumberInput', () => {
  it('keeps positive numbers and strips non-numeric', () => {
    expect(sanitizeNumberInput('1,234.56')).toBeCloseTo(1234.56);
    expect(sanitizeNumberInput('$99.99')).toBeCloseTo(99.99);
  });
  it('clamps negatives to 0', () => {
    expect(sanitizeNumberInput('-5')).toBe(0);
    expect(sanitizeNumberInput('$-12.34')).toBe(0);
  });
  it('returns 0 for NaN-ish inputs', () => {
    expect(sanitizeNumberInput('abc')).toBe(0);
    expect(sanitizeNumberInput('')).toBe(0);
  });
});

describe('calculateCompoundInterest', () => {
  it('computes compound interest with default monthly compounding', () => {
    // principal 1000, rate 12% APR, 1 year, monthly compounding -> 1000 * (1+0.12/12)^(12) ≈ 1126.825
    const result = calculateCompoundInterest(1000, 0.12, 1);
    expect(result).toBeCloseTo(1126.83, 2);
  });
  it('supports custom compounding frequency', () => {
    // quarterly compounding
    const result = calculateCompoundInterest(5000, 0.08, 3, 4); // 3 years
    const expected = 5000 * Math.pow(1 + 0.08 / 4, 12);
    expect(result).toBeCloseTo(expected, 6);
  });
});

describe('getBudgetMethodConfig', () => {
  it('returns known config by key', () => {
    const env = getBudgetMethodConfig('envelope');
    expect(env.name).toBe('Digital Envelope System');
    expect(Array.isArray(env.categories)).toBe(true);
  });
  it('defaults to 50-30-20 for unknown method', () => {
    const def = getBudgetMethodConfig('non-existent');
    expect(def.name).toBe('50/30/20 Rule');
  });
});

describe('isTouchDevice', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  afterEach(() => {
    global.window = originalWindow;
    global.navigator = originalNavigator;
  });

  it('detects touch via ontouchstart in window', () => {
    // @ts-ignore
    global.window = { ontouchstart: true };
    // @ts-ignore
    global.navigator = { maxTouchPoints: 0 };
    expect(isTouchDevice()).toBe(true);
  });

  it('detects touch via navigator.maxTouchPoints', () => {
    // @ts-ignore
    global.window = {};
    // @ts-ignore
    global.navigator = { maxTouchPoints: 2 };
    expect(isTouchDevice()).toBe(true);
  });

  it('returns false when neither indicator is present', () => {
    // @ts-ignore
    global.window = {};
    // @ts-ignore
    global.navigator = { maxTouchPoints: 0 };
    expect(isTouchDevice()).toBe(false);
  });
});

describe('getSafeAreaInsets', () => {
  const originalGetComputedStyle = global.getComputedStyle;
  const originalDocument = global.document;

  beforeEach(() => {
    // Minimal DOM stubs
    // @ts-ignore
    global.document = {
      documentElement: {},
    };
    global.getComputedStyle = () =>
      ({
        getPropertyValue: (prop: string) => {
          switch (prop) {
            case 'env(safe-area-inset-top)':
              return '10px';
            case 'env(safe-area-inset-right)':
              return '12px';
            case 'env(safe-area-inset-bottom)':
              return '14px';
            case 'env(safe-area-inset-left)':
              return '16px';
            default:
              return '';
          }
        },
      } as any);
  });

  afterEach(() => {
    global.getComputedStyle = originalGetComputedStyle;
    global.document = originalDocument;
  });

  it('returns safe area inset values with fallbacks', () => {
    const insets = getSafeAreaInsets();
    expect(insets).toEqual({
      top: '10px',
      right: '12px',
      bottom: '14px',
      left: '16px',
    });
  });

  it('falls back to "0px" when properties are empty', () => {
    global.getComputedStyle = () =>
      ({
        getPropertyValue: () => '',
      } as any);
    const insets = getSafeAreaInsets();
    expect(insets).toEqual({
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px',
    });
  });
});
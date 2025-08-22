# Security & Best Practices

This guide covers security features, best practices, compliance requirements, and testing strategies for the SmartSave Personal Finance Platform.

## 🔒 Security Architecture

### Authentication & Authorization

#### JWT Token Security

```typescript
// lib/auth/jwt.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class JWTSecurity {
  private readonly secret: string;
  private readonly algorithm: string = 'HS256';
  private readonly accessTokenExpiry: string = '15m';
  private readonly refreshTokenExpiry: string = '7d';

  constructor() {
    this.secret = process.env.JWT_SECRET!;
    
    if (!this.secret || this.secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
  }

  generateAccessToken(payload: any): string {
    const tokenId = crypto.randomUUID();
    
    return jwt.sign(payload, this.secret, {
      algorithm: this.algorithm,
      expiresIn: this.accessTokenExpiry,
      issuer: 'smartsave',
      audience: 'smartsave-users',
      jwtid: tokenId,
      subject: payload.userId
    });
  }

  generateRefreshToken(payload: any): string {
    const tokenId = crypto.randomUUID();
    
    return jwt.sign(payload, this.secret, {
      algorithm: this.algorithm,
      expiresIn: this.refreshTokenExpiry,
      issuer: 'smartsave',
      audience: 'smartsave-users',
      jwtid: tokenId,
      subject: payload.userId
    });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.secret, {
        algorithms: [this.algorithm],
        issuer: 'smartsave',
        audience: 'smartsave-users'
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  decodeToken(token: string): any {
    return jwt.decode(token, { complete: true });
  }
}
```

#### Password Security

```typescript
// lib/auth/password.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class PasswordSecurity {
  private readonly saltRounds: number = 12;
  private readonly minLength: number = 8;
  private readonly maxLength: number = 128;

  async hashPassword(password: string): Promise<string> {
    this.validatePassword(password);
    
    const salt = await bcrypt.genSalt(this.saltRounds);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private validatePassword(password: string): void {
    if (password.length < this.minLength) {
      throw new Error(`Password must be at least ${this.minLength} characters long`);
    }
    
    if (password.length > this.maxLength) {
      throw new Error(`Password must be no more than ${this.maxLength} characters long`);
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^123456$/,
      /^password$/i,
      /^qwerty$/i,
      /^admin$/i,
      /^letmein$/i
    ];

    if (weakPatterns.some(pattern => pattern.test(password))) {
      throw new Error('Password is too weak');
    }

    // Require complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
    }
  }

  generateSecurePassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill remaining length with random characters
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 4; i < this.minLength; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}
```

#### Role-Based Access Control

```typescript
// lib/auth/rbac.ts
export enum UserRole {
  USER = 'user',
  PREMIUM_USER = 'premium_user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  // User permissions
  VIEW_OWN_PROFILE = 'view_own_profile',
  EDIT_OWN_PROFILE = 'edit_own_profile',
  CHANGE_OWN_PASSWORD = 'change_own_password',
  
  // Budget permissions
  VIEW_OWN_BUDGETS = 'view_own_budgets',
  CREATE_OWN_BUDGETS = 'create_own_budgets',
  EDIT_OWN_BUDGETS = 'edit_own_budgets',
  DELETE_OWN_BUDGETS = 'delete_own_budgets',
  
  // Transaction permissions
  VIEW_OWN_TRANSACTIONS = 'view_own_transactions',
  CREATE_OWN_TRANSACTIONS = 'create_own_transactions',
  EDIT_OWN_TRANSACTIONS = 'edit_own_transactions',
  DELETE_OWN_TRANSACTIONS = 'delete_own_transactions',
  
  // Goal permissions
  VIEW_OWN_GOALS = 'view_own_goals',
  CREATE_OWN_GOALS = 'create_own_goals',
  EDIT_OWN_GOALS = 'edit_own_goals',
  DELETE_OWN_GOALS = 'delete_own_goals',
  
  // Admin permissions
  VIEW_ALL_USERS = 'view_all_users',
  EDIT_USER_ROLES = 'edit_user_roles',
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings'
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_OWN_PROFILE,
    Permission.CHANGE_OWN_PASSWORD,
    Permission.VIEW_OWN_BUDGETS,
    Permission.CREATE_OWN_BUDGETS,
    Permission.EDIT_OWN_BUDGETS,
    Permission.DELETE_OWN_BUDGETS,
    Permission.VIEW_OWN_TRANSACTIONS,
    Permission.CREATE_OWN_TRANSACTIONS,
    Permission.EDIT_OWN_TRANSACTIONS,
    Permission.DELETE_OWN_TRANSACTIONS,
    Permission.VIEW_OWN_GOALS,
    Permission.CREATE_OWN_GOALS,
    Permission.EDIT_OWN_GOALS,
    Permission.DELETE_OWN_GOALS
  ],
  [UserRole.PREMIUM_USER]: [
    ...ROLE_PERMISSIONS[UserRole.USER],
    // Additional premium features
  ],
  [UserRole.ADMIN]: [
    ...ROLE_PERMISSIONS[UserRole.PREMIUM_USER],
    Permission.VIEW_ALL_USERS,
    Permission.EDIT_USER_ROLES,
    Permission.VIEW_SYSTEM_LOGS
  ],
  [UserRole.SUPER_ADMIN]: [
    ...ROLE_PERMISSIONS[UserRole.ADMIN],
    Permission.MANAGE_SYSTEM_SETTINGS
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
    .max(255, 'Email too long')
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, 'Password must contain uppercase, lowercase, number, and special character'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters')
    .transform(name => name.trim()),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters')
    .transform(name => name.trim()),
  dateOfBirth: z.string()
    .datetime('Invalid date format')
    .refine(date => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    }, 'Age must be between 13 and 120 years'),
  phoneNumber: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .optional()
    .transform(phone => phone?.replace(/\s+/g, '')),
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
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Budget name contains invalid characters')
    .transform(name => name.trim()),
  amount: z.number()
    .positive('Amount must be positive')
    .max(999999999.99, 'Amount too large')
    .multipleOf(0.01, 'Amount must have maximum 2 decimal places'),
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
      .max(100, 'Category name too long')
      .transform(name => name.trim()),
    amount: z.number()
      .positive('Category amount must be positive')
      .max(999999999.99, 'Category amount too large')
      .multipleOf(0.01, 'Category amount must have maximum 2 decimal places'),
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

## 🛡️ Security Middleware

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  statusCode: number;
}

export class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove expired entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    const currentCount = await this.redis.zcard(key);

    if (currentCount >= this.config.maxRequests) {
      // Get reset time
      const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldestRequest[0] ? parseInt(oldestRequest[1]) + this.config.windowMs : now + this.config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, Math.ceil(this.config.windowMs / 1000));

    return {
      allowed: true,
      remaining: this.config.maxRequests - currentCount - 1,
      resetTime: now + this.config.windowMs
    };
  }
}

// Rate limit configurations
const rateLimitConfigs = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many authentication attempts', statusCode: 429 },
  api: { windowMs: 60 * 1000, maxRequests: 100, message: 'Too many API requests', statusCode: 429 },
  upload: { windowMs: 60 * 1000, maxRequests: 10, message: 'Too many file uploads', statusCode: 429 }
};

export function withRateLimit(configKey: keyof typeof rateLimitConfigs) {
  return function(handler: Function) {
    return async (request: NextRequest) => {
      const config = rateLimitConfigs[configKey];
      const limiter = new RateLimiter(config);
      
      // Get client identifier (IP address or user ID)
      const identifier = getClientIdentifier(request);
      
      const limitResult = await limiter.checkLimit(identifier);
      
      if (!limitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: config.message,
            retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000)
          },
          { 
            status: config.statusCode,
            headers: {
              'Retry-After': Math.ceil((limitResult.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': limitResult.remaining.toString(),
              'X-RateLimit-Reset': limitResult.resetTime.toString()
            }
          }
        );
      }
      
      // Add rate limit headers to response
      const response = await handler(request);
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', limitResult.resetTime.toString());
      
      return response;
    };
  };
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from token if authenticated
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.decode(token);
      if (decoded && typeof decoded === 'object' && decoded.userId) {
        return `user:${decoded.userId}`;
      }
    } catch (error) {
      // Ignore token decode errors
    }
  }
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `ip:${ip}`;
}
```

### CORS Configuration

```typescript
// middleware/cors.ts
import { NextRequest, NextResponse } from 'next/server';

interface CORSOptions {
  origin: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function withCORS(options: CORSOptions) {
  return function(handler: Function) {
    return async (request: NextRequest) => {
      const origin = request.headers.get('origin');
      
      // Handle preflight request
      if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 });
        
        // Set CORS headers
        if (options.origin === true || (Array.isArray(options.origin) && options.origin.includes(origin!))) {
          response.headers.set('Access-Control-Allow-Origin', origin!);
        } else if (typeof options.origin === 'string') {
          response.headers.set('Access-Control-Allow-Origin', options.origin);
        }
        
        if (options.methods) {
          response.headers.set('Access-Control-Allow-Methods', options.methods.join(', '));
        }
        
        if (options.allowedHeaders) {
          response.headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
        }
        
        if (options.credentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }
        
        if (options.maxAge) {
          response.headers.set('Access-Control-Max-Age', options.maxAge.toString());
        }
        
        return response;
      }
      
      // Handle actual request
      const response = await handler(request);
      
      // Set CORS headers for actual response
      if (options.origin === true || (Array.isArray(options.origin) && options.origin.includes(origin!))) {
        response.headers.set('Access-Control-Allow-Origin', origin!);
      } else if (typeof options.origin === 'string') {
        response.headers.set('Access-Control-Allow-Origin', options.origin);
      }
      
      if (options.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return response;
    };
  };
}

// Default CORS configuration
export const defaultCORS = withCORS({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
});
```

### Security Headers

```typescript
// middleware/security-headers.ts
import { NextRequest, NextResponse } from 'next/server';

export function withSecurityHeaders(handler: Function) {
  return async (request: NextRequest) => {
    const response = await handler(request);
    
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', csp);
    
    // HSTS (HTTP Strict Transport Security)
    if (request.nextUrl.protocol === 'https:') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    return response;
  };
}
```

## 🔐 Compliance & Standards

### GDPR Compliance

```typescript
// lib/compliance/gdpr.ts
export interface GDPRConsent {
  id: string;
  userId: string;
  consentType: 'marketing' | 'analytics' | 'necessary' | 'preferences';
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  version: string;
}

export class GDPRCompliance {
  async recordConsent(userId: string, consent: Omit<GDPRConsent, 'id' | 'userId' | 'timestamp'>): Promise<void> {
    const consentRecord: GDPRConsent = {
      id: crypto.randomUUID(),
      userId,
      timestamp: new Date(),
      ...consent
    };
    
    // Store consent record
    await this.storeConsent(consentRecord);
    
    // Update user preferences
    await this.updateUserPreferences(userId, consent);
  }
  
  async getUserConsent(userId: string): Promise<GDPRConsent[]> {
    return this.getConsentRecords(userId);
  }
  
  async withdrawConsent(userId: string, consentType: string): Promise<void> {
    await this.updateConsentStatus(userId, consentType, false);
    
    // Handle data deletion if necessary
    if (consentType === 'analytics') {
      await this.anonymizeAnalyticsData(userId);
    }
  }
  
  async exportUserData(userId: string): Promise<any> {
    const userData = await this.collectUserData(userId);
    
    // Remove sensitive information
    const sanitizedData = this.sanitizeUserData(userData);
    
    return sanitizedData;
  }
  
  async deleteUserData(userId: string): Promise<void> {
    // Anonymize or delete user data
    await this.anonymizeUserData(userId);
    
    // Log deletion for audit purposes
    await this.logDataDeletion(userId);
  }
  
  private async storeConsent(consent: GDPRConsent): Promise<void> {
    // Implementation for storing consent records
  }
  
  private async updateUserPreferences(userId: string, consent: Omit<GDPRConsent, 'id' | 'userId' | 'timestamp'>): Promise<void> {
    // Implementation for updating user preferences
  }
  
  private async getConsentRecords(userId: string): Promise<GDPRConsent[]> {
    // Implementation for retrieving consent records
    return [];
  }
  
  private async updateConsentStatus(userId: string, consentType: string, granted: boolean): Promise<void> {
    // Implementation for updating consent status
  }
  
  private async anonymizeAnalyticsData(userId: string): Promise<void> {
    // Implementation for anonymizing analytics data
  }
  
  private async collectUserData(userId: string): Promise<any> {
    // Implementation for collecting user data
    return {};
  }
  
  private sanitizeUserData(data: any): any {
    // Implementation for sanitizing user data
    return data;
  }
  
  private async anonymizeUserData(userId: string): Promise<void> {
    // Implementation for anonymizing user data
  }
  
  private async logDataDeletion(userId: string): Promise<void> {
    // Implementation for logging data deletion
  }
}
```

### PCI DSS Compliance

```typescript
// lib/compliance/pci.ts
export interface PCICardData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

export class PCICompliance {
  private readonly encryptionKey: string;
  
  constructor() {
    this.encryptionKey = process.env.PCI_ENCRYPTION_KEY!;
  }
  
  async encryptCardData(cardData: PCICardData): Promise<string> {
    // Implement strong encryption for card data
    const encryptedData = await this.encrypt(JSON.stringify(cardData));
    return encryptedData;
  }
  
  async decryptCardData(encryptedData: string): Promise<PCICardData> {
    // Implement decryption for card data
    const decryptedData = await this.decrypt(encryptedData);
    return JSON.parse(decryptedData);
  }
  
  maskCardNumber(cardNumber: string): string {
    // Mask card number for display (show only last 4 digits)
    if (cardNumber.length < 4) return cardNumber;
    return '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4);
  }
  
  validateCardData(cardData: PCICardData): boolean {
    // Basic card validation
    const cardNumberRegex = /^\d{13,19}$/;
    const expiryMonthRegex = /^(0[1-9]|1[0-2])$/;
    const expiryYearRegex = /^\d{4}$/;
    const cvvRegex = /^\d{3,4}$/;
    
    return (
      cardNumberRegex.test(cardData.cardNumber) &&
      expiryMonthRegex.test(cardData.expiryMonth) &&
      expiryYearRegex.test(cardData.expiryYear) &&
      cvvRegex.test(cardData.cvv) &&
      cardData.cardholderName.trim().length > 0
    );
  }
  
  private async encrypt(data: string): Promise<string> {
    // Implementation for encryption
    return data;
  }
  
  private async decrypt(encryptedData: string): Promise<string> {
    // Implementation for decryption
    return encryptedData;
  }
}
```

## 🧪 Security Testing

### Penetration Testing

```typescript
// tests/security/penetration.test.ts
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/auth/login/route';

describe('Security Tests', () => {
  describe('SQL Injection Tests', () => {
    it('should prevent SQL injection in email field', async () => {
      const maliciousPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'--"
      ];
      
      for (const payload of maliciousPayloads) {
        const { req } = createMocks({
          method: 'POST',
          body: {
            email: payload,
            password: 'testpass123'
          }
        });
        
        const response = await POST(req);
        
        // Should not return 500 (internal server error)
        expect(response.status).not.toBe(500);
        
        // Should return validation error or 400
        expect([400, 401]).toContain(response.status);
      }
    });
  });
  
  describe('XSS Tests', () => {
    it('should prevent XSS in user input fields', async () => {
      const maliciousPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '"><script>alert("xss")</script>'
      ];
      
      for (const payload of maliciousPayloads) {
        const { req } = createMocks({
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'testpass123',
            firstName: payload
          }
        });
        
        const response = await POST(req);
        
        // Should not return 500 (internal server error)
        expect(response.status).not.toBe(500);
      }
    });
  });
  
  describe('Authentication Tests', () => {
    it('should prevent brute force attacks', async () => {
      const attempts = 10;
      
      for (let i = 0; i < attempts; i++) {
        const { req } = createMocks({
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'wrongpassword'
          }
        });
        
        const response = await POST(req);
        
        if (i < 5) {
          // First 5 attempts should return 401
          expect(response.status).toBe(401);
        } else {
          // After 5 attempts, should be rate limited
          expect([401, 429]).toContain(response.status);
        }
      }
    });
  });
  
  describe('Authorization Tests', () => {
    it('should prevent unauthorized access to protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/budgets',
        '/api/transactions',
        '/api/goals',
        '/api/user/profile'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const { req } = createMocks({
          method: 'GET',
          url: endpoint
        });
        
        // No authorization header
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {}
        });
        
        expect(response.status).toBe(401);
      }
    });
  });
});
```

### Security Headers Testing

```typescript
// tests/security/headers.test.ts
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/health/route';

describe('Security Headers Tests', () => {
  it('should include required security headers', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/health'
    });
    
    const response = await GET(req);
    
    // Check security headers
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    
    // Check Content Security Policy
    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
  });
  
  it('should include HSTS header for HTTPS', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: 'https://example.com/api/health'
    });
    
    const response = await GET(req);
    
    // HSTS should be present for HTTPS
    const hsts = response.headers.get('Strict-Transport-Security');
    expect(hsts).toBeDefined();
    expect(hsts).toContain('max-age=31536000');
  });
});
```

## 📊 Security Monitoring

### Security Event Logging

```typescript
// lib/security/monitoring.ts
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  eventType: 'authentication_failure' | 'authorization_failure' | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_access' | 'data_modification';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  source: string;
}

export class SecurityMonitor {
  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    };
    
    // Store security event
    await this.storeSecurityEvent(securityEvent);
    
    // Check if alert should be triggered
    await this.checkAlertConditions(securityEvent);
    
    // Send to external security monitoring if configured
    await this.sendToExternalMonitoring(securityEvent);
  }
  
  async getSecurityEvents(
    filters: {
      eventType?: string;
      severity?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): Promise<SecurityEvent[]> {
    return this.querySecurityEvents(filters, limit);
  }
  
  async generateSecurityReport(startDate: Date, endDate: Date): Promise<any> {
    const events = await this.getSecurityEvents({ startDate, endDate }, 10000);
    
    const report = {
      period: { startDate, endDate },
      totalEvents: events.length,
      eventsByType: this.groupEventsByType(events),
      eventsBySeverity: this.groupEventsBySeverity(events),
      topIPAddresses: this.getTopIPAddresses(events),
      topUserAgents: this.getTopUserAgents(events),
      trends: this.analyzeTrends(events)
    };
    
    return report;
  }
  
  private async storeSecurityEvent(event: SecurityEvent): Promise<void> {
    // Implementation for storing security events
  }
  
  private async checkAlertConditions(event: SecurityEvent): Promise<void> {
    // Implementation for checking alert conditions
  }
  
  private async sendToExternalMonitoring(event: SecurityEvent): Promise<void> {
    // Implementation for sending to external monitoring
  }
  
  private async querySecurityEvents(filters: any, limit: number): Promise<SecurityEvent[]> {
    // Implementation for querying security events
    return [];
  }
  
  private groupEventsByType(events: SecurityEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private groupEventsBySeverity(events: SecurityEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private getTopIPAddresses(events: SecurityEvent[]): Array<{ ip: string; count: number }> {
    const ipCounts = events.reduce((acc, event) => {
      acc[event.ipAddress] = (acc[event.ipAddress] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  private getTopUserAgents(events: SecurityEvent[]): Array<{ userAgent: string; count: number }> {
    const userAgentCounts = events.reduce((acc, event) => {
      acc[event.userAgent] = (acc[event.userAgent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(userAgentCounts)
      .map(([userAgent, count]) => ({ userAgent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  private analyzeTrends(events: SecurityEvent[]): any {
    // Implementation for analyzing security event trends
    return {};
  }
}
```

## 📚 Best Practices Summary

### Authentication & Authorization
- **Strong Passwords**: Enforce complex password requirements
- **Multi-Factor Authentication**: Implement MFA for sensitive operations
- **Session Management**: Use short-lived JWT tokens with refresh tokens
- **Role-Based Access**: Implement granular permission system
- **Principle of Least Privilege**: Grant minimum required permissions

### Input Validation & Sanitization
- **Validate All Inputs**: Use Zod schemas for type-safe validation
- **Sanitize Data**: Remove potentially malicious content
- **Parameterized Queries**: Prevent SQL injection
- **Content Security Policy**: Mitigate XSS attacks
- **Input Length Limits**: Prevent buffer overflow attacks

### Data Protection
- **Encryption at Rest**: Use AES-256 for sensitive data
- **Encryption in Transit**: Enforce TLS 1.3
- **Data Minimization**: Collect only necessary data
- **Data Retention**: Implement automatic data deletion
- **Data Anonymization**: Anonymize data when possible

### Monitoring & Logging
- **Security Event Logging**: Log all security-related events
- **Real-time Monitoring**: Monitor for suspicious activities
- **Alert System**: Implement automated security alerts
- **Audit Trails**: Maintain comprehensive audit logs
- **Incident Response**: Have clear incident response procedures

### Compliance
- **GDPR Compliance**: Implement data protection requirements
- **PCI DSS**: Follow payment card security standards
- **Regular Audits**: Conduct security assessments
- **Vendor Security**: Assess third-party security
- **Documentation**: Maintain security documentation

---

**Next Steps**: Explore [Implementation Guides](implementation-guides.md) for specific security implementations, or [Backend Development](backend-development.md) for API security details.

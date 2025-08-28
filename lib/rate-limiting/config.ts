// Rate limiting configuration types
export interface RateLimitConfig {
  enabled: boolean;
  defaultLimits: {
    windowMs: number;
    maxRequests: number;
    message: string;
    statusCode: number;
  };
  endpoints: {
    [endpoint: string]: EndpointConfig;
  };
  trustedIPs: string[];
  adaptiveLimiting: {
    enabled: boolean;
    learningPeriod: number;
    adjustmentFactor: number;
    minLimit: number;
    maxLimit: number;
  };
  headers: {
    enabled: boolean;
    remaining: string;
    reset: string;
    limit: string;
    retryAfter: string;
  };
  storage: {
    type: 'memory' | 'redis';
    redis?: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
  };
  bypass: {
    enabled: boolean;
    patterns: string[];
    headers: string[];
  };
}

// Endpoint-specific configuration
export interface EndpointConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
  adaptive?: boolean;
  bypass?: boolean;
  userSpecific?: boolean;
  burst?: {
    enabled: boolean;
    maxBurst: number;
    burstWindow: number;
  };
}

// Default configuration
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
  defaultLimits: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests, please try again later.',
    statusCode: 429,
  },
  endpoints: {
    // Authentication endpoints - stricter limits
    '/api/auth/login': {
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
      message: 'Too many login attempts, please try again later.',
      statusCode: 429,
      adaptive: true,
      userSpecific: true,
    },
    '/api/auth/forgot-password': {
      windowMs: 3600000, // 1 hour
      maxRequests: 3,
      message: 'Too many password reset requests, please try again later.',
      statusCode: 429,
      adaptive: true,
      userSpecific: true,
    },
    '/api/auth/reset-password': {
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
      message: 'Too many password reset attempts, please try again later.',
      statusCode: 429,
      adaptive: true,
      userSpecific: true,
    },
    '/api/auth/refresh': {
      windowMs: 900000, // 15 minutes
      maxRequests: 10,
      message: 'Too many token refresh attempts, please try again later.',
      statusCode: 429,
      adaptive: true,
      userSpecific: true,
    },
    // API endpoints - standard limits
    '/api/budget': {
      windowMs: 900000, // 15 minutes
      maxRequests: 50,
      adaptive: true,
      userSpecific: true,
    },
    '/api/transactions': {
      windowMs: 900000, // 15 minutes
      maxRequests: 100,
      adaptive: true,
      userSpecific: true,
    },
    '/api/categories': {
      windowMs: 900000, // 15 minutes
      maxRequests: 30,
      adaptive: true,
      userSpecific: true,
    },
    // Health and monitoring - higher limits
    '/api/health': {
      windowMs: 60000, // 1 minute
      maxRequests: 1000,
      adaptive: false,
      bypass: true,
    },
    '/api/metrics': {
      windowMs: 60000, // 1 minute
      maxRequests: HTTP_INTERNAL_SERVER_ERROR,
      adaptive: false,
      bypass: true,
    },
  },
  trustedIPs: process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
  ],
  adaptiveLimiting: {
    enabled: process.env.ADAPTIVE_RATE_LIMITING === 'true',
    learningPeriod: parseInt(process.env.ADAPTIVE_LEARNING_PERIOD || '86400000'), // 24 hours
    adjustmentFactor: parseFloat(process.env.ADAPTIVE_ADJUSTMENT_FACTOR || '0.1'),
    minLimit: parseInt(process.env.ADAPTIVE_MIN_LIMIT || '10'),
    maxLimit: parseInt(process.env.ADAPTIVE_MAX_LIMIT || '1000'),
  },
  headers: {
    enabled: process.env.RATE_LIMIT_HEADERS !== 'false',
    remaining: 'X-RateLimit-Remaining',
    reset: 'X-RateLimit-Reset',
    limit: 'X-RateLimit-Limit',
    retryAfter: 'Retry-After',
  },
  storage: {
    type: (process.env.RATE_LIMIT_STORAGE || 'redis') as 'memory' | 'redis',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.RATE_LIMIT_REDIS_DB || '1'),
    },
  },
  bypass: {
    enabled: process.env.RATE_LIMIT_BYPASS === 'true',
    patterns: [
      '/health',
      '/metrics',
      '/status',
      '/ping',
    ],
    headers: [
      'X-RateLimit-Bypass',
      'X-API-Key',
    ],
  },
};

// Configuration validation
export function validateRateLimitConfig(config: RateLimitConfig): string[] {
  const errors: string[] = [];

  if (config.defaultLimits.windowMs <= 0) {
    errors.push('defaultLimits.windowMs must be greater than 0');
  }

  if (config.defaultLimits.maxRequests <= 0) {
    errors.push('defaultLimits.maxRequests must be greater than 0');
  }

  if (config.adaptiveLimiting.enabled) {
    if (config.adaptiveLimiting.learningPeriod <= 0) {
      errors.push('learningPeriod must be greater than 0');
    }
    if (config.adaptiveLimiting.adjustmentFactor <= 0 || config.adaptiveLimiting.adjustmentFactor >= 1) {
      errors.push('adjustmentFactor must be between 0 and 1');
    }
    if (config.adaptiveLimiting.minLimit >= config.adaptiveLimiting.maxLimit) {
      errors.push('minLimit must be less than maxLimit');
    }
  }

  if (config.storage.type === 'redis' && !config.storage.redis) {
    errors.push('Redis configuration required when storage type is redis');
  }

  return errors;
}

// Configuration loader
export function loadRateLimitConfig(): RateLimitConfig {
  const config = { ...DEFAULT_RATE_LIMIT_CONFIG };

  // Load from environment variables
  if (process.env.RATE_LIMIT_CONFIG_FILE) {
    try {
      const fs = require('fs');
      const configFile = fs.readFileSync(process.env.RATE_LIMIT_CONFIG_FILE, 'utf-8');
      const fileConfig = JSON.parse(configFile);
      Object.assign(config, fileConfig);
    } catch (error) {
      console.warn('Failed to load rate limit config file:', error);
    }
  }

  // Validate configuration
  const errors = validateRateLimitConfig(config);
  if (errors.length > 0) {
    console.error('Rate limit configuration errors:', errors);
    throw new Error(`Invalid rate limit configuration: ${errors.join(', ')}`);
  }

  return config;
}

// Export configuration
export const rateLimitConfig = loadRateLimitConfig();

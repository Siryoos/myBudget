import { isIP, isIPv4, isIPv6 } from 'net';
import { URL } from 'url';

// Origin types
export type Origin = string;
export type OriginPattern = string; // Supports wildcards and regex patterns

// Origin validation result
export interface OriginValidationResult {
  isValid: boolean;
  isAllowed: boolean;
  reason: string;
  origin: string;
  pattern?: string;
  metadata: {
    type: 'url' | 'ip' | 'wildcard' | 'regex';
    protocol?: string;
    hostname?: string;
    port?: number;
    pathname?: string;
    isLocalhost: boolean;
    isPrivateIP: boolean;
    isReservedIP: boolean;
  };
}

// Origin validation configuration
export interface OriginValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  allowLocalhost: boolean;
  allowPrivateIPs: boolean;
  allowReservedIPs: boolean;
  allowedProtocols: string[];
  blockedPatterns: string[];
  maxOriginLength: number;
  validatePorts: boolean;
  allowedPorts: number[];
  blockedPorts: number[];
}

// Default configuration
const DEFAULT_CONFIG: OriginValidationConfig = {
  enabled: process.env.ORIGIN_VALIDATION_ENABLED !== 'false',
  strictMode: process.env.ORIGIN_VALIDATION_STRICT === 'true',
  allowLocalhost: process.env.ORIGIN_VALIDATION_ALLOW_LOCALHOST !== 'false',
  allowPrivateIPs: process.env.ORIGIN_VALIDATION_ALLOW_PRIVATE_IPS !== 'false',
  allowReservedIPs: process.env.ORIGIN_VALIDATION_ALLOW_RESERVED_IPS !== 'false',
  allowedProtocols: ['http:', 'https:'],
  blockedPatterns: [
    'file:',
    'data:',
    'javascript:',
    'vbscript:',
    'about:',
    'chrome:',
    'moz-extension:',
  ],
  maxOriginLength: parseInt(process.env.ORIGIN_VALIDATION_MAX_LENGTH || '2048'),
  validatePorts: process.env.ORIGIN_VALIDATION_VALIDATE_PORTS !== 'false',
  allowedPorts: [80, 443, 3000, 8080, 8443],
  blockedPorts: [22, 23, 25, 53, 110, 143, 993, 995, 3306, 5432, 6379, 27017],
};

// Origin validator
export class OriginValidator {
  private static instance: OriginValidator;
  private config: OriginValidationConfig;
  private allowedOrigins: Set<string> = new Set();
  private blockedOrigins: Set<string> = new Set();
  private originPatterns: RegExp[] = [];

  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.initializeOrigins();
  }

  static getInstance(): OriginValidator {
    if (!OriginValidator.instance) {
      OriginValidator.instance = new OriginValidator();
    }
    return OriginValidator.instance;
  }

  // Initialize allowed and blocked origins
  private initializeOrigins(): void {
    // Load from environment variables
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
    const blockedOriginsEnv = process.env.BLOCKED_ORIGINS;

    if (allowedOriginsEnv) {
      const origins = allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);
      origins.forEach(origin => this.addAllowedOrigin(origin));
    }

    if (blockedOriginsEnv) {
      const origins = blockedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);
      origins.forEach(origin => this.addBlockedOrigin(origin));
    }

    // Add default localhost origins if allowed
    if (this.config.allowLocalhost) {
      this.addAllowedOrigin('http://localhost:3000');
      this.addAllowedOrigin('http://localhost:8080');
      this.addAllowedOrigin('https://localhost:3000');
      this.addAllowedOrigin('https://localhost:8080');
    }
  }

  // Validate origin format and content
  validateOrigin(origin: string): OriginValidationResult {
    try {
      // Basic validation
      if (!origin || typeof origin !== 'string') {
        return this.createValidationResult(origin, false, false, 'Origin is empty or invalid');
      }

      if (origin.length > this.config.maxOriginLength) {
        return this.createValidationResult(origin, false, false, `Origin exceeds maximum length of ${this.config.maxOriginLength}`);
      }

      // Check if origin is blocked
      if (this.isOriginBlocked(origin)) {
        return this.createValidationResult(origin, false, false, 'Origin is in blocked list');
      }

      // Check if origin is explicitly allowed
      if (this.isOriginAllowed(origin)) {
        return this.createValidationResult(origin, true, true, 'Origin is explicitly allowed');
      }

      // Parse and validate origin structure
      const parsedOrigin = this.parseOrigin(origin);
      if (!parsedOrigin) {
        return this.createValidationResult(origin, false, false, 'Failed to parse origin');
      }

      // Validate origin components
      const validationResult = this.validateOriginComponents(parsedOrigin, origin);
      if (!validationResult.isValid) {
        return validationResult;
      }

      // Check if origin matches allowed patterns
      if (this.matchesAllowedPatterns(origin)) {
        return this.createValidationResult(origin, true, true, 'Origin matches allowed pattern');
      }

      // Default to not allowed in strict mode
      if (this.config.strictMode) {
        return this.createValidationResult(origin, true, false, 'Origin not explicitly allowed in strict mode');
      }

      // In non-strict mode, allow if validation passes
      return this.createValidationResult(origin, true, true, 'Origin validation passed in non-strict mode');

    } catch (error) {
      return this.createValidationResult(origin, false, false, `Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Parse origin string
  private parseOrigin(origin: string): URL | null {
    try {
      // Handle special cases
      if (origin === 'null' || origin === 'undefined') {
        return null;
      }

      // Try to parse as URL
      const url = new URL(origin);

      // Validate protocol
      if (!this.config.allowedProtocols.includes(url.protocol)) {
        throw new Error(`Protocol ${url.protocol} is not allowed`);
      }

      // Check for blocked patterns
      for (const pattern of this.config.blockedPatterns) {
        if (origin.startsWith(pattern)) {
          throw new Error(`Origin pattern ${pattern} is blocked`);
        }
      }

      return url;
    } catch (error) {
      // If URL parsing fails, check if it's an IP address
      if (isIP(origin)) {
        // Create a mock URL for IP addresses
        const mockUrl = new URL(`http://${origin}`);
        return mockUrl;
      }

      return null;
    }
  }

  // Validate origin components
  private validateOriginComponents(url: URL, originalOrigin: string): OriginValidationResult {
    const metadata = this.extractOriginMetadata(url, originalOrigin);

    // Validate hostname
    if (!this.validateHostname(url.hostname, metadata)) {
      return this.createValidationResult(originalOrigin, false, false, 'Hostname validation failed', metadata);
    }

    // Validate port if enabled
    if (this.config.validatePorts && url.port) {
      const port = parseInt(url.port);
      if (this.config.blockedPorts.includes(port)) {
        return this.createValidationResult(originalOrigin, false, false, `Port ${port} is blocked`, metadata);
      }
      if (this.config.allowedPorts.length > 0 && !this.config.allowedPorts.includes(port)) {
        return this.createValidationResult(originalOrigin, false, false, `Port ${port} is not allowed`, metadata);
      }
    }

    // Validate pathname (should be empty for CORS origins)
    if (url.pathname && url.pathname !== '/') {
      return this.createValidationResult(originalOrigin, false, false, 'Origin should not contain pathname', metadata);
    }

    return this.createValidationResult(originalOrigin, true, false, 'Origin components validation passed', metadata);
  }

  // Validate hostname
  private validateHostname(hostname: string, metadata: any): boolean {
    // Check if it's localhost
    if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
      return this.config.allowLocalhost;
    }

    // Check if it's an IP address
    if (isIP(hostname)) {
      if (metadata.isPrivateIP && !this.config.allowPrivateIPs) {
        return false;
      }
      if (metadata.isReservedIP && !this.config.allowReservedIPs) {
        return false;
      }
      return true;
    }

    // Check if it's a valid domain name
    if (this.isValidDomainName(hostname)) {
      return true;
    }

    return false;
  }

  // Check if domain name is valid
  private isValidDomainName(hostname: string): boolean {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(hostname);
  }

  // Extract origin metadata
  private extractOriginMetadata(url: URL, originalOrigin: string): any {
    const hostname = url.hostname;
    const isLocalhost = hostname === 'localhost' || hostname.startsWith('localhost:');
    const isPrivateIP = this.isPrivateIP(hostname);
    const isReservedIP = this.isReservedIP(hostname);

    return {
      type: this.getOriginType(url, originalOrigin),
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port ? parseInt(url.port) : undefined,
      pathname: url.pathname,
      isLocalhost,
      isPrivateIP,
      isReservedIP,
    };
  }

  // Get origin type
  private getOriginType(url: URL, originalOrigin: string): 'url' | 'ip' | 'wildcard' | 'regex' {
    if (isIP(url.hostname)) {
      return 'ip';
    }
    if (originalOrigin.includes('*') || originalOrigin.includes('?')) {
      return 'wildcard';
    }
    if (originalOrigin.startsWith('/') && originalOrigin.endsWith('/')) {
      return 'regex';
    }
    return 'url';
  }

  // Check if IP is private
  private isPrivateIP(hostname: string): boolean {
    if (!isIPv4(hostname)) {return false;}

    const parts = hostname.split('.').map(Number);
    return (
      (parts[0] === 10) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 127) ||
      (parts[0] === 0)
    );
  }

  // Check if IP is reserved
  private isReservedIP(hostname: string): boolean {
    if (!isIPv4(hostname)) {return false;}

    const parts = hostname.split('.').map(Number);
    return (
      (parts[0] === 0) ||
      (parts[0] === 127) ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 224) ||
      (parts[0] === 240)
    );
  }

  // Check if origin is explicitly allowed
  private isOriginAllowed(origin: string): boolean {
    return this.allowedOrigins.has(origin);
  }

  // Check if origin is blocked
  private isOriginBlocked(origin: string): boolean {
    return this.blockedOrigins.has(origin);
  }

  // Check if origin matches allowed patterns
  private matchesAllowedPatterns(origin: string): boolean {
    for (const pattern of this.originPatterns) {
      if (pattern.test(origin)) {
        return true;
      }
    }
    return false;
  }

  // Create validation result
  private createValidationResult(
    origin: string,
    isValid: boolean,
    isAllowed: boolean,
    reason: string,
    metadata?: any,
  ): OriginValidationResult {
    return {
      isValid,
      isAllowed,
      reason,
      origin,
      metadata: metadata || this.extractOriginMetadata(new URL(`http://${origin}`), origin),
    };
  }

  // Add allowed origin
  addAllowedOrigin(origin: string): void {
    this.allowedOrigins.add(origin);

    // If it's a pattern, compile it
    if (origin.includes('*') || origin.includes('?')) {
      const pattern = this.convertWildcardToRegex(origin);
      if (pattern) {
        this.originPatterns.push(pattern);
      }
    }
  }

  // Add blocked origin
  addBlockedOrigin(origin: string): void {
    this.blockedOrigins.add(origin);
  }

  // Remove allowed origin
  removeAllowedOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
  }

  // Remove blocked origin
  removeBlockedOrigin(origin: string): void {
    this.blockedOrigins.delete(origin);
  }

  // Convert wildcard pattern to regex
  private convertWildcardToRegex(pattern: string): RegExp | null {
    try {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

      return new RegExp(`^${regexPattern}$`);
    } catch {
      return null;
    }
  }

  // Validate ALLOWED_ORIGINS environment variable format
  validateAllowedOriginsFormat(allowedOrigins: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    parsedOrigins: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsedOrigins: string[] = [];

    if (!allowedOrigins) {
      return { isValid: true, errors, warnings, parsedOrigins };
    }

    const origins = allowedOrigins.split(',').map(o => o.trim()).filter(Boolean);

    for (const origin of origins) {
      try {
        const result = this.validateOrigin(origin);
        if (result.isValid) {
          parsedOrigins.push(origin);
        } else {
          errors.push(`Invalid origin "${origin}": ${result.reason}`);
        }
      } catch (error) {
        errors.push(`Failed to validate origin "${origin}": ${error}`);
      }
    }

    // Check for common issues
    if (origins.length === 0) {
      warnings.push('ALLOWED_ORIGINS is empty');
    }

    if (origins.some(o => o.includes(' '))) {
      warnings.push('Some origins contain spaces - ensure proper comma separation');
    }

    if (origins.some(o => o.startsWith('http://') && !o.includes('localhost'))) {
      warnings.push('HTTP origins detected - consider using HTTPS for production');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      parsedOrigins,
    };
  }

  // Get validation statistics
  getValidationStats(): {
    totalAllowedOrigins: number;
    totalBlockedOrigins: number;
    totalPatterns: number;
    config: OriginValidationConfig;
  } {
    return {
      totalAllowedOrigins: this.allowedOrigins.size,
      totalBlockedOrigins: this.blockedOrigins.size,
      totalPatterns: this.originPatterns.length,
      config: { ...this.config },
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<OriginValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get configuration
  getConfig(): OriginValidationConfig {
    return { ...this.config };
  }

  // Clear all origins
  clearOrigins(): void {
    this.allowedOrigins.clear();
    this.blockedOrigins.clear();
    this.originPatterns = [];
  }
}

// Singleton instance
export const originValidator = OriginValidator.getInstance();

// Convenience functions
export const validateOrigin = (origin: string): OriginValidationResult => originValidator.validateOrigin(origin);

export const validateAllowedOriginsFormat = (allowedOrigins: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsedOrigins: string[];
} => originValidator.validateAllowedOriginsFormat(allowedOrigins);

export const addAllowedOrigin = (origin: string): void => {
  originValidator.addAllowedOrigin(origin);
};

export const addBlockedOrigin = (origin: string): void => {
  originValidator.addBlockedOrigin(origin);
};

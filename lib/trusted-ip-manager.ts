import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';
import * as net from 'net';

export interface TrustedIPConfig {
  ipAddress: string;
  description: string;
  expiresAt?: Date;
  allowedEndpoints?: string[];
  maxRequestsPerMinute?: number;
  addedBy: string;
  addedAt: Date;
}

export interface IPRange {
  start: string;
  end: string;
  cidr?: string;
}

export class TrustedIPManager {
  private redis: Redis;
  private staticTrustedIPs: Set<string>;
  private trustedRanges: IPRange[];
  
  constructor(redis: Redis) {
    this.redis = redis;
    this.staticTrustedIPs = new Set();
    this.trustedRanges = [];
    
    // Load static trusted IPs from environment
    this.loadStaticTrustedIPs();
  }
  
  /**
   * Load static trusted IPs from environment variables
   */
  private loadStaticTrustedIPs(): void {
    const trustedIPs = process.env.TRUSTED_IPS?.split(',').map(ip => ip.trim()) || [];
    const trustedRanges = process.env.TRUSTED_IP_RANGES?.split(',').map(range => range.trim()) || [];
    
    // Add individual IPs
    trustedIPs.forEach(ip => {
      if (this.isValidIP(ip)) {
        this.staticTrustedIPs.add(ip);
        logger.info('Added static trusted IP', { ip });
      }
    });
    
    // Add IP ranges
    trustedRanges.forEach(range => {
      const ipRange = this.parseCIDR(range);
      if (ipRange) {
        this.trustedRanges.push(ipRange);
        logger.info('Added trusted IP range', { range });
      }
    });
    
    // Always trust localhost
    this.staticTrustedIPs.add('127.0.0.1');
    this.staticTrustedIPs.add('::1');
  }
  
  /**
   * Check if an IP is trusted
   */
  async isTrusted(ip: string): Promise<{
    trusted: boolean;
    config?: TrustedIPConfig;
    reason?: string;
  }> {
    // Normalize IP
    const normalizedIP = this.normalizeIP(ip);
    
    // Check static trusted IPs
    if (this.staticTrustedIPs.has(normalizedIP)) {
      return {
        trusted: true,
        reason: 'Static trusted IP'
      };
    }
    
    // Check IP ranges
    if (this.isInTrustedRange(normalizedIP)) {
      return {
        trusted: true,
        reason: 'IP in trusted range'
      };
    }
    
    // Check dynamic trusted IPs in Redis
    const config = await this.getTrustedIPConfig(normalizedIP);
    if (config) {
      // Check if expired
      if (config.expiresAt && new Date(config.expiresAt) < new Date()) {
        await this.removeTrustedIP(normalizedIP);
        return {
          trusted: false,
          reason: 'Trusted IP expired'
        };
      }
      
      return {
        trusted: true,
        config,
        reason: 'Dynamic trusted IP'
      };
    }
    
    return {
      trusted: false,
      reason: 'IP not in trusted list'
    };
  }
  
  /**
   * Add a trusted IP
   */
  async addTrustedIP(config: TrustedIPConfig): Promise<void> {
    const normalizedIP = this.normalizeIP(config.ipAddress);
    
    if (!this.isValidIP(normalizedIP)) {
      throw new Error(`Invalid IP address: ${config.ipAddress}`);
    }
    
    const key = `trusted_ip:${normalizedIP}`;
    const data = {
      ...config,
      ipAddress: normalizedIP,
      addedAt: config.addedAt.toISOString(),
      expiresAt: config.expiresAt?.toISOString() || ''
    };
    
    await this.redis.hmset(key, data as any);
    
    // Set expiry if specified
    if (config.expiresAt) {
      const ttl = Math.floor((config.expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await this.redis.expire(key, ttl);
      }
    }
    
    logger.info('Added trusted IP', { 
      ip: normalizedIP, 
      expiresAt: config.expiresAt,
      addedBy: config.addedBy 
    });
  }
  
  /**
   * Remove a trusted IP
   */
  async removeTrustedIP(ip: string): Promise<void> {
    const normalizedIP = this.normalizeIP(ip);
    const key = `trusted_ip:${normalizedIP}`;
    
    await this.redis.del(key);
    logger.info('Removed trusted IP', { ip: normalizedIP });
  }
  
  /**
   * Get trusted IP configuration
   */
  private async getTrustedIPConfig(ip: string): Promise<TrustedIPConfig | null> {
    const key = `trusted_ip:${ip}`;
    const data = await this.redis.hgetall(key);
    
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    
    return {
      ipAddress: data.ipAddress,
      description: data.description,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      allowedEndpoints: data.allowedEndpoints ? JSON.parse(data.allowedEndpoints) : undefined,
      maxRequestsPerMinute: data.maxRequestsPerMinute ? parseInt(data.maxRequestsPerMinute) : undefined,
      addedBy: data.addedBy,
      addedAt: new Date(data.addedAt)
    };
  }
  
  /**
   * List all trusted IPs
   */
  async listTrustedIPs(): Promise<{
    static: string[];
    ranges: IPRange[];
    dynamic: TrustedIPConfig[];
  }> {
    // Get dynamic IPs from Redis
    const keys = await this.redis.keys('trusted_ip:*');
    const dynamic: TrustedIPConfig[] = [];
    
    for (const key of keys) {
      const ip = key.replace('trusted_ip:', '');
      const config = await this.getTrustedIPConfig(ip);
      if (config) {
        dynamic.push(config);
      }
    }
    
    return {
      static: Array.from(this.staticTrustedIPs),
      ranges: this.trustedRanges,
      dynamic
    };
  }
  
  /**
   * Check if IP is in a trusted range
   */
  private isInTrustedRange(ip: string): boolean {
    for (const range of this.trustedRanges) {
      if (this.isIPInRange(ip, range)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check if IP is in a specific range
   */
  private isIPInRange(ip: string, range: IPRange): boolean {
    try {
      const ipNum = this.ipToNumber(ip);
      const startNum = this.ipToNumber(range.start);
      const endNum = this.ipToNumber(range.end);
      
      return ipNum >= startNum && ipNum <= endNum;
    } catch {
      return false;
    }
  }
  
  /**
   * Convert IP to number for comparison
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      throw new Error('Invalid IPv4 address');
    }
    
    return parts.reduce((acc, part, i) => {
      const num = parseInt(part);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error('Invalid IPv4 address');
      }
      return acc + (num << ((3 - i) * 8));
    }, 0);
  }
  
  /**
   * Parse CIDR notation
   */
  private parseCIDR(cidr: string): IPRange | null {
    const match = cidr.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    if (!match) {
      return null;
    }
    
    const [, ip, bits] = match;
    const mask = parseInt(bits);
    
    if (mask < 0 || mask > 32) {
      return null;
    }
    
    try {
      const ipNum = this.ipToNumber(ip);
      const hostBits = 32 - mask;
      const netMask = (-1 << hostBits) >>> 0;
      const startNum = (ipNum & netMask) >>> 0;
      const endNum = (startNum | (~netMask >>> 0)) >>> 0;
      
      return {
        start: this.numberToIP(startNum),
        end: this.numberToIP(endNum),
        cidr
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Convert number to IP
   */
  private numberToIP(num: number): string {
    return [
      (num >>> 24) & 0xFF,
      (num >>> 16) & 0xFF,
      (num >>> 8) & 0xFF,
      num & 0xFF
    ].join('.');
  }
  
  /**
   * Validate IP address
   */
  private isValidIP(ip: string): boolean {
    // IPv4
    if (net.isIPv4(ip)) {
      return true;
    }
    
    // IPv6
    if (net.isIPv6(ip)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Normalize IP address
   */
  private normalizeIP(ip: string): string {
    // Remove IPv6 prefix for IPv4 addresses
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    
    // Handle X-Forwarded-For format
    if (ip.includes(',')) {
      return ip.split(',')[0].trim();
    }
    
    return ip.trim();
  }
  
  /**
   * Get client IP from request
   */
  static getClientIP(request: any): string {
    // Check headers in order of preference
    const headers = [
      'x-real-ip',
      'x-forwarded-for',
      'x-client-ip',
      'x-cluster-client-ip',
      'cf-connecting-ip', // Cloudflare
      'fastly-client-ip', // Fastly
      'true-client-ip',   // Akamai
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ];
    
    for (const header of headers) {
      const value = request.headers[header];
      if (value) {
        // Handle comma-separated list
        const ip = value.split(',')[0].trim();
        if (net.isIP(ip)) {
          return ip;
        }
      }
    }
    
    // Fall back to connection remote address
    return request.connection?.remoteAddress || 
           request.socket?.remoteAddress || 
           request.ip ||
           '';
  }
  
  /**
   * Check rate limit for trusted IP
   */
  async checkTrustedIPRateLimit(
    ip: string,
    endpoint: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const { trusted, config } = await this.isTrusted(ip);
    
    if (!trusted) {
      return { allowed: false, reason: 'IP not trusted' };
    }
    
    // If no specific config, allow all
    if (!config) {
      return { allowed: true };
    }
    
    // Check endpoint restrictions
    if (config.allowedEndpoints && config.allowedEndpoints.length > 0) {
      const allowed = config.allowedEndpoints.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(endpoint);
        }
        return pattern === endpoint;
      });
      
      if (!allowed) {
        return { allowed: false, reason: 'Endpoint not allowed for this IP' };
      }
    }
    
    // Check custom rate limit
    if (config.maxRequestsPerMinute) {
      const key = `trusted_ip_rate:${ip}:${Math.floor(Date.now() / 60000)}`;
      const count = await this.redis.incr(key);
      await this.redis.expire(key, 60);
      
      if (count > config.maxRequestsPerMinute) {
        return { allowed: false, reason: 'Trusted IP rate limit exceeded' };
      }
    }
    
    return { allowed: true };
  }
}
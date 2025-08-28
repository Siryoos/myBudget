import { isIP, isIPv4, isIPv6 } from 'net';

import { rateLimitConfig } from './config';

// IP address types
export type IPAddress = string;
export type IPRange = string; // CIDR notation
export type TrustedIP = IPAddress ;

// Trusted IP bypass result
export interface TrustedIPBypassResult {
  isTrusted: boolean;
  reason: string;
  bypassLevel: 'full' | 'partial' | 'none';
  headers: Record<string, string>;
}

// Constants
const IPV4_MAX_PREFIX = 32;
const IPV6_MAX_PREFIX = 128;
const IPV4_MASK_BASE = 0xFFFFFFFF;
const OCTET_BITS = 8;
const IPV4_PRIVATE_RANGES = {
  CLASS_A: { network: 10, mask: [10] },
  CLASS_B: { network: 172, min: 16, max: 31 },
  CLASS_C: { network: 192, secondary: 168 },
  LOOPBACK: { network: 127 },
  ZERO: { network: 0 },
};

// Trusted IP bypass manager
export class TrustedIPBypassManager {
  private static instance: TrustedIPBypassManager;
  private trustedIPs: TrustedIP[] = [];
  private ipRanges: IPRange[] = [];
  private individualIPs: Set<IPAddress> = new Set();

  private constructor() {
    this.initializeTrustedIPs();
  }

  static getInstance(): TrustedIPBypassManager {
    if (!TrustedIPBypassManager.instance) {
      TrustedIPBypassManager.instance = new TrustedIPBypassManager();
    }
    return TrustedIPBypassManager.instance;
  }

  // Initialize trusted IPs from configuration
  private initializeTrustedIPs(): void {
    this.trustedIPs = [...rateLimitConfig.trustedIPs];

    // Separate individual IPs from IP ranges
    for (const ip of this.trustedIPs) {
      if (this.isIPRange(ip)) {
        this.ipRanges.push(ip);
      } else {
        this.individualIPs.add(ip);
      }
    }
  }

  // Check if IP is trusted and should bypass rate limiting
  checkTrustedIP(ip: string, endpoint?: string): TrustedIPBypassResult {
    try {
      // Validate IP format
      if (!isIP(ip)) {
        return this.createBypassResult(false, 'Invalid IP address format', 'none');
      }

      // Check individual IPs
      const individualResult = this.checkIndividualIP(ip);
      if (individualResult) {
        return individualResult;
      }

      // Check IP ranges
      const rangeResult = this.checkIPRanges(ip);
      if (rangeResult) {
        return rangeResult;
      }

      // Check partial bypass
      const partialResult = this.checkPartialBypass(ip, endpoint);
      if (partialResult) {
        return partialResult;
      }

      return this.createBypassResult(false, 'IP not in trusted list', 'none');

    } catch (error) {
      return this.createBypassResult(false, 'Error checking trusted IP', 'none');
    }
  }

  private checkIndividualIP(ip: string): TrustedIPBypassResult | null {
    if (this.individualIPs.has(ip)) {
      return this.createBypassResult(true, 'IP is in trusted IP list', 'full', ip);
    }
    return null;
  }

  private checkIPRanges(ip: string): TrustedIPBypassResult | null {
    for (const range of this.ipRanges) {
      if (this.isIPInRange(ip, range)) {
        return this.createBypassResult(true, `IP is in trusted range ${range}`, 'full', ip);
      }
    }
    return null;
  }

  private checkPartialBypass(ip: string, endpoint?: string): TrustedIPBypassResult | null {
    if (endpoint && this.shouldPartialBypass(ip, endpoint)) {
      return this.createBypassResult(true, 'Partial bypass for endpoint', 'partial', ip);
    }

    if (this.shouldBypassByHeaders(ip)) {
      return this.createBypassResult(true, 'Bypass by headers', 'partial', ip);
    }

    return null;
  }

  private createBypassResult(
    isTrusted: boolean,
    reason: string,
    bypassLevel: 'full' | 'partial' | 'none',
    ip?: string,
  ): TrustedIPBypassResult {
    return {
      isTrusted,
      reason,
      bypassLevel,
      headers: ip && isTrusted && bypassLevel !== 'none' ? this.generateTrustedHeaders(ip, bypassLevel) : {},
    };
  }

  // Check if string represents an IP range (CIDR notation)
  private isIPRange(ip: string): boolean {
    return ip.includes('/');
  }

  // Check if IP is within a CIDR range
  private isIPInRange(ip: string, range: string): boolean {
    try {
      const [rangeIP, prefixLength] = range.split('/');
      const prefix = parseInt(prefixLength, 10);

      if (isNaN(prefix) || prefix < 0 ||
          prefix > (isIPv6(rangeIP) ? IPV6_MAX_PREFIX : IPV4_MAX_PREFIX)) {
        return false;
      }

      if (isIPv4(ip) && isIPv4(rangeIP)) {
        return this.isIPv4InRange(ip, rangeIP, prefix);
      } else if (isIPv6(ip) && isIPv6(rangeIP)) {
        return this.isIPv6InRange(ip, rangeIP, prefix);
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // Check if IPv4 is within range
  private isIPv4InRange(ip: string, rangeIP: string, prefix: number): boolean {
    const ipNum = this.ipv4ToNumber(ip);
    const rangeNum = this.ipv4ToNumber(rangeIP);
    const mask = (IPV4_MASK_BASE << (IPV4_MAX_PREFIX - prefix)) >>> 0;

    return (ipNum & mask) === (rangeNum & mask);
  }

  // Check if IPv6 is within range
  private isIPv6InRange(ip: string, rangeIP: string, prefix: number): boolean {
    // Simplified IPv6 range checking
    // In production, use a proper IPv6 library
    const prefixChars = Math.floor(prefix / 4);
    return ip.startsWith(rangeIP.split('/')[0].substring(0, prefixChars));
  }

  // Convert IPv4 to number
  private ipv4ToNumber(ip: string): number {
    return ip.split('.')
      .reduce((acc, octet) => (acc << OCTET_BITS) + parseInt(octet, 10), 0) >>> 0;
  }

  // Check if endpoint should have partial bypass
  private shouldPartialBypass(ip: string, endpoint: string): boolean {
    // Check if endpoint is configured for bypass
    const endpointConfig = rateLimitConfig.endpoints[endpoint];
    if (endpointConfig?.bypass) {
      return true;
    }

    // Check if IP is from internal network
    if (this.isInternalIP(ip)) {
      return true;
    }

    return false;
  }

  // Check if IP is internal
  private isInternalIP(ip: string): boolean {
    if (isIPv4(ip)) {
      return this.isInternalIPv4(ip);
    }

    if (isIPv6(ip)) {
      return this.isInternalIPv6(ip);
    }

    return false;
  }

  private isInternalIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    const { CLASS_A, CLASS_B, CLASS_C, LOOPBACK, ZERO } = IPV4_PRIVATE_RANGES;

    return (
      (parts[0] === CLASS_A.network) ||
      (parts[0] === CLASS_B.network && parts[1] >= CLASS_B.min && parts[1] <= CLASS_B.max) ||
      (parts[0] === CLASS_C.network && parts[1] === CLASS_C.secondary) ||
      (parts[0] === LOOPBACK.network) ||
      (parts[0] === ZERO.network)
    );
  }

  private isInternalIPv6(ip: string): boolean {
    return (
      ip.startsWith('fe80:') ||
      ip.startsWith('fc00:') ||
      ip.startsWith('fd00:') ||
      ip === '::1'
    );
  }

  // Check if bypass should be allowed based on headers
  private shouldBypassByHeaders(_ip: string): boolean {
    // This would be called from middleware with actual headers
    // For now, return false
    return false;
  }

  // Generate trusted IP headers
  private generateTrustedHeaders(ip: string, bypassLevel: 'full' | 'partial'): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Trusted-IP': 'true',
      'X-Bypass-Level': bypassLevel,
      'X-Trusted-IP-Address': ip,
    };

    if (bypassLevel === 'full') {
      headers['X-RateLimit-Bypass'] = 'true';
      headers['X-RateLimit-Limit'] = 'unlimited';
      headers['X-RateLimit-Remaining'] = 'unlimited';
    } else if (bypassLevel === 'partial') {
      headers['X-RateLimit-Bypass'] = 'partial';
      headers['X-RateLimit-Limit'] = 'increased';
    }

    return headers;
  }

  // Add trusted IP dynamically
  addTrustedIP(ip: TrustedIP): void {
    if (!this.trustedIPs.includes(ip)) {
      this.trustedIPs.push(ip);

      if (this.isIPRange(ip)) {
        this.ipRanges.push(ip);
      } else {
        this.individualIPs.add(ip);
      }
    }
  }

  // Remove trusted IP
  removeTrustedIP(ip: TrustedIP): void {
    const index = this.trustedIPs.indexOf(ip);
    if (index > -1) {
      this.trustedIPs.splice(index, 1);

      if (this.isIPRange(ip)) {
        const rangeIndex = this.ipRanges.indexOf(ip);
        if (rangeIndex > -1) {
          this.ipRanges.splice(rangeIndex, 1);
        }
      } else {
        this.individualIPs.delete(ip);
      }
    }
  }

  // Get all trusted IPs
  getTrustedIPs(): TrustedIP[] {
    return [...this.trustedIPs];
  }

  // Check if IP is in any trusted range
  isIPTrusted(ip: string): boolean {
    const result = this.checkTrustedIP(ip);
    return result.isTrusted;
  }

  // Get bypass statistics
  getBypassStats(): {
    totalTrustedIPs: number;
    individualIPs: number;
    ipRanges: number;
    lastUpdated: string;
  } {
    return {
      totalTrustedIPs: this.trustedIPs.length,
      individualIPs: this.individualIPs.size,
      ipRanges: this.ipRanges.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Validate IP address format
  validateIP(ip: string): boolean {
    return isIP(ip) !== 0;
  }

  // Validate CIDR range format
  validateCIDR(cidr: string): boolean {
    try {
      const [ip, prefix] = cidr.split('/');
      if (!isIP(ip)) {return false;}

      const prefixNum = parseInt(prefix, 10);
      if (isNaN(prefixNum)) {return false;}

      if (isIPv4(ip)) {
        return prefixNum >= 0 && prefixNum <= IPV4_MAX_PREFIX;
      } else if (isIPv6(ip)) {
        return prefixNum >= 0 && prefixNum <= IPV6_MAX_PREFIX;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Test IP against all trusted ranges
  testIP(ip: string): {
    isTrusted: boolean;
    matchedRanges: string[];
    reason: string;
  } {
    const matchedRanges: string[] = [];

    // Check individual IPs
    if (this.individualIPs.has(ip)) {
      matchedRanges.push(ip);
    }

    // Check IP ranges
    for (const range of this.ipRanges) {
      if (this.isIPInRange(ip, range)) {
        matchedRanges.push(range);
      }
    }

    return {
      isTrusted: matchedRanges.length > 0,
      matchedRanges,
      reason: matchedRanges.length > 0
        ? `IP matched ${matchedRanges.length} trusted range(s)`
        : 'IP not in any trusted range',
    };
  }
}

// Singleton instance
export const trustedIPBypassManager = TrustedIPBypassManager.getInstance();

// Convenience functions
export const checkTrustedIP = (
  ip: string,
  endpoint?: string,
): TrustedIPBypassResult => trustedIPBypassManager.checkTrustedIP(ip, endpoint);

export const isIPTrusted = (ip: string): boolean => trustedIPBypassManager.isIPTrusted(ip);

export const addTrustedIP = (ip: TrustedIP): void => {
  trustedIPBypassManager.addTrustedIP(ip);
};

export const removeTrustedIP = (ip: TrustedIP): void => {
  trustedIPBypassManager.removeTrustedIP(ip);
};

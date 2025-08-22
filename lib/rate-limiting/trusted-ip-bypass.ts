import { rateLimitConfig } from './config';
import { isIP, isIPv4, isIPv6 } from 'net';

// IP address types
export type IPAddress = string;
export type IPRange = string; // CIDR notation
export type TrustedIP = IPAddress | IPRange;

// Trusted IP bypass result
export interface TrustedIPBypassResult {
  isTrusted: boolean;
  reason: string;
  bypassLevel: 'full' | 'partial' | 'none';
  headers: Record<string, string>;
}

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
    
    console.log(`Initialized ${this.individualIPs.size} individual trusted IPs and ${this.ipRanges.length} IP ranges`);
  }

  // Check if IP is trusted and should bypass rate limiting
  checkTrustedIP(ip: string, endpoint?: string): TrustedIPBypassResult {
    try {
      // Validate IP format
      if (!isIP(ip)) {
        return {
          isTrusted: false,
          reason: 'Invalid IP address format',
          bypassLevel: 'none',
          headers: {}
        };
      }

      // Check if IP is in individual trusted IPs
      if (this.individualIPs.has(ip)) {
        return {
          isTrusted: true,
          reason: 'IP is in trusted IP list',
          bypassLevel: 'full',
          headers: this.generateTrustedHeaders(ip, 'full')
        };
      }

      // Check if IP is in trusted IP ranges
      for (const range of this.ipRanges) {
        if (this.isIPInRange(ip, range)) {
          return {
            isTrusted: true,
            reason: `IP is in trusted range ${range}`,
            bypassLevel: 'full',
            headers: this.generateTrustedHeaders(ip, 'full')
          };
      }
      }

      // Check for partial bypass based on endpoint
      if (endpoint && this.shouldPartialBypass(ip, endpoint)) {
        return {
          isTrusted: true,
          reason: 'Partial bypass for endpoint',
          bypassLevel: 'partial',
          headers: this.generateTrustedHeaders(ip, 'partial')
        };
      }

      // Check for bypass based on headers
      if (this.shouldBypassByHeaders(ip)) {
        return {
          isTrusted: true,
          reason: 'Bypass by headers',
          bypassLevel: 'partial',
          headers: this.generateTrustedHeaders(ip, 'partial')
        };
      }

      return {
        isTrusted: false,
        reason: 'IP not in trusted list',
        bypassLevel: 'none',
        headers: {}
      };

    } catch (error) {
      console.error('Error checking trusted IP:', error);
      return {
        isTrusted: false,
        reason: 'Error checking trusted IP',
        bypassLevel: 'none',
        headers: {}
      };
    }
  }

  // Check if string represents an IP range (CIDR notation)
  private isIPRange(ip: string): boolean {
    return ip.includes('/');
  }

  // Check if IP is within a CIDR range
  private isIPInRange(ip: string, range: string): boolean {
    try {
      const [rangeIP, prefixLength] = range.split('/');
      const prefix = parseInt(prefixLength);
      
      if (isNaN(prefix) || prefix < 0 || prefix > (isIPv6(rangeIP) ? 128 : 32)) {
        return false;
      }

      if (isIPv4(ip) && isIPv4(rangeIP)) {
        return this.isIPv4InRange(ip, rangeIP, prefix);
      } else if (isIPv6(ip) && isIPv6(rangeIP)) {
        return this.isIPv6InRange(ip, rangeIP, prefix);
      }
      
      return false;
    } catch (error) {
      console.warn('Error checking IP range:', error);
      return false;
    }
  }

  // Check if IPv4 is within range
  private isIPv4InRange(ip: string, rangeIP: string, prefix: number): boolean {
    const ipNum = this.ipv4ToNumber(ip);
    const rangeNum = this.ipv4ToNumber(rangeIP);
    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    
    return (ipNum & mask) === (rangeNum & mask);
  }

  // Check if IPv6 is within range
  private isIPv6InRange(ip: string, rangeIP: string, prefix: number): boolean {
    // Simplified IPv6 range checking
    // In production, use a proper IPv6 library
    return ip.startsWith(rangeIP.split('/')[0].substring(0, prefix / 4));
  }

  // Convert IPv4 to number
  private ipv4ToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
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
      const parts = ip.split('.').map(Number);
      return (
        (parts[0] === 10) ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 127) ||
        (parts[0] === 0)
      );
    }
    
    if (isIPv6(ip)) {
      return (
        ip.startsWith('fe80:') ||
        ip.startsWith('fc00:') ||
        ip.startsWith('fd00:') ||
        ip === '::1'
      );
    }
    
    return false;
  }

  // Check if bypass should be allowed based on headers
  private shouldBypassByHeaders(ip: string): boolean {
    // This would be called from middleware with actual headers
    // For now, return false
    return false;
  }

  // Generate trusted IP headers
  private generateTrustedHeaders(ip: string, bypassLevel: 'full' | 'partial'): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Trusted-IP': 'true',
      'X-Bypass-Level': bypassLevel,
      'X-Trusted-IP-Address': ip
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
      
      console.log(`Added trusted IP: ${ip}`);
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
      
      console.log(`Removed trusted IP: ${ip}`);
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
      lastUpdated: new Date().toISOString()
    };
  }

  // Validate IP address format
  validateIP(ip: string): boolean {
    return isIP(ip);
  }

  // Validate CIDR range format
  validateCIDR(cidr: string): boolean {
    try {
      const [ip, prefix] = cidr.split('/');
      if (!isIP(ip)) return false;
      
      const prefixNum = parseInt(prefix);
      if (isNaN(prefixNum)) return false;
      
      if (isIPv4(ip)) {
        return prefixNum >= 0 && prefixNum <= 32;
      } else if (isIPv6(ip)) {
        return prefixNum >= 0 && prefixNum <= 128;
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
        : 'IP not in any trusted range'
    };
  }
}

// Singleton instance
export const trustedIPBypassManager = TrustedIPBypassManager.getInstance();

// Convenience functions
export const checkTrustedIP = (ip: string, endpoint?: string): TrustedIPBypassResult => {
  return trustedIPBypassManager.checkTrustedIP(ip, endpoint);
};

export const isIPTrusted = (ip: string): boolean => {
  return trustedIPBypassManager.isIPTrusted(ip);
};

export const addTrustedIP = (ip: TrustedIP): void => {
  trustedIPBypassManager.addTrustedIP(ip);
};

export const removeTrustedIP = (ip: TrustedIP): void => {
  trustedIPBypassManager.removeTrustedIP(ip);
};

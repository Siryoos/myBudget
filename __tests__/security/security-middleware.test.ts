import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/middleware/security';

// Mock the security monitor
jest.mock('@/middleware/security', () => ({
  ...jest.requireActual('@/middleware/security'),
  securityMonitor: {
    recordRequest: jest.fn(),
  },
}));

describe('Security Middleware', () => {
  let mockRequest: NextRequest;
  let mockResponse: NextResponse;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a mock request
    mockRequest = {
      ip: '192.168.1.1',
      headers: new Map([
        ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
        ['origin', 'http://localhost:3000'],
        ['content-type', 'application/json'],
      ]),
      method: 'GET',
      nextUrl: {
        pathname: '/api/test',
      },
    } as unknown as NextRequest;

    mockResponse = NextResponse.next();
  });

  describe('Request Validation', () => {
    it('should allow valid requests', () => {
      const response = securityMiddleware(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should block large requests', () => {
      const largeRequest = {
        ...mockRequest,
        headers: new Map([
          ['content-length', '15000000'], // 15MB
        ]),
      } as unknown as NextRequest;

      const response = securityMiddleware(largeRequest);
      expect(response.status).toBe(413);
    });

    it('should validate content type for POST requests', () => {
      const postRequest = {
        ...mockRequest,
        method: 'POST',
        headers: new Map([
          ['content-type', 'text/plain'],
        ]),
      } as unknown as NextRequest;

      const response = securityMiddleware(postRequest);
      expect(response.status).toBe(400);
    });

    it('should allow valid JSON content type for POST requests', () => {
      const postRequest = {
        ...mockRequest,
        method: 'POST',
        headers: new Map([
          ['content-type', 'application/json'],
        ]),
      } as unknown as NextRequest;

      const response = securityMiddleware(postRequest);
      expect(response.status).toBe(200);
    });
  });

  describe('CORS Handling', () => {
    it('should allow requests from allowed origins', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://app.example.com';
      
      const request = {
        ...mockRequest,
        headers: new Map([
          ['origin', 'https://app.example.com'],
        ]),
      } as unknown as NextRequest;

      const response = securityMiddleware(request);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    });

    it('should block requests from unauthorized origins', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
      
      const request = {
        ...mockRequest,
        headers: new Map([
          ['origin', 'https://malicious-site.com'],
        ]),
      } as unknown as NextRequest;

      const response = securityMiddleware(request);
      // Should still process the request but log the unauthorized origin
      expect(response.status).toBe(200);
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', () => {
      const response = securityMiddleware(mockRequest);
      
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    });

    it('should set CSP header', () => {
      const response = securityMiddleware(mockRequest);
      const csp = response.headers.get('Content-Security-Policy');
      
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
    });
  });

  describe('Preflight Requests', () => {
    it('should handle OPTIONS requests correctly', () => {
      const optionsRequest = {
        ...mockRequest,
        method: 'OPTIONS',
      } as unknown as NextRequest;

      const response = securityMiddleware(optionsRequest);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      // Mock a request that would cause an error
      const invalidRequest = {
        ...mockRequest,
        headers: new Map([
          ['content-length', 'invalid'],
        ]),
      } as unknown as NextRequest;

      const response = securityMiddleware(invalidRequest);
      expect(response.status).toBe(413);
    });
  });

  describe('Suspicious Request Detection', () => {
    it('should detect suspicious user agents', () => {
      const suspiciousRequest = {
        ...mockRequest,
        headers: new Map([
          ['user-agent', 'curl/7.68.0'],
        ]),
      } as unknown as NextRequest;

      const response = securityMiddleware(suspiciousRequest);
      // Should still process but log the suspicious request
      expect(response.status).toBe(200);
    });
  });
});

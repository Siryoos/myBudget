import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken, hashPassword, comparePassword, generateRefreshToken } from '@/lib/auth';
import { query } from '@/lib/database';

// Mock database module
jest.mock('@/lib/database');

// Mock environment variables
const mockEnv = {
  JWT_SECRET: 'test-secret-key-at-least-32-characters-long',
  JWT_EXPIRES_IN: '7d',
  JWT_REFRESH_EXPIRES_IN: '30d'
};

describe('Authentication Security Tests', () => {
  const mockedQuery = query as jest.MockedFunction<typeof query>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set environment variables
    process.env = { ...process.env, ...mockEnv };
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });
    
    it('should verify correct passwords', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });
    
    it('should reject incorrect passwords', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
    
    it('should use sufficient salt rounds', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Same password should produce different hashes due to salt
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('JWT Token Generation', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      token_version: 1,
      password_changed_at: new Date('2024-01-01')
    };
    
    beforeEach(() => {
      mockedQuery.mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });
    });
    
    it('should generate valid JWT tokens', async () => {
      const payload = {
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      };
      
      const token = await generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token structure (3 parts separated by dots)
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });
    
    it('should include token version in payload', async () => {
      const payload = {
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      };
      
      const token = await generateToken(payload);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.tokenVersion).toBe(mockUser.token_version);
      expect(decoded.passwordChangedAt).toBe(mockUser.password_changed_at.toISOString());
    });
    
    it('should reject tokens with invalid JWT secret', async () => {
      delete process.env.JWT_SECRET;
      
      const payload = {
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      };
      
      await expect(generateToken(payload)).rejects.toThrow();
    });
    
    it('should set proper expiration time', async () => {
      const payload = {
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      };
      
      const token = await generateToken(payload);
      const decoded = jwt.decode(token) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - decoded.iat;
      
      // 7 days in seconds
      expect(expiresIn).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('JWT Token Verification', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      token_version: 1,
      password_changed_at: new Date('2024-01-01')
    };
    
    beforeEach(() => {
      mockedQuery.mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });
    });
    
    it('should verify valid tokens', async () => {
      const payload = {
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      };
      
      const token = await generateToken(payload);
      const verified = await verifyToken(token);
      
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
    });
    
    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET!
      );
      
      await expect(verifyToken(expiredToken)).rejects.toThrow('JWT token has expired');
    });
    
    it('should reject tokens with invalid signature', async () => {
      const invalidToken = jwt.sign(
        { userId: 'user-123' },
        'wrong-secret'
      );
      
      await expect(verifyToken(invalidToken)).rejects.toThrow('Invalid or malformed JWT token');
    });
    
    it('should reject tokens with mismatched token version', async () => {
      // Create token with version 1
      const token = await generateToken({
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      });
      
      // Update mock to return version 2
      mockedQuery.mockResolvedValue({
        rows: [{ ...mockUser, token_version: 2 }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });
      
      await expect(verifyToken(token)).rejects.toThrow('Token version mismatch');
    });
    
    it('should reject tokens when password was changed after token issue', async () => {
      const token = await generateToken({
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      });
      
      // Update mock to return newer password change date
      mockedQuery.mockResolvedValue({
        rows: [{ 
          ...mockUser, 
          password_changed_at: new Date('2024-02-01') 
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });
      
      await expect(verifyToken(token)).rejects.toThrow('Password was changed');
    });
  });

  describe('Refresh Token Security', () => {
    const mockUser = {
      id: 'user-123',
      token_version: 1
    };
    
    beforeEach(() => {
      mockedQuery.mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });
    });
    
    it('should generate refresh tokens with longer expiration', async () => {
      const refreshToken = await generateRefreshToken(mockUser.id);
      const decoded = jwt.decode(refreshToken) as any;
      
      expect(decoded.type).toBe('refresh');
      expect(decoded.userId).toBe(mockUser.id);
      
      const expiresIn = decoded.exp - decoded.iat;
      // 30 days in seconds
      expect(expiresIn).toBe(30 * 24 * 60 * 60);
    });
    
    it('should include token version in refresh tokens', async () => {
      const refreshToken = await generateRefreshToken(mockUser.id);
      const decoded = jwt.decode(refreshToken) as any;
      
      expect(decoded.tokenVersion).toBe(mockUser.token_version);
    });
  });

  describe('Security Best Practices', () => {
    it('should use HS256 algorithm for JWT', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        token_version: 1,
        password_changed_at: new Date()
      };
      
      mockedQuery.mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });
      
      const token = await generateToken({
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      });
      
      const decoded = jwt.decode(token, { complete: true }) as any;
      expect(decoded.header.alg).toBe('HS256');
    });
    
    it('should require minimum JWT secret length', async () => {
      process.env.JWT_SECRET = 'short';
      
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      await expect(generateToken(payload)).rejects.toThrow();
    });
    
    it('should not include sensitive data in JWT payload', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        token_version: 1,
        password_changed_at: new Date(),
        password_hash: 'should-not-be-in-token'
      };
      
      mockedQuery.mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });
      
      const token = await generateToken({
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      });
      
      const decoded = jwt.decode(token) as any;
      
      // Should not include password hash or other sensitive data
      expect(decoded.password_hash).toBeUndefined();
      expect(decoded.password).toBeUndefined();
    });
  });
});
import type { SignOptions, VerifyOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

const { sign: jwtSign, verify: jwtVerify } = jwt;

/**
 * Type-safe JWT wrapper with proper error handling
 */
export class JWTWrapper {
  /**
   * Validate JWT secret meets security requirements
   */
  private static validateSecret(secret: string | undefined): string {
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }

    return secret;
  }

  /**
   * Type-safe JWT sign function
   */
  static sign(
    payload: string | object | Buffer,
    secret: string | undefined,
    options?: SignOptions,
  ): string {
    const validatedSecret = this.validateSecret(secret);

    try {
      return jwtSign(payload, validatedSecret, options);
    } catch (error) {
      throw new Error(`JWT sign failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Type-safe JWT verify function
   */
  static verify<T = any>(
    token: string,
    secret: string | undefined,
    options?: VerifyOptions,
  ): T {
    const validatedSecret = this.validateSecret(secret);

    try {
      return jwtVerify(token, validatedSecret, options) as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new Error('JWT token has expired');
        } else if (error.name === 'NotBeforeError') {
          throw new Error('JWT token not yet valid');
        } else if (error.name === 'JsonWebTokenError') {
          throw new Error('Invalid or malformed JWT token');
        }
      }
      throw new Error(`JWT verify failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate refresh token with proper typing
   */
  static generateRefreshToken(payload: {
    userId: string;
    email: string;
    type: string;
    tokenVersion: number;
    passwordChangedAt: string;
  }): string {
    const secret = process.env.JWT_SECRET;
    const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as StringValue;

    return this.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn,
      audience: 'mybudget-users',
      issuer: 'mybudget',
    });
  }

  /**
   * Generate access token with proper typing
   */
  static generateAccessToken(payload: {
    userId: string;
    email: string;
    type: string;
    tokenVersion: number;
    passwordChangedAt: string;
  }): string {
    const secret = process.env.JWT_SECRET;
    const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue;

    return this.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn,
      audience: 'mybudget-users',
      issuer: 'mybudget',
    });
  }
}

// Convenience functions for backward compatibility
export const sign = JWTWrapper.sign;
export const verify = JWTWrapper.verify;
export const generateRefreshToken = JWTWrapper.generateRefreshToken;
export const generateAccessToken = JWTWrapper.generateAccessToken;

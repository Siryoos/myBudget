import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/database';

import type { JWTPayload } from '@/types/auth';

// Runtime JWT secret validation
const validateJWTSecretRuntime = (): void => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }
  
  // Validate that the secret is not the default example value
  if (secret === 'your_super_secret_jwt_key_here_change_this_in_production') {
    throw new Error('JWT_SECRET is set to the default example value. Please set a unique, secure secret before starting the application.');
  }
  
  // Validate minimum secret length for security
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security. Current length: ' + secret.length);
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = async (payload: Omit<JWTPayload, 'tokenVersion' | 'passwordChangedAt'>): Promise<string> => {
  // Validate JWT secret at runtime before token generation
  validateJWTSecretRuntime();
  
  const secret = process.env.JWT_SECRET!;
  
  // Fetch current user data for token versioning
  const userResult = await query(
    'SELECT token_version, password_changed_at FROM users WHERE id = $1',
    [payload.userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }
  
  const user = userResult.rows[0];
  const fullPayload: JWTPayload = {
    ...payload,
    tokenVersion: user.token_version || 1,
    passwordChangedAt: user.password_changed_at?.toISOString() || new Date().toISOString()
  };
  
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(fullPayload, secret, { 
    algorithm: 'HS256', 
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'] 
  });
};

export const verifyToken = async (token: string): Promise<JWTPayload> => {
  // Validate JWT secret at runtime before token verification
  validateJWTSecretRuntime();
  
  const secret = process.env.JWT_SECRET!;
  
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
    
    // Verify token version and password change timestamp against database
    const userResult = await query(
      'SELECT token_version, password_changed_at FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    
    // Check if token version matches
    if (decoded.tokenVersion !== user.token_version) {
      throw new Error('Token version mismatch - token has been invalidated');
    }
    
    // Check if password was changed after token was issued
    if (user.password_changed_at && decoded.passwordChangedAt) {
      const tokenPasswordTime = new Date(decoded.passwordChangedAt);
      const dbPasswordTime = new Date(user.password_changed_at);
      
      if (dbPasswordTime > tokenPasswordTime) {
        throw new Error('Password was changed - token is no longer valid');
      }
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('JWT token has expired');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('JWT token not yet valid');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid or malformed JWT token');
    } else {
      throw error; // Re-throw our custom errors
    }
  }
};

// Validate JWT_SECRET on startup
export const validateJWTSecret = (): void => {
  validateJWTSecretRuntime();
};
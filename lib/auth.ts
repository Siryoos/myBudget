import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import type { JWTPayload } from '@/types/auth';

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }
  
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, secret, { 
    algorithm: 'HS256', 
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'] 
  });
};

export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }
  
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('JWT token has expired');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('JWT token not yet valid');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid or malformed JWT token');
    } else {
      throw new Error('JWT verification failed');
    }
  }
};

// Validate JWT_SECRET on startup
export const validateJWTSecret = (): void => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set. Please set this environment variable before starting the application.');
  }
  
  // Validate that the secret is not the default example value
  if (process.env.JWT_SECRET === 'your_super_secret_jwt_key_here_change_this_in_production') {
    throw new Error('JWT_SECRET is set to the default example value. Please set a unique, secure secret before starting the application.');
  }
  
  // Validate minimum secret length for security
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security. Current length: ' + process.env.JWT_SECRET.length);
  }
};
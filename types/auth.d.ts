import { NextRequest } from 'next/server';

// User type that matches the database query result
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

// Extended request type with authenticated user
export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

// JWT payload type (matches lib/auth.ts)
export interface JWTPayload {
  userId: string;
  email: string;
}

// Helper type for request handlers that require authentication
export type AuthenticatedHandler = (request: AuthenticatedRequest) => Promise<Response>;

// Helper type for request handlers that may or may not have authentication
export type OptionalAuthHandler = (request: NextRequest | AuthenticatedRequest) => Promise<Response>;

'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { UserService } from '@/lib/services/user-service';
import { userSchemas } from '@/lib/validation-schemas';
import type { User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canAccess: (requiredRoles?: string[], requiredPermissions?: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const userService = new UserService();

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Verify token by fetching profile
          const userProfile = await userService.findById(token); // This would need to be adjusted based on your JWT structure
          if (userProfile) {
            setUser(userProfile);
          } else {
            localStorage.removeItem('authToken');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Validate input
      const validatedData = userService.validateData(userSchemas.login, { email, password });

      // Authenticate user
      const authenticatedUser = await userService.authenticate(email, password);
      if (!authenticatedUser) {
        throw new Error('Invalid email or password');
      }

      setUser(authenticatedUser);
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      // Validate input
      const validatedData = userService.validateData(userSchemas.create, data);

      // Create user
      const newUser = await userService.create(validatedData);

      setUser(newUser);
      router.push('/onboarding');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      localStorage.removeItem('authToken');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Validate input
      const validatedData = userService.validateData(userSchemas.update, data);

      // Update user
      const updatedUser = await userService.update(user.id, validatedData);

      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  const refreshAuth = async () => {
    if (!user) {
      throw new Error('No user to refresh');
    }

    try {
      const refreshedUser = await userService.findById(user.id);
      if (!refreshedUser) {
        throw new Error('User not found');
      }
      setUser(refreshedUser);
    } catch (error) {
      setUser(null);
      router.push('/login');
      throw error;
    }
  };

  // RBAC helper functions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    // Implement your permission logic here
    return true; // Placeholder
  }, [user]);

  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  const canAccess = useCallback(
    (requiredRoles?: string[], requiredPermissions?: string[]): boolean => {
      if (!user) return false;

      // Check roles
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.includes(user.role);
        if (!hasRequiredRole) return false;
      }

      // Check permissions
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission =>
          hasPermission(permission)
        );
        if (!hasAllPermissions) return false;
      }

      return true;
    },
    [user, hasPermission]
  );

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshAuth,
    hasPermission,
    hasRole,
    canAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Simplified HOC for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    redirectTo?: string;
    requiredRoles?: string[];
    requiredPermissions?: string[];
    fallback?: React.ReactNode;
  } = {},
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, canAccess } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push(options.redirectTo || '/login');
      }

      if (!isLoading && isAuthenticated) {
        const hasAccess = canAccess(options.requiredRoles, options.requiredPermissions);
        if (!hasAccess) {
          router.push(options.redirectTo || '/unauthorized');
        }
      }
    }, [isLoading, isAuthenticated, canAccess]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    const hasAccess = canAccess(options.requiredRoles, options.requiredPermissions);
    if (!hasAccess) {
      return options.fallback || null;
    }

    return <Component {...props} />;
  };
}
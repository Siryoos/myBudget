'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useApp } from './AppContext';
import type { 
  User, 
  UserRole, 
  Permission, 
  AuthContextType, 
  RegisterData,
  rolePermissions 
} from '@/types/auth';

// Re-export AuthContextType for backward compatibility
type AuthContextValue = AuthContextType;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { dispatch, clearUserData, syncData } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Centralized function to clear auth tokens and headers
  const clearAuthTokens = () => {
    localStorage.removeItem('authToken');
    api.utils.setToken(null);
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          api.utils.setToken(token);
          const response = await api.auth.getProfile();
          if (response.success && response.data) {
            setUser(response.data);
            dispatch({ type: 'SET_USER', payload: response.data });
            // Sync data after successful auth
            await syncData();
          } else {
            clearAuthTokens();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password);
      if (!response.success) {
        throw new Error(response.error || 'Login failed');
      }

      const { user, token } = response.data!;
      
      // Save token
      localStorage.setItem('authToken', token);
      api.utils.setToken(token);
      
      // Update state
      setUser(user);
      dispatch({ type: 'SET_USER', payload: user });
      
      // Sync data after login
      await syncData();
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      // Clear any partial state
      clearAuthTokens();
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.auth.register(data);
      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }

      const { user, token } = response.data!;
      
      // Save token
      localStorage.setItem('authToken', token);
      api.utils.setToken(token);
      
      // Update state
      setUser(user);
      dispatch({ type: 'SET_USER', payload: user });
      
      // Redirect to onboarding or dashboard
      router.push('/onboarding');
    } catch (error) {
      // Clear any partial state
      clearAuthTokens();
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Explicitly remove the stored JWT token first
      localStorage.removeItem('authToken');
      
      // Clear all user data
      setUser(null);
      clearUserData();
      clearAuthTokens();
      
      // Redirect to login
      router.push('/login');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await api.auth.updateProfile({
        ...data,
        role: data.role as any // Type compatibility fix
      });
      if (!response.success) {
        throw new Error(response.error || 'Profile update failed');
      }

      const updatedUser = response.data!;
      setUser(updatedUser);
      dispatch({ type: 'SET_USER', payload: updatedUser });
    } catch (error) {
      throw error;
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await api.auth.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
        dispatch({ type: 'SET_USER', payload: response.data });
      } else {
        throw new Error('Failed to refresh auth');
      }
    } catch (error) {
      // If refresh fails, clear auth state completely
      setUser(null);
      clearUserData(); // This already clears localStorage and API client token
      clearAuthTokens();
      router.push('/login');
      // Don't rethrow error to prevent unwanted loops
      console.error('Auth refresh failed:', error);
    }
  };

  // RBAC helper functions
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    const userPermissions = (rolePermissions as any)[user.role] || [];
    return userPermissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  const canAccess = useCallback(
    (requiredRoles?: UserRole[], requiredPermissions?: Permission[]): boolean => {
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

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
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

// HOC for protecting routes with RBAC
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: { 
    redirectTo?: string; 
    requiredRoles?: UserRole[];
    requiredPermissions?: Permission[];
    fallback?: React.ReactNode;
  } = {}
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

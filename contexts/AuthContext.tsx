'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useApp } from './AppContext';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  monthlyIncome: number;
  currency?: string;
  language?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { dispatch, clearUserData, syncData } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

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
            localStorage.removeItem('authToken');
            api.utils.setToken(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('authToken');
        api.utils.setToken(null);
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
      localStorage.removeItem('authToken');
      api.utils.setToken(null);
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
      localStorage.removeItem('authToken');
      api.utils.setToken(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all user data
      setUser(null);
      clearUserData();
      
      // Redirect to login
      router.push('/login');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await api.auth.updateProfile(data);
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
      // If refresh fails, clear auth state
      setUser(null);
      clearUserData();
      router.push('/login');
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshAuth,
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

// HOC for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: { redirectTo?: string; allowedRoles?: string[] } = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push(options.redirectTo || '/login');
      }

      if (!isLoading && isAuthenticated && options.allowedRoles) {
        // Check role-based access if needed
        // This is a placeholder - implement based on your user roles structure
      }
    }, [isLoading, isAuthenticated, user]);

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

    return <Component {...props} />;
  };
}

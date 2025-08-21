import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse } from '@/types';

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordSuccessData {
  message: string;
  requiresReauth: boolean;
}

export function useChangePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { logout } = useAuth();

  const changePassword = async (data: ChangePasswordData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<ChangePasswordSuccessData> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to change password');
      }

      // Check for requiresReauth in the response
      if (result.data?.requiresReauth) {
        // Use AuthContext logout to properly clear all auth state
        await logout();
        return;
      }

      // Normal success handling
      setSuccess(result.data?.message || 'Password changed successfully');
      
      // Reset form after successful password change
      setTimeout(() => {
        setSuccess(null);
      }, 5000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setError(null);
    setSuccess(null);
  };

  return {
    changePassword,
    isLoading,
    error,
    success,
    resetState,
  };
}

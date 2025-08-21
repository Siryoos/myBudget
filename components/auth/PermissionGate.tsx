'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { UserRole, Permission } from '@/types/auth';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: Permission[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, requires all permissions. If false, requires any permission
}

export function PermissionGate({
  children,
  requiredRoles,
  requiredPermissions,
  fallback = null,
  requireAll = true
}: PermissionGateProps) {
  const { user, hasPermission, hasRole } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // Check permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const permissionCheck = requireAll
      ? requiredPermissions.every(permission => hasPermission(permission))
      : requiredPermissions.some(permission => hasPermission(permission));
    
    if (!permissionCheck) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
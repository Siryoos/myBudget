// User roles enum
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  PREMIUM_USER = 'premium_user',
  GUEST = 'guest'
}

// Permission types
export enum Permission {
  // Dashboard permissions
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_INSIGHTS = 'view_insights',
  VIEW_PEER_COMPARISON = 'view_peer_comparison',
  
  // Transaction permissions
  VIEW_TRANSACTIONS = 'view_transactions',
  CREATE_TRANSACTION = 'create_transaction',
  EDIT_TRANSACTION = 'edit_transaction',
  DELETE_TRANSACTION = 'delete_transaction',
  EXPORT_TRANSACTIONS = 'export_transactions',
  
  // Budget permissions
  VIEW_BUDGETS = 'view_budgets',
  CREATE_BUDGET = 'create_budget',
  EDIT_BUDGET = 'edit_budget',
  DELETE_BUDGET = 'delete_budget',
  
  // Goals permissions
  VIEW_GOALS = 'view_goals',
  CREATE_GOAL = 'create_goal',
  EDIT_GOAL = 'edit_goal',
  DELETE_GOAL = 'delete_goal',
  UPLOAD_GOAL_PHOTO = 'upload_goal_photo',
  
  // Advanced features
  USE_AI_INSIGHTS = 'use_ai_insights',
  VIEW_ADVANCED_ANALYTICS = 'view_advanced_analytics',
  USE_AUTOMATION = 'use_automation',
  
  // Admin permissions
  VIEW_ALL_USERS = 'view_all_users',
  MANAGE_USERS = 'manage_users',
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings'
}

// Role-Permission mapping
export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.GUEST]: [
    Permission.VIEW_DASHBOARD,
  ],
  [UserRole.USER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INSIGHTS,
    Permission.VIEW_TRANSACTIONS,
    Permission.CREATE_TRANSACTION,
    Permission.EDIT_TRANSACTION,
    Permission.DELETE_TRANSACTION,
    Permission.VIEW_BUDGETS,
    Permission.CREATE_BUDGET,
    Permission.EDIT_BUDGET,
    Permission.VIEW_GOALS,
    Permission.CREATE_GOAL,
    Permission.EDIT_GOAL,
  ],
  [UserRole.PREMIUM_USER]: [
    // All USER permissions
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INSIGHTS,
    Permission.VIEW_PEER_COMPARISON,
    Permission.VIEW_TRANSACTIONS,
    Permission.CREATE_TRANSACTION,
    Permission.EDIT_TRANSACTION,
    Permission.DELETE_TRANSACTION,
    Permission.EXPORT_TRANSACTIONS,
    Permission.VIEW_BUDGETS,
    Permission.CREATE_BUDGET,
    Permission.EDIT_BUDGET,
    Permission.DELETE_BUDGET,
    Permission.VIEW_GOALS,
    Permission.CREATE_GOAL,
    Permission.EDIT_GOAL,
    Permission.DELETE_GOAL,
    Permission.UPLOAD_GOAL_PHOTO,
    Permission.USE_AI_INSIGHTS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    Permission.USE_AUTOMATION,
  ],
  [UserRole.ADMIN]: [
    // All permissions
    ...Object.values(Permission)
  ]
};

// User interface with role
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  dateOfBirth?: string;
  monthlyIncome?: number;
  currency?: string;
  language?: string;
  profilePhotoUrl?: string;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Alias for backward compatibility
export type AuthenticatedUser = User;

// Auth context types
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  canAccess: (requiredRoles?: UserRole[], requiredPermissions?: Permission[]) => boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  monthlyIncome: number;
  currency?: string;
  language?: string;
}

// Route protection types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: Permission[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}
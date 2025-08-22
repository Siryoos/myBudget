// Database table schemas and types
export interface DatabaseSchema {
  users: UserTable;
  audit_logs: AuditLogTable;
  password_reset_tokens: PasswordResetTokenTable;
  user_backup_codes: UserBackupCodeTable;
  secret_metadata: SecretMetadataTable;
  performance_metrics: PerformanceMetricsTable;
  security_events: SecurityEventTable;
}

// User table
export interface UserTable {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  mfa_enabled: boolean;
  mfa_verified: boolean;
  mfa_secret?: string;
  token_version: number;
  password_changed_at?: Date;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  status: 'active' | 'suspended' | 'deleted';
}

// Audit logs table
export interface AuditLogTable {
  id: string;
  timestamp: Date;
  event_type: string;
  severity: string;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  details?: any;
  metadata?: any;
  tags: string[];
}

// Password reset tokens table
export interface PasswordResetTokenTable {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  used_at?: Date;
  ip_address?: string;
  user_agent?: string;
}

// User backup codes table
export interface UserBackupCodeTable {
  id: string;
  user_id: string;
  code_hash: string;
  used: boolean;
  created_at: Date;
  used_at?: Date;
}

// Secret metadata table
export interface SecretMetadataTable {
  id: string;
  type: string;
  name: string;
  version: number;
  created_at: Date;
  expires_at?: Date;
  last_rotated: Date;
  next_rotation: Date;
  status: string;
  tags: string[];
}

// Performance metrics table
export interface PerformanceMetricsTable {
  id: string;
  timestamp: Date;
  request_id: string;
  endpoint: string;
  method: string;
  response_time: number;
  memory_usage: any;
  database_queries: number;
  database_time: number;
  redis_operations: number;
  redis_time: number;
  status_code: number;
  user_agent?: string;
  ip_address?: string;
}

// Security events table
export interface SecurityEventTable {
  id: string;
  timestamp: Date;
  event_type: string;
  severity: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: any;
  metadata: any;
  tags: string[];
}

// Type-safe query result types
export type UserQueryResult = UserTable[];
export type AuditLogQueryResult = AuditLogTable[];
export type PasswordResetTokenQueryResult = PasswordResetTokenTable[];
export type UserBackupCodeQueryResult = UserBackupCodeTable[];
export type SecretMetadataQueryResult = SecretMetadataTable[];
export type PerformanceMetricsQueryResult = PerformanceMetricsTable[];
export type SecurityEventQueryResult = SecurityEventTable[];

// Generic query result type
export type QueryResult<T> = T[];

// Database connection types
export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// Database pool statistics
export interface DatabasePoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  activeCount: number;
}

// Database query performance metrics
export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowCount: number;
  timestamp: Date;
  userId?: string;
  endpoint?: string;
}

// Database transaction types
export interface TransactionOptions {
  isolationLevel: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  timeout: number;
  retries: number;
  backoffMs: number;
}

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  rollbackReason?: string;
  executionTime: number;
}

// Database migration types
export interface Migration {
  id: string;
  name: string;
  version: number;
  applied_at: Date;
  checksum: string;
  execution_time: number;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
}

// Database backup types
export interface DatabaseBackup {
  id: string;
  filename: string;
  size_bytes: number;
  created_at: Date;
  checksum: string;
  status: 'completed' | 'failed' | 'in_progress';
  backup_type: 'full' | 'incremental' | 'differential';
  retention_days: number;
  expires_at: Date;
}

// Database health check types
export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  connectionCount: number;
  activeQueries: number;
  lastCheck: Date;
  errors: string[];
}

// Security metrics types
export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsers: Array<{ userId: string; eventCount: number }>;
  topResources: Array<{ resourceType: string; eventCount: number }>;
  recentThreats: Array<{
    id: string;
    type: string;
    severity: string;
    timestamp: Date;
    description: string;
  }>;
  authenticationMetrics: {
    successfulLogins: number;
    failedLogins: number;
    mfaAttempts: number;
    passwordResets: number;
    accountLockouts: number;
  };
  dataAccessMetrics: {
    totalAccesses: number;
    unauthorizedAttempts: number;
    sensitiveDataAccess: number;
    exportOperations: number;
  };
}

// Performance metrics types
export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
  memoryTrend: Array<{ timestamp: Date; usage: number }>;
  databasePerformance: {
    totalQueries: number;
    averageTime: number;
    slowestQueries: Array<{ query: string; avgTime: number; count: number }>;
  };
  redisPerformance: {
    totalOperations: number;
    averageTime: number;
    hitRate: number;
    memoryUsage: number;
  };
  errorRates: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByEndpoint: Record<string, number>;
  };
}

// Type guards for runtime type checking
export function isUserTable(obj: any): obj is UserTable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.password_hash === 'string' &&
    typeof obj.mfa_enabled === 'boolean' &&
    typeof obj.mfa_verified === 'boolean' &&
    typeof obj.token_version === 'number' &&
    obj.created_at instanceof Date &&
    obj.updated_at instanceof Date
  );
}

export function isAuditLogTable(obj: any): obj is AuditLogTable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.event_type === 'string' &&
    typeof obj.severity === 'string' &&
    Array.isArray(obj.tags)
  );
}

export function isPerformanceMetricsTable(obj: any): obj is PerformanceMetricsTable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.request_id === 'string' &&
    typeof obj.endpoint === 'string' &&
    typeof obj.method === 'string' &&
    typeof obj.response_time === 'number' &&
    typeof obj.database_queries === 'number' &&
    typeof obj.database_time === 'number' &&
    typeof obj.redis_operations === 'number' &&
    typeof obj.redis_time === 'number' &&
    typeof obj.status_code === 'number'
  );
}

export function isSecurityEventTable(obj: any): obj is SecurityEventTable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.event_type === 'string' &&
    typeof obj.severity === 'string' &&
    typeof obj.details === 'object' &&
    typeof obj.metadata === 'object' &&
    Array.isArray(obj.tags)
  );
}

// Utility types for database operations
export type DatabaseRow = Record<string, any>;

export interface TypedQueryResult<T> {
  rows: T[];
  rowCount: number;
  command: string;
  oid: number;
  fields: Array<{
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }>;
}

// Type-safe database query functions
export async function executeTypedQuery<T>(
  queryText: string,
  params: any[],
  typeGuard: (obj: any) => obj is T
): Promise<TypedQueryResult<T>> {
  // This would be implemented in the actual database module
  // For now, it's a type definition
  throw new Error('executeTypedQuery not implemented');
}

// Database constraint types
export interface DatabaseConstraint {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  table: string;
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  checkCondition?: string;
}

// Database index types
export interface DatabaseIndex {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  partial?: string;
}

// Database view types
export interface DatabaseView {
  name: string;
  definition: string;
  checkOption: 'NONE' | 'LOCAL' | 'CASCADE';
  isUpdatable: boolean;
  isInsertableInto: boolean;
  isTriggerUpdatable: boolean;
}

// Export all types
export type {
  DatabaseSchema,
  UserTable,
  AuditLogTable,
  PasswordResetTokenTable,
  UserBackupCodeTable,
  SecretMetadataTable,
  PerformanceMetricsTable,
  SecurityEventTable,
  UserQueryResult,
  AuditLogQueryResult,
  PasswordResetTokenQueryResult,
  UserBackupCodeQueryResult,
  SecretMetadataQueryResult,
  PerformanceMetricsQueryResult,
  SecurityEventQueryResult,
  QueryResult,
  DatabaseConnection,
  DatabasePoolStats,
  QueryPerformanceMetrics,
  TransactionOptions,
  TransactionResult,
  Migration,
  DatabaseBackup,
  DatabaseHealth,
  SecurityMetrics,
  PerformanceMetrics,
  DatabaseRow,
  TypedQueryResult,
  DatabaseConstraint,
  DatabaseIndex,
  DatabaseView
};

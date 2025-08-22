import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '@/lib/logger';

// Database configuration validation
const validateDatabaseConfig = () => {
  const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required database configuration: ${missing.join(', ')}`);
  }
  
  // Validate pool configuration
  const poolMax = parseInt(process.env.DB_POOL_MAX || '20');
  const poolMin = parseInt(process.env.DB_POOL_MIN || '2');
  
  if (poolMin < 0 || poolMax < poolMin) {
    throw new Error('Invalid database pool configuration');
  }
  
  if (poolMax > 100) {
    logger.warn('Database pool max connections exceeds recommended limit', { poolMax });
  }
};

// Validate configuration on module load
validateDatabaseConfig();

// Create connection pool with enhanced configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000'),
  // Enhanced error handling
  log: (msg: string) => logger.debug(msg, { component: 'pg-pool' }),
  // Connection health check
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
});

// Handle pool errors
pool.on('error', (err, client) => {
  logger.error('Unexpected database pool error', err, { 
    client: client ? 'with client' : 'no client' 
  });
});

// Monitor pool connections
pool.on('connect', (client) => {
  logger.debug('Database client connected', { 
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('acquire', (client) => {
  logger.trace('Database client acquired from pool');
});

pool.on('remove', (client) => {
  logger.debug('Database client removed from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount
  });
});

export const getClient = (): Promise<PoolClient> => pool.connect();

// Enhanced query function with logging and performance tracking
export const query = async <T = any>(text: string, params?: unknown[]): Promise<QueryResult<T>> => {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    logger.trace('Executing query', { 
      query: text.substring(0, 100), // Log first 100 chars only
      paramCount: params?.length || 0 
    });
    
    const result = await client.query<T>(text, params);
    const duration = Date.now() - start;
    
    logger.query(text, duration, { 
      rows: result.rowCount,
      command: result.command 
    });
    
    // Warn on slow queries
    if (duration > 1000) {
      logger.warn('Slow query detected', { 
        query: text.substring(0, 100),
        duration,
        rows: result.rowCount 
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Query execution failed', error as Error, {
      query: text.substring(0, 100),
      duration,
      paramCount: params?.length || 0
    });
    throw error;
  } finally {
    client.release();
  }
};

// Transaction wrapper types
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

export interface TransactionOptions {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  deferrable?: boolean;
}

/**
 * Executes a function within a database transaction
 * Provides automatic BEGIN/COMMIT/ROLLBACK with proper error handling
 * @param fn Function to execute within the transaction
 * @param options Transaction options
 * @returns Promise<T> The result of the function execution
 */
export async function withTransaction<T>(
  fn: TransactionCallback<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const client = await pool.connect();
  const start = Date.now();
  
  try {
    // Start transaction with options
    let beginQuery = 'BEGIN';
    if (options.isolationLevel) {
      beginQuery += ` ISOLATION LEVEL ${options.isolationLevel}`;
    }
    if (options.readOnly) {
      beginQuery += ' READ ONLY';
    }
    if (options.deferrable) {
      beginQuery += ' DEFERRABLE';
    }
    
    await client.query(beginQuery);
    logger.debug('Transaction started', { options });
    
    // Execute the callback
    const result = await fn(client);
    
    // Commit transaction
    await client.query('COMMIT');
    const duration = Date.now() - start;
    
    logger.debug('Transaction committed', { duration });
    
    return result;
  } catch (error) {
    // Rollback on error
    try {
      await client.query('ROLLBACK');
      const duration = Date.now() - start;
      logger.warn('Transaction rolled back', { duration, error: (error as Error).message });
    } catch (rollbackError) {
      logger.error('Failed to rollback transaction', rollbackError as Error);
    }
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Executes multiple queries within a transaction
 */
export async function batchTransaction<T>(
  queries: Array<{ text: string; params?: unknown[] }>,
  transform?: (results: QueryResult[]) => T
): Promise<T | QueryResult[]> {
  return withTransaction(async (client) => {
    const results: QueryResult[] = [];
    
    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    return transform ? transform(results) : results;
  });
}

/**
 * Executes a transaction with automatic retry on serialization failures
 */
export async function withRetryableTransaction<T>(
  fn: TransactionCallback<T>,
  options: TransactionOptions & { maxRetries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 100, ...txOptions } = options;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await withTransaction(fn, txOptions);
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable (serialization failure)
      if (error.code === '40001' || error.code === '40P01') {
        logger.debug('Retrying transaction due to serialization failure', { 
          attempt: attempt + 1,
          maxRetries 
        });
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }
      
      // Non-retryable error
      throw error;
    }
  }
  
  throw lastError || new Error('Transaction failed after max retries');
}

/**
 * Creates a savepoint within a transaction
 */
export async function withSavepoint<T>(
  client: PoolClient,
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  await client.query(`SAVEPOINT ${name}`);
  
  try {
    const result = await fn();
    await client.query(`RELEASE SAVEPOINT ${name}`);
    return result;
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    throw error;
  }
}

// Pool health check
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  poolStats: {
    total: number;
    idle: number;
    waiting: number;
  };
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const result = await query('SELECT 1 as health_check');
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      },
      latency
    };
  } catch (error) {
    return {
      healthy: false,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Graceful shutdown
export async function closeDatabasePool(): Promise<void> {
  logger.info('Closing database connection pool');
  await pool.end();
}

// Export pool for advanced usage
export default pool;

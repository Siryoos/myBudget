import type { Pool, PoolClient } from 'pg';

import { getPool } from './database';

// Transaction options
export interface TransactionOptions {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  timeout?: number; // milliseconds
  retries?: number;
  backoffMs?: number;
}

// Transaction constants
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF_MS = 100;
const TIMEOUT_MS = 60000; // 60 seconds
const CRITICAL_RETRIES = 5;

// Default transaction options
const DEFAULT_OPTIONS: Required<TransactionOptions> = {
  isolationLevel: 'READ COMMITTED',
  timeout: DEFAULT_TIMEOUT_MS,
  retries: DEFAULT_RETRIES,
  backoffMs: DEFAULT_BACKOFF_MS,
};

// Transaction result
export interface TransactionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  rollbackReason?: string;
}

// Transaction callback type
export type TransactionCallback<T = unknown> = (client: PoolClient) => Promise<T>;

// Error interface for retry logic
interface DatabaseError {
  message?: string;
  code?: string;
}

// Pool statistics interface
interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount?: number;
}

// Database transaction manager
export class TransactionManager {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Execute a function within a database transaction
   */
  async executeTransaction<T = unknown>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {},
  ): Promise<TransactionResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let client: PoolClient | null = null;
    let attempts = 0;

    while (attempts < opts.retries) {
      try {
        // Get client from pool
        client = await this.pool.connect();

        // Set transaction timeout
        await client.query(`SET LOCAL statement_timeout = ${opts.timeout}`);

        // Begin transaction with specified isolation level
        await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${opts.isolationLevel}`);

        // Execute the transaction callback
        const result = await callback(client);

        // Commit transaction
        await client.query('COMMIT');

        return {
          success: true,
          data: result,
        };

      } catch (error) {
        attempts++;

        // Rollback transaction if client exists
        if (client) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
          }
        }

        // Check if we should retry
        if (this.shouldRetry(error) && attempts < opts.retries) {
          console.warn(`Transaction attempt ${attempts} failed, retrying...`, error);

          // Wait before retrying with exponential backoff
          const backoffTime = opts.backoffMs * Math.pow(2, attempts - 1);
          await this.sleep(backoffTime);

          continue;
        }

        // Transaction failed permanently
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          rollbackReason: `Transaction failed after ${attempts} attempts`,
        };

      } finally {
        // Release client back to pool
        if (client) {
          client.release();
        }
      }
    }

    return {
      success: false,
      error: new Error(`Transaction failed after ${opts.retries} attempts`),
      rollbackReason: 'Maximum retry attempts exceeded',
    };
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeBatchTransaction<T = any>(
    operations: Array<{ name: string; operation: TransactionCallback<T> }>,
    options: TransactionOptions = {},
  ): Promise<TransactionResult<T[]>> {
    return this.executeTransaction(async (client) => {
      const results: T[] = [];

      for (const { name, operation } of operations) {
        try {
          console.log(`Executing operation: ${name}`);
          const result = await operation(client);
          results.push(result);
          console.log(`Operation ${name} completed successfully`);
        } catch (error) {
          console.error(`Operation ${name} failed:`, error);
          throw new Error(`Operation ${name} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return results;
    }, options);
  }

  /**
   * Execute a read-only transaction (optimized for read operations)
   */
  async executeReadTransaction<T = unknown>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {},
  ): Promise<TransactionResult<T>> {
    const readOptions: TransactionOptions = {
      ...options,
      isolationLevel: 'READ COMMITTED', // Optimized for reads
      timeout: options.timeout || TIMEOUT_MS, // Longer timeout for reads
    };

    return this.executeTransaction(callback, readOptions);
  }

  /**
   * Execute a critical write transaction with extra safety measures
   */
  async executeCriticalTransaction<T = unknown>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {},
  ): Promise<TransactionResult<T>> {
    const criticalOptions: TransactionOptions = {
      ...options,
      isolationLevel: 'SERIALIZABLE', // Highest isolation for critical operations
      timeout: options.timeout || TIMEOUT_MS, // Longer timeout
      retries: options.retries || CRITICAL_RETRIES, // More retries for critical operations
    };

    return this.executeTransaction(callback, criticalOptions);
  }

  /**
   * Check if an error should trigger a retry
   */
  private shouldRetry(error: unknown): boolean {
    if (!error) {return false;}

    const dbError = error as DatabaseError;
    const errorMessage = dbError.message || String(error);
    const errorCode = dbError.code;

    // Retry on deadlock, timeout, or connection issues
    const retryableErrors = [
      'deadlock_detected',
      '40P01', // deadlock_detected
      '40P01', // deadlock_detected
      '55P03', // lock_not_available
      '57014', // query_canceled
      'connection',
      'timeout',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
    ];

    return retryableErrors.some(retryable =>
      errorMessage.toLowerCase().includes(retryable.toLowerCase()) ||
      errorCode === retryable,
    );
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(): Promise<{
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    waitingClients: number;
  }> {
    const pool = this.pool as PoolStats;

    return {
      activeConnections: pool.totalCount - pool.idleCount,
      idleConnections: pool.idleCount,
      totalConnections: pool.totalCount,
      waitingClients: pool.waitingCount || 0,
    };
  }
}

// Singleton instance
export const transactionManager = new TransactionManager();

// Convenience functions for common transaction patterns
export const withTransaction = <T = unknown>(
  callback: TransactionCallback<T>,
  options?: TransactionOptions,
): Promise<TransactionResult<T>> => transactionManager.executeTransaction(callback, options);

export const withReadTransaction = <T = unknown>(
  callback: TransactionCallback<T>,
  options?: TransactionOptions,
): Promise<TransactionResult<T>> => transactionManager.executeReadTransaction(callback, options);

export const withCriticalTransaction = <T = unknown>(
  callback: TransactionCallback<T>,
  options?: TransactionOptions,
): Promise<TransactionResult<T>> => transactionManager.executeCriticalTransaction(callback, options);

export const withBatchTransaction = <T = unknown>(
  operations: Array<{ name: string; operation: TransactionCallback<T> }>,
  options?: TransactionOptions,
): Promise<TransactionResult<T[]>> => transactionManager.executeBatchTransaction(operations, options);

// Example usage:
/*
// Simple transaction
const result = await withTransaction(async (client) => {
  const userResult = await client.query(
    'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
    ['user@example.com', 'John Doe']
  );

  const userId = userResult.rows[0].id;

  await client.query(
    'INSERT INTO user_profiles (user_id, bio) VALUES ($1, $2)',
    [userId, 'New user profile']
  );

  return { userId, email: 'user@example.com' };
});

// Critical transaction with retries
const criticalResult = await withCriticalTransaction(async (client) => {
  // Critical financial operation
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, accountId]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, targetAccountId]);

  return { success: true };
});
*/

import * as dotenv from 'dotenv';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { Pool } from 'pg';

import type { TypedQueryResult } from './database/types';

dotenv.config();

// Validate required environment variables
const validateDatabaseConfig = (): void => {
  const requiredVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required database environment variables: ${missingVars.join(', ')}`);
  }

  // Validate database port
  const port = parseInt(process.env.DB_PORT || '5432');
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid database port: ${process.env.DB_PORT}`);
  }
};

// Validate configuration before creating pool
validateDatabaseConfig();

const pool = new Pool({
  user: process.env.DB_USER!,
  host: process.env.DB_HOST!,
  database: process.env.DB_NAME!,
  password: process.env.DB_PASSWORD!,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Add connection pool configuration
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000'),
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process in production, just log the error
  if (process.env.NODE_ENV === 'development') {
    process.exit(-1);
  }
});

export const getClient = (): Promise<PoolClient> => pool.connect();
export const getPool = (): Pool => pool;
export const query = <T extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<T>> => pool.query<T>(text, params);

/**
 * Executes a SQL query and returns only rows that pass a runtime type guard.
 *
 * Runs the given `queryText` with `params`, applies `typeGuard` to each returned row,
 * and returns a TypedQueryResult containing the validated rows plus reconstructed field metadata.
 * Rows that do not satisfy the guard are omitted; when any are filtered out a warning is emitted.
 *
 * @param queryText - SQL query text to execute.
 * @param params - Parameters for the query.
 * @param typeGuard - Runtime predicate that validates whether a row is of type `T`.
 * @returns A Promise resolving to a TypedQueryResult whose `rows` are the subset that passed `typeGuard`.
 * @throws Rethrows any error thrown by the underlying query execution.
 */
export async function executeTypedQuery<T>(
  queryText: string,
  params: unknown[],
  typeGuard: (obj: unknown) => obj is T,
): Promise<TypedQueryResult<T>> {
  try {
    const result = await pool.query(queryText, params);

    // Validate each row with the type guard
    const validatedRows = result.rows.filter(typeGuard);

    if (validatedRows.length !== result.rows.length) {
      console.warn(`Type validation failed for ${result.rows.length - validatedRows.length} rows`);
    }

    return {
      rows: validatedRows,
      rowCount: validatedRows.length,
      command: result.command,
      oid: result.oid || 0,
      fields: result.fields.map(field => ({
        name: field.name,
        tableID: field.tableID,
        columnID: field.columnID,
        dataTypeID: field.dataTypeID,
        dataTypeSize: field.dataTypeSize,
        dataTypeModifier: field.dataTypeModifier,
        format: field.format,
      })),
    };
  } catch (error) {
    console.error('Type-safe query execution failed:', error);
    throw error;
  }
}

/**
 * Executes a function within a database transaction
 * Provides automatic BEGIN/COMMIT/ROLLBACK with proper error handling
 * @param fn Function to execute within the transaction
 * @returns Promise<T> The result of the function execution
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;

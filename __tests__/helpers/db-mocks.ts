import type { QueryResult, QueryResultRow } from 'pg';

/**
 * Creates a mock QueryResult object for testing database queries
 */
export function createMockQueryResult<T extends QueryResultRow>(
  rows: T[],
  command = 'SELECT'
): QueryResult<T> {
  return {
    rows,
    rowCount: rows.length,
    command,
    oid: 0,
    fields: [],
  };
}

/**
 * Creates a mock empty QueryResult object
 */
export function createEmptyQueryResult<T extends QueryResultRow>(
  command = 'SELECT'
): QueryResult<T> {
  return createMockQueryResult<T>([], command);
}
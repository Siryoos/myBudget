import { query, QueryResult } from '@/lib/database';
import { z } from 'zod';

// Base service class with common functionality
export abstract class BaseService {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // Generic find by ID
  async findById(id: string): Promise<any | null> {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  // Generic find all with optional filtering
  async findAll(filters: Record<string, any> = {}, options: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<any[]> {
    let queryString = `SELECT * FROM ${this.tableName}`;
    const values: any[] = [];
    const conditions: string[] = [];

    // Build WHERE clause from filters
    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = $${index + 1}`);
        values.push(value);
      }
    });

    if (conditions.length > 0) {
      queryString += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ordering
    if (options.orderBy) {
      queryString += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    // Add pagination
    if (options.limit) {
      queryString += ` LIMIT $${values.length + 1}`;
      values.push(options.limit);
    }

    if (options.offset) {
      queryString += ` OFFSET $${values.length + 1}`;
      values.push(options.offset);
    }

    const result = await query(queryString, values);
    return result.rows;
  }

  // Generic count with filters
  async count(filters: Record<string, any> = {}): Promise<number> {
    let queryString = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const values: any[] = [];
    const conditions: string[] = [];

    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = $${index + 1}`);
        values.push(value);
      }
    });

    if (conditions.length > 0) {
      queryString += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await query(queryString, values);
    return parseInt(result.rows[0].count);
  }

  // Generic delete by ID
  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
      [id]
    );

    return result.rows.length > 0;
  }

  // Validate data against schema
  protected validateData<T>(schema: z.ZodSchema<T>, data: any): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }
      throw error;
    }
  }

  // Execute transaction
  protected async executeTransaction<T>(
    callback: () => Promise<T>
  ): Promise<T> {
    try {
      await query('BEGIN');
      const result = await callback();
      await query('COMMIT');
      return result;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
}

// Pagination helper
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error classes
export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id ${id} not found` : `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

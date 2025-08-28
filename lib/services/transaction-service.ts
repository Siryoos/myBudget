import { query } from '@/lib/database';
import type { TransactionCreate, TransactionUpdate, TransactionFilter } from '@/lib/validation-schemas';
import { transactionSchemas } from '@/lib/validation-schemas';
import type { Transaction } from '@/types';

import { BaseService, NotFoundError, ValidationError } from './base-service';
import type { PaginatedResult, PaginationOptions } from './base-service';

export class TransactionService extends BaseService {
  constructor() {
    super('transactions');
  }

  async create(userId: string, data: TransactionCreate): Promise<Transaction> {
    // Validate input data
    const validatedData = this.validateData(transactionSchemas.create, data);

    const result = await query(`
      INSERT INTO transactions (
        user_id, budget_category_id, amount, description, category,
        date, type, account, tags, is_recurring, recurring_frequency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      userId,
      validatedData.budgetCategoryId || null,
      validatedData.amount,
      validatedData.description,
      validatedData.category,
      validatedData.date,
      validatedData.type,
      validatedData.account || null,
      validatedData.tags || null,
      validatedData.isRecurring || false,
      validatedData.recurringFrequency || null,
    ]);

    return this.mapDbTransactionToTransaction(result.rows[0]);
  }

  async findById(id: string): Promise<Transaction | null> {
    const transaction = await super.findById(id);
    return transaction ? this.mapDbTransactionToTransaction(transaction) : null;
  }

  async findByUserId(
    userId: string,
    filters: TransactionFilter = {},
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Transaction>> {
    // Validate filters
    const validatedFilters = this.validateData(transactionSchemas.filter, filters);

    let queryString = `
      SELECT * FROM transactions
      WHERE user_id = $1
    `;
    const values: any[] = [userId];
    let paramCount = 2;

    // Build WHERE clause from filters
    if (validatedFilters.category) {
      queryString += ` AND category = $${paramCount}`;
      values.push(validatedFilters.category);
      paramCount++;
    }

    if (validatedFilters.type) {
      queryString += ` AND type = $${paramCount}`;
      values.push(validatedFilters.type);
      paramCount++;
    }

    if (validatedFilters.startDate) {
      queryString += ` AND date >= $${paramCount}`;
      values.push(validatedFilters.startDate);
      paramCount++;
    }

    if (validatedFilters.endDate) {
      queryString += ` AND date <= $${paramCount}`;
      values.push(validatedFilters.endDate);
      paramCount++;
    }

    if (validatedFilters.search) {
      queryString += ` AND (description ILIKE $${paramCount} OR category ILIKE $${paramCount})`;
      values.push(`%${validatedFilters.search}%`);
      paramCount++;
    }

    if (validatedFilters.minAmount !== undefined) {
      queryString += ` AND ABS(amount) >= $${paramCount}`;
      values.push(validatedFilters.minAmount);
      paramCount++;
    }

    if (validatedFilters.maxAmount !== undefined) {
      queryString += ` AND ABS(amount) <= $${paramCount}`;
      values.push(validatedFilters.maxAmount);
      paramCount++;
    }

    // Add ordering
    queryString += ' ORDER BY date DESC, created_at DESC';

    // Get total count
    const countQuery = queryString.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    queryString += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    // Execute query
    const result = await query(queryString, values);
    const transactions = result.rows.map(row => this.mapDbTransactionToTransaction(row));

    const totalPages = Math.ceil(total / limit);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async update(id: string, data: TransactionUpdate): Promise<Transaction> {
    // Validate input data
    const validatedData = this.validateData(transactionSchemas.update, data);

    // Check if transaction exists
    const existingTransaction = await this.findById(id);
    if (!existingTransaction) {
      throw new NotFoundError('Transaction', id);
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${dbKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return existingTransaction;
    }

    const queryString = `
      UPDATE transactions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(queryString, values);
    return this.mapDbTransactionToTransaction(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    // Check if transaction exists
    const transaction = await this.findById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction', id);
    }

    return await super.delete(id);
  }

  async getSummary(userId: string, startDate?: string, endDate?: string): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    transactionCount: number;
  }> {
    let queryString = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as total_expenses,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE user_id = $1
    `;
    const values: any[] = [userId];
    let paramCount = 2;

    if (startDate) {
      queryString += ` AND date >= $${paramCount}`;
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryString += ` AND date <= $${paramCount}`;
      values.push(endDate);
      paramCount++;
    }

    const result = await query(queryString, values);
    const row = result.rows[0];

    const totalIncome = parseFloat(row.total_income);
    const totalExpenses = parseFloat(row.total_expenses);

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      transactionCount: parseInt(row.transaction_count),
    };
  }

  async getCategorySummary(userId: string, startDate?: string, endDate?: string): Promise<{
    category: string;
    totalIncome: number;
    totalExpenses: number;
    transactionCount: number;
  }[]> {
    let queryString = `
      SELECT
        category,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as total_expenses,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE user_id = $1
    `;
    const values: any[] = [userId];
    let paramCount = 2;

    if (startDate) {
      queryString += ` AND date >= $${paramCount}`;
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryString += ` AND date <= $${paramCount}`;
      values.push(endDate);
      paramCount++;
    }

    queryString += `
      GROUP BY category
      ORDER BY total_expenses DESC, total_income DESC
    `;

    const result = await query(queryString, values);
    return result.rows.map(row => ({
      category: row.category,
      totalIncome: parseFloat(row.total_income),
      totalExpenses: parseFloat(row.total_expenses),
      transactionCount: parseInt(row.transaction_count),
    }));
  }

  private mapDbTransactionToTransaction(dbTransaction: any): Transaction {
    return {
      id: dbTransaction.id,
      userId: dbTransaction.user_id,
      budgetCategoryId: dbTransaction.budget_category_id,
      amount: parseFloat(dbTransaction.amount),
      description: dbTransaction.description,
      category: dbTransaction.category,
      date: dbTransaction.date.toISOString().split('T')[0],
      type: dbTransaction.type,
      account: dbTransaction.account,
      tags: dbTransaction.tags,
      isRecurring: dbTransaction.is_recurring,
      recurringFrequency: dbTransaction.recurring_frequency,
      createdAt: dbTransaction.created_at.toISOString(),
      updatedAt: dbTransaction.updated_at.toISOString(),
    };
  }
}

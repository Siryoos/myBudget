import { query } from '@/lib/database';
import type { BudgetCreate, BudgetUpdate, BudgetCategoryCreate, BudgetCategoryUpdate } from '@/lib/validation-schemas';
import { budgetSchemas, budgetCategorySchemas } from '@/lib/validation-schemas';
import type { Budget, BudgetCategory } from '@/types/api';

import { BaseService, NotFoundError, ValidationError, ConflictError } from './base-service';

export interface BudgetWithCategories extends Budget {
  categories: BudgetCategory[];
}

export class BudgetService extends BaseService {
  constructor() {
    super('budgets');
  }

  async create(userId: string, data: BudgetCreate): Promise<BudgetWithCategories> {
    // Validate input data
    const validatedData = this.validateData(budgetSchemas.create, data);

    // Check if budget name already exists for this user
    const existingBudget = await this.findByUserIdAndName(userId, validatedData.name);
    if (existingBudget) {
      throw new ConflictError('Budget with this name already exists');
    }

    // Validate total allocation matches budget total
    const totalAllocated = validatedData.categories.reduce((sum, cat) => sum + cat.allocated, 0);
    const EPSILON = 0.01;
    if (Math.abs(totalAllocated - validatedData.totalIncome) > EPSILON) {
      throw new ValidationError('Total category allocation must equal budget total income');
    }

    return this.executeTransaction(async () => {
      // Create budget
      const budgetResult = await query(`
        INSERT INTO budgets (
          user_id, name, method, total_income, period, start_date, end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        userId,
        validatedData.name,
        validatedData.method,
        validatedData.totalIncome,
        validatedData.period,
        validatedData.startDate,
        validatedData.endDate,
      ]);

      const budget = budgetResult.rows[0] as {
        id: string;
        user_id: string;
        name: string;
        method: string;
        total_income: number;
        period: string;
        start_date: string;
        end_date: string;
        created_at: Date;
        updated_at: Date;
        is_active: boolean;
      };

      // Create budget categories
      const categories: BudgetCategory[] = [];
      for (const categoryData of validatedData.categories) {
        const categoryResult = await query(`
          INSERT INTO budget_categories (
            budget_id, name, allocated, color, icon, is_essential
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          budget.id as string,
          categoryData.name,
          categoryData.allocated,
          categoryData.color,
          categoryData.icon || null,
          categoryData.isEssential || false,
        ]);

        categories.push(this.mapDbCategoryToCategory(categoryResult.rows[0]));
      }

      return {
        ...this.mapDbBudgetToBudget(budget),
        categories,
      };
    });
  }

  async findById<T = BudgetWithCategories>(id: string): Promise<T | null> {
    const budget = await super.findById<{
      id: string;
      user_id: string;
      name: string;
      method: string;
      total_income: number;
      period: string;
      start_date: string;
      end_date: string;
      created_at: Date;
      updated_at: Date;
      is_active: boolean;
    }>(id);
    if (!budget) {
      return null;
    }

    const categories = await this.getBudgetCategories(id);
    const result = {
      ...this.mapDbBudgetToBudget(budget),
      categories,
    } as unknown as T;
    return result;
  }

  async findByUserId(userId: string): Promise<BudgetWithCategories[]> {
    const budgets = await this.findAll<{
      id: string;
      user_id: string;
      name: string;
      method: string;
      total_income: number;
      period: string;
      start_date: string;
      end_date: string;
      created_at: Date;
      updated_at: Date;
      is_active: boolean;
    }>({ user_id: userId }, {
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });

    const result: BudgetWithCategories[] = [];
    for (const budget of budgets) {
      const categories = await this.getBudgetCategories(budget.id);
      result.push({
        ...this.mapDbBudgetToBudget(budget),
        categories,
      });
    }

    return result;
  }

  async findByUserIdAndName(userId: string, name: string): Promise<BudgetWithCategories | null> {
    const budgets = await this.findAll<{
      id: string;
      user_id: string;
      name: string;
      method: string;
      total_income: number;
      period: string;
      start_date: string;
      end_date: string;
      created_at: Date;
      updated_at: Date;
      is_active: boolean;
    }>({
      user_id: userId,
      name,
    });

    if (budgets.length === 0) {
      return null;
    }

    const budget = budgets[0];
    const categories = await this.getBudgetCategories(budget.id);

    return {
      ...this.mapDbBudgetToBudget(budget),
      categories,
    };
  }

  async update(id: string, data: BudgetUpdate): Promise<BudgetWithCategories> {
    // Validate input data
    const validatedData = this.validateData(budgetSchemas.update, data);

    // Check if budget exists
    const existingBudget = await this.findById(id);
    if (!existingBudget) {
      throw new NotFoundError('Budget', id);
    }

    // Check name uniqueness if name is being updated
    if (validatedData.name && validatedData.name !== existingBudget.name) {
      const budgetWithName = await this.findByUserIdAndName(existingBudget.userId, validatedData.name);
      if (budgetWithName) {
        throw new ConflictError('Budget with this name already exists');
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
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
      return existingBudget;
    }

    const queryString = `
      UPDATE budgets
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(queryString, values);
    const updatedBudget = result.rows[0] as {
      id: string;
      user_id: string;
      name: string;
      method: string;
      total_income: number;
      period: string;
      start_date: string;
      end_date: string;
      created_at: Date;
      updated_at: Date;
      is_active: boolean;
    };
    const categories = await this.getBudgetCategories(id);

    return {
      ...this.mapDbBudgetToBudget(updatedBudget),
      categories,
    };
  }

  async delete(id: string): Promise<boolean> {
    // Check if budget exists
    const budget = await this.findById(id);
    if (!budget) {
      throw new NotFoundError('Budget', id);
    }

    // Delete budget (cascade will handle categories and transactions)
    return super.delete(id);
  }

  // Budget Category methods
  async createCategory(data: BudgetCategoryCreate): Promise<BudgetCategory> {
    // Validate input data
    const validatedData = this.validateData(budgetCategorySchemas.create, data);

    // Check if budget exists
    const budget = await this.findById(validatedData.budgetId);
    if (!budget) {
      throw new NotFoundError('Budget', validatedData.budgetId);
    }

    // Check if category name already exists in this budget
    const existingCategory = await this.findCategoryByBudgetIdAndName(
      validatedData.budgetId,
      validatedData.name,
    );
    if (existingCategory) {
      throw new ConflictError('Category with this name already exists in this budget');
    }

    const result = await query(`
      INSERT INTO budget_categories (
        budget_id, name, allocated, color, icon, is_essential
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      validatedData.budgetId,
      validatedData.name,
      validatedData.allocated,
      validatedData.color,
      validatedData.icon || null,
      validatedData.isEssential || false,
    ]);

    return this.mapDbCategoryToCategory(result.rows[0]);
  }

  async updateCategory(id: string, data: BudgetCategoryUpdate): Promise<BudgetCategory> {
    // Validate input data
    const validatedData = this.validateData(budgetCategorySchemas.update, data);

    // Check if category exists
    const existingCategory = await this.findCategoryById(id);
    if (!existingCategory) {
      throw new NotFoundError('Budget category', id);
    }

    // Check name uniqueness if name is being updated
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      // Get the budget_id from the database record
      const categoryRecord = await query(
        'SELECT budget_id FROM budget_categories WHERE id = $1',
        [id],
      );
      const budgetId = categoryRecord.rows[0]?.budget_id;

      const categoryWithName = await this.findCategoryByBudgetIdAndName(
        budgetId,
        validatedData.name,
      );
      if (categoryWithName) {
        throw new ConflictError('Category with this name already exists in this budget');
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
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
      return existingCategory;
    }

    const queryString = `
      UPDATE budget_categories
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(queryString, values);
    return this.mapDbCategoryToCategory(result.rows[0]);
  }

  async deleteCategory(id: string): Promise<boolean> {
    // Check if category exists
    const category = await this.findCategoryById(id);
    if (!category) {
      throw new NotFoundError('Budget category', id);
    }

    // Delete category
    const result = await query(
      'DELETE FROM budget_categories WHERE id = $1 RETURNING id',
      [id],
    );

    return result.rows.length > 0;
  }

  private async getBudgetCategories(budgetId: string): Promise<BudgetCategory[]> {
    const result = await query(
      'SELECT * FROM budget_categories WHERE budget_id = $1 ORDER BY name',
      [budgetId],
    );

    return result.rows.map(row => this.mapDbCategoryToCategory(row));
  }

  private async findCategoryById(id: string): Promise<BudgetCategory | null> {
    const result = await query(
      'SELECT * FROM budget_categories WHERE id = $1',
      [id],
    );

    return result.rows.length > 0 ? this.mapDbCategoryToCategory(result.rows[0]) : null;
  }

  private async findCategoryByBudgetIdAndName(budgetId: string, name: string): Promise<BudgetCategory | null> {
    const result = await query(
      'SELECT * FROM budget_categories WHERE budget_id = $1 AND name = $2',
      [budgetId, name],
    );

    return result.rows.length > 0 ? this.mapDbCategoryToCategory(result.rows[0]) : null;
  }

  private mapDbBudgetToBudget(dbBudget: {
    id: string;
    user_id: string;
    name: string;
    method: string;
    total_income: number | string;
    period: string;
    start_date: Date | string;
    end_date: Date | string;
    created_at: Date | string;
    updated_at: Date | string;
    is_active?: boolean;
  }): Budget {
    return {
      id: dbBudget.id,
      userId: dbBudget.user_id,
      name: dbBudget.name,
      method: dbBudget.method as Budget['method'],
      totalIncome: Number(dbBudget.total_income),
      period: dbBudget.period as Budget['period'],
      startDate: new Date(dbBudget.start_date).toISOString().split('T')[0],
      endDate: new Date(dbBudget.end_date).toISOString().split('T')[0],
      createdAt: new Date(dbBudget.created_at).toISOString(),
      updatedAt: new Date(dbBudget.updated_at).toISOString(),
      categories: [], // Categories are loaded separately
      isActive: dbBudget.is_active || false,
    };
  }

  private mapDbCategoryToCategory(dbCategory: {
    id: string;
    name: string;
    allocated: number | string;
    spent: number | string;
    color: string;
    icon: string | null;
    is_essential: boolean;
  }): BudgetCategory {
    return {
      id: dbCategory.id,
      // budgetId is not part of BudgetCategory type
      name: dbCategory.name,
      allocated: Number(dbCategory.allocated),
      spent: Number(dbCategory.spent),
      remaining: Number(dbCategory.allocated) - Number(dbCategory.spent),
      color: dbCategory.color,
      icon: dbCategory.icon ?? undefined,
      isEssential: dbCategory.is_essential,
      // timestamps are not part of BudgetCategory type
    };
  }
}

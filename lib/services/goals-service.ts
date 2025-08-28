import { query } from '@/lib/database';
import type { SavingsGoalCreate, SavingsGoalUpdate, MilestoneCreate, MilestoneUpdate, AutomationRuleCreate, AutomationRuleUpdate } from '@/lib/validation-schemas';
import { savingsGoalSchemas, milestoneSchemas, automationRuleSchemas } from '@/lib/validation-schemas';
import type { SavingsGoal, Milestone, AutomationRule } from '@/types';

import { BaseService, NotFoundError, ValidationError } from './base-service';

export interface SavingsGoalWithDetails extends SavingsGoal {
  milestones: Milestone[];
  automationRules: AutomationRule[];
}

export class GoalsService extends BaseService {
  constructor() {
    super('savings_goals');
  }

  async create(userId: string, data: SavingsGoalCreate): Promise<SavingsGoalWithDetails> {
    // Validate input data
    const validatedData = this.validateData(savingsGoalSchemas.create, data);

    const result = await query(`
      INSERT INTO savings_goals (
        user_id, name, description, target_amount, target_date, category,
        priority, icon, color, photo_url, framing_type, loss_avoidance_description, achievement_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      userId,
      validatedData.name,
      validatedData.description || null,
      validatedData.targetAmount,
      validatedData.targetDate,
      validatedData.category,
      validatedData.priority,
      validatedData.icon || null,
      validatedData.color || null,
      validatedData.photoUrl || null,
      validatedData.framingType || null,
      validatedData.lossAvoidanceDescription || null,
      validatedData.achievementDescription || null,
    ]);

    const goal = this.mapDbGoalToGoal(result.rows[0] as {
      id: string;
      user_id: string;
      name: string;
      description?: string;
      target_amount: number;
      current_amount: number;
      target_date: string;
      category: string;
      priority: string;
      is_active: boolean;
      icon?: string;
      color?: string;
      photo_url?: string;
      framing_type?: string;
      loss_avoidance_description?: string;
      achievement_description?: string;
      created_at: Date;
      updated_at: Date;
    });
    return {
      ...goal,
      milestones: [],
      automationRules: [],
    };
  }

  async findById(id: string): Promise<SavingsGoalWithDetails | null> {
    const goal = await super.findById<{
      id: string;
      user_id: string;
      name: string;
      description?: string;
      target_amount: number;
      current_amount: number;
      target_date: string;
      category: string;
      priority: string;
      is_active: boolean;
      icon?: string;
      color?: string;
      photo_url?: string;
      framing_type?: string;
      loss_avoidance_description?: string;
      achievement_description?: string;
      created_at: Date;
      updated_at: Date;
    }>(id);
    if (!goal) {
      return null;
    }

    const [milestones, automationRules] = await Promise.all([
      this.getGoalMilestones(id),
      this.getGoalAutomationRules(id),
    ]);

    return {
      ...this.mapDbGoalToGoal(goal),
      milestones,
      automationRules,
    };
  }

  async findByUserId(userId: string, priority?: 'low' | 'medium' | 'high'): Promise<SavingsGoalWithDetails[]> {
    let queryString = 'SELECT * FROM savings_goals WHERE user_id = $1';
    const values: unknown[] = [userId];
    let paramCount = 2;

    if (priority) {
      queryString += ` AND priority = $${paramCount}`;
      values.push(priority);
      paramCount++;
    }

    queryString += ' ORDER BY created_at DESC';

    const result = await query(queryString, values);
    const goals: SavingsGoalWithDetails[] = [];

    for (const goal of result.rows) {
      const [milestones, automationRules] = await Promise.all([
        this.getGoalMilestones(goal.id),
        this.getGoalAutomationRules(goal.id),
      ]);

      goals.push({
        ...this.mapDbGoalToGoal(goal),
        milestones,
        automationRules,
      });
    }

    return goals;
  }

  async update(id: string, data: SavingsGoalUpdate): Promise<SavingsGoalWithDetails> {
    // Validate input data
    const validatedData = this.validateData(savingsGoalSchemas.update, data);

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
      // Only fetch when no updates needed
      const existingGoal = await this.findById(id);
      if (!existingGoal) {
        throw new NotFoundError('Savings goal', id);
      }
      return existingGoal;
    }

    const queryString = `
      UPDATE savings_goals
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(queryString, values);
    if (!result.rows.length) {
      throw new NotFoundError('Savings goal', id);
    }
    const updatedGoal = result.rows[0] as {
      id: string;
      user_id: string;
      name: string;
      description?: string;
      target_amount: number;
      current_amount: number;
      target_date: string;
      category: string;
      priority: string;
      is_active: boolean;
      icon?: string;
      color?: string;
      photo_url?: string;
      framing_type?: string;
      loss_avoidance_description?: string;
      achievement_description?: string;
      created_at: Date;
      updated_at: Date;
    };

    const [milestones, automationRules] = await Promise.all([
      this.getGoalMilestones(id),
      this.getGoalAutomationRules(id),
    ]);

    return {
      ...this.mapDbGoalToGoal(updatedGoal),
      milestones,
      automationRules,
    };
  }

  async delete(id: string): Promise<boolean> {
    // Check if goal exists
    const goal = await this.findById(id);
    if (!goal) {
      throw new NotFoundError('Savings goal', id);
    }

    return super.delete(id);
  }

  async contribute(goalId: string, amount: number): Promise<SavingsGoal> {
    // Validate amount
    if (amount <= 0) {
      throw new ValidationError('Contribution amount must be positive');
    }

    // Check if goal exists
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new NotFoundError('Savings goal', goalId);
    }

    // Update current amount
    const result = await query(`
      UPDATE savings_goals
      SET current_amount = current_amount + $1
      WHERE id = $2
      RETURNING *
    `, [amount, goalId]);

    return this.mapDbGoalToGoal(result.rows[0]);
  }

  // Milestone methods
  async createMilestone(goalId: string, data: MilestoneCreate): Promise<Milestone> {
    // Validate input data
    const validatedData = this.validateData(milestoneSchemas.create, data);

    // Check if goal exists
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new NotFoundError('Savings goal', goalId);
    }

    const result = await query(`
      INSERT INTO milestones (goal_id, amount, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [goalId, validatedData.amount, validatedData.description]);

    return this.mapDbMilestoneToMilestone(result.rows[0]);
  }

  async updateMilestone(goalId: string, milestoneId: string, data: MilestoneUpdate): Promise<Milestone> {
    // Validate input data
    const validatedData = this.validateData(milestoneSchemas.update, data);

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
      // Only fetch when no updates needed
      const res = await query('SELECT * FROM milestones WHERE id = $1 AND goal_id = $2', [milestoneId, goalId]);
      if (!res.rows.length) {
        throw new NotFoundError('Milestone', milestoneId);
      }
      return this.mapDbMilestoneToMilestone(res.rows[0]);
    }

    const queryString = `
      UPDATE milestones
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND goal_id = $${paramCount + 1}
      RETURNING *
    `;
    values.push(milestoneId, goalId);

    const result = await query(queryString, values);
    if (!result.rows.length) {
      throw new NotFoundError('Milestone', milestoneId);
    }
    return this.mapDbMilestoneToMilestone(result.rows[0]);
  }

  async completeMilestone(goalId: string, milestoneId: string): Promise<Milestone> {
    // Atomic completion - success path is single query
    const result = await query(`
      UPDATE milestones
      SET is_completed = true, completed_date = CURRENT_DATE
      WHERE id = $1 AND goal_id = $2 AND is_completed = false
      RETURNING *
    `, [milestoneId, goalId]);

    if (!result.rows.length) {
      // Determine if milestone doesn't exist or is already completed
      const check = await query(
        'SELECT is_completed FROM milestones WHERE id = $1 AND goal_id = $2',
        [milestoneId, goalId],
      );
      if (!check.rows.length) {
        throw new NotFoundError('Milestone', milestoneId);
      }
      throw new ValidationError('Milestone is already completed');
    }

    return this.mapDbMilestoneToMilestone(result.rows[0]);
  }

  async deleteMilestone(goalId: string, milestoneId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM milestones WHERE id = $1 AND goal_id = $2 RETURNING id',
      [milestoneId, goalId],
    );

    if (!result.rows.length) {
      throw new NotFoundError('Milestone', milestoneId);
    }
    return true;
  }

  // Automation rule methods
  async createAutomationRule(goalId: string, data: AutomationRuleCreate): Promise<AutomationRule> {
    // Validate input data
    const validatedData = this.validateData(automationRuleSchemas.create, data);

    // Check if goal exists
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new NotFoundError('Savings goal', goalId);
    }

    const result = await query(`
      INSERT INTO automation_rules (goal_id, type, amount, percentage, frequency, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      goalId,
      validatedData.type,
      validatedData.type === 'fixed_amount' ? validatedData.amount : null,
      validatedData.type === 'percentage' ? validatedData.percentage : null,
      validatedData.frequency,
      validatedData.isActive ?? true,
    ]);

    return this.mapDbAutomationRuleToAutomationRule(result.rows[0]);
  }

  async updateAutomationRule(goalId: string, ruleId: string, data: AutomationRuleUpdate): Promise<AutomationRule> {
    // Validate input data
    const validatedData = this.validateData(automationRuleSchemas.update, data);

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
      // Only fetch when no updates needed
      const ruleData = await query(
        'SELECT * FROM automation_rules WHERE id = $1 AND goal_id = $2',
        [ruleId, goalId],
      );
      if (!ruleData.rows.length) {
        throw new NotFoundError('Automation rule', ruleId);
      }
      return this.mapDbAutomationRuleToAutomationRule(ruleData.rows[0]);
    }

    const queryString = `
      UPDATE automation_rules
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND goal_id = $${paramCount + 1}
      RETURNING *
    `;
    values.push(ruleId, goalId);

    const result = await query(queryString, values);
    if (!result.rows.length) {
      throw new NotFoundError('Automation rule', ruleId);
    }
    return this.mapDbAutomationRuleToAutomationRule(result.rows[0]);
  }

  async deleteAutomationRule(goalId: string, ruleId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM automation_rules WHERE id = $1 AND goal_id = $2 RETURNING id',
      [ruleId, goalId],
    );

    if (!result.rows.length) {
      throw new NotFoundError('Automation rule', ruleId);
    }
    return true;
  }

  private async getGoalMilestones(goalId: string): Promise<Milestone[]> {
    const result = await query(
      'SELECT * FROM milestones WHERE goal_id = $1 ORDER BY amount',
      [goalId],
    );

    return result.rows.map(row => this.mapDbMilestoneToMilestone(row));
  }

  private async getGoalAutomationRules(goalId: string): Promise<AutomationRule[]> {
    const result = await query(
      'SELECT * FROM automation_rules WHERE goal_id = $1 ORDER BY created_at',
      [goalId],
    );

    return result.rows.map(row => this.mapDbAutomationRuleToAutomationRule(row));
  }

  private async findMilestoneById(id: string): Promise<Milestone | null> {
    const result = await query('SELECT * FROM milestones WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.mapDbMilestoneToMilestone(result.rows[0]) : null;
  }

  private async findAutomationRuleById(id: string): Promise<AutomationRule | null> {
    const result = await query('SELECT * FROM automation_rules WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.mapDbAutomationRuleToAutomationRule(result.rows[0]) : null;
  }

  private mapDbGoalToGoal(dbGoal: {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    target_amount: number | string | null;
    current_amount: number | string | null;
    target_date: Date | string;
    category: string;
    priority: string;
    is_active: boolean;
    icon?: string;
    color?: string;
    photo_url?: string;
    framing_type?: string;
    loss_avoidance_description?: string;
    achievement_description?: string;
    created_at: Date | string;
    updated_at: Date | string;
  }): SavingsGoal {
    return {
      id: dbGoal.id,
      // userId is not part of SavingsGoal type
      name: dbGoal.name,
      description: dbGoal.description,
      targetAmount: dbGoal.target_amount === null || dbGoal.target_amount === undefined ? 0 : Number(dbGoal.target_amount),
      currentAmount: dbGoal.current_amount === null || dbGoal.current_amount === undefined ? 0 : Number(dbGoal.current_amount),
      targetDate: typeof dbGoal.target_date === 'string'
        ? dbGoal.target_date
        : dbGoal.target_date.toISOString().slice(0, 10),
      category: dbGoal.category,
      priority: dbGoal.priority,
      isActive: dbGoal.is_active,
      icon: dbGoal.icon,
      color: dbGoal.color,
      photoUrl: dbGoal.photo_url,
      framingType: dbGoal.framing_type,
      lossAvoidanceDescription: dbGoal.loss_avoidance_description,
      achievementDescription: dbGoal.achievement_description,
      createdAt: typeof dbGoal.created_at === 'string' ? dbGoal.created_at : dbGoal.created_at.toISOString(),
      updatedAt: typeof dbGoal.updated_at === 'string' ? dbGoal.updated_at : dbGoal.updated_at.toISOString(),
    };
  }

  private mapDbMilestoneToMilestone(dbMilestone: {
    id: string;
    goal_id: string;
    amount: number | string | null;
    description?: string;
    is_completed: boolean;
    completed_date?: Date | string | null;
  }): Milestone {
    return {
      id: dbMilestone.id,
      // goalId is not part of Milestone type
      amount: dbMilestone.amount === null || dbMilestone.amount === undefined ? 0 : Number(dbMilestone.amount),
      description: dbMilestone.description,
      isCompleted: dbMilestone.is_completed,
      completedDate: dbMilestone.completed_date ? new Date(dbMilestone.completed_date) : undefined,
      // createdAt is not part of Milestone type
    };
  }

  private mapDbAutomationRuleToAutomationRule(dbRule: {
    id: string;
    goal_id: string;
    type: string;
    frequency: string;
    amount?: number | string | null;
    percentage?: number | string | null;
    is_active: boolean;
  }): AutomationRule {
    const base = {
      id: dbRule.id,
      frequency: dbRule.frequency,
      isActive: dbRule.is_active,
    };

    switch (dbRule.type) {
      case 'fixed':
        return { ...base, type: 'fixed', amount: dbRule.amount === null || dbRule.amount === undefined ? 0 : Number(dbRule.amount) };
      case 'percentage':
        return { ...base, type: 'percentage', percentage: dbRule.percentage === null || dbRule.percentage === undefined ? 0 : Number(dbRule.percentage) };
      case 'round-up':
        return { ...base, type: 'round-up' };
      case 'remainder':
        return { ...base, type: 'remainder' };
      default:
        throw new Error(`Unknown automation rule type: ${dbRule.type}`);
    }
  }
}

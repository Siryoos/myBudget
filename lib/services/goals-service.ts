import { query } from '@/lib/database';
import { BaseService, NotFoundError, ValidationError } from './base-service';
import { SavingsGoalCreate, SavingsGoalUpdate, MilestoneCreate, MilestoneUpdate, AutomationRuleCreate, AutomationRuleUpdate, savingsGoalSchemas, milestoneSchemas, automationRuleSchemas } from '@/lib/validation-schemas';
import type { SavingsGoal, Milestone, AutomationRule } from '@/types';

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

    const goal = this.mapDbGoalToGoal(result.rows[0]);
    return {
      ...goal,
      milestones: [],
      automationRules: []
    };
  }

  async findById(id: string): Promise<SavingsGoalWithDetails | null> {
    const goal = await super.findById(id);
    if (!goal) {
      return null;
    }

    const [milestones, automationRules] = await Promise.all([
      this.getGoalMilestones(id),
      this.getGoalAutomationRules(id)
    ]);

    return {
      ...this.mapDbGoalToGoal(goal),
      milestones,
      automationRules
    };
  }

  async findByUserId(userId: string, priority?: 'low' | 'medium' | 'high'): Promise<SavingsGoalWithDetails[]> {
    let queryString = 'SELECT * FROM savings_goals WHERE user_id = $1';
    const values: any[] = [userId];
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
        this.getGoalAutomationRules(goal.id)
      ]);

      goals.push({
        ...this.mapDbGoalToGoal(goal),
        milestones,
        automationRules
      });
    }

    return goals;
  }

  async update(id: string, data: SavingsGoalUpdate): Promise<SavingsGoalWithDetails> {
    // Validate input data
    const validatedData = this.validateData(savingsGoalSchemas.update, data);

    // Check if goal exists
    const existingGoal = await this.findById(id);
    if (!existingGoal) {
      throw new NotFoundError('Savings goal', id);
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
    const updatedGoal = result.rows[0];

    const [milestones, automationRules] = await Promise.all([
      this.getGoalMilestones(id),
      this.getGoalAutomationRules(id)
    ]);

    return {
      ...this.mapDbGoalToGoal(updatedGoal),
      milestones,
      automationRules
    };
  }

  async delete(id: string): Promise<boolean> {
    // Check if goal exists
    const goal = await this.findById(id);
    if (!goal) {
      throw new NotFoundError('Savings goal', id);
    }

    return await super.delete(id);
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

    // Check if milestone exists and belongs to goal
    const milestone = await this.findMilestoneById(milestoneId);
    if (!milestone || milestone.goalId !== goalId) {
      throw new NotFoundError('Milestone', milestoneId);
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
      return milestone;
    }

    const queryString = `
      UPDATE milestones
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(milestoneId);

    const result = await query(queryString, values);
    return this.mapDbMilestoneToMilestone(result.rows[0]);
  }

  async completeMilestone(goalId: string, milestoneId: string): Promise<Milestone> {
    // Check if milestone exists and belongs to goal
    const milestone = await this.findMilestoneById(milestoneId);
    if (!milestone || milestone.goalId !== goalId) {
      throw new NotFoundError('Milestone', milestoneId);
    }

    if (milestone.isCompleted) {
      throw new ValidationError('Milestone is already completed');
    }

    const result = await query(`
      UPDATE milestones
      SET is_completed = true, completed_date = CURRENT_DATE
      WHERE id = $1
      RETURNING *
    `, [milestoneId]);

    return this.mapDbMilestoneToMilestone(result.rows[0]);
  }

  async deleteMilestone(goalId: string, milestoneId: string): Promise<boolean> {
    // Check if milestone exists and belongs to goal
    const milestone = await this.findMilestoneById(milestoneId);
    if (!milestone || milestone.goalId !== goalId) {
      throw new NotFoundError('Milestone', milestoneId);
    }

    const result = await query(
      'DELETE FROM milestones WHERE id = $1 RETURNING id',
      [milestoneId]
    );

    return result.rows.length > 0;
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
      validatedData.amount || null,
      validatedData.percentage || null,
      validatedData.frequency,
      validatedData.isActive || true
    ]);

    return this.mapDbAutomationRuleToAutomationRule(result.rows[0]);
  }

  async updateAutomationRule(goalId: string, ruleId: string, data: AutomationRuleUpdate): Promise<AutomationRule> {
    // Validate input data
    const validatedData = this.validateData(automationRuleSchemas.update, data);

    // Check if rule exists and belongs to goal
    const rule = await this.findAutomationRuleById(ruleId);
    if (!rule || rule.goalId !== goalId) {
      throw new NotFoundError('Automation rule', ruleId);
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
      return rule;
    }

    const queryString = `
      UPDATE automation_rules
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(ruleId);

    const result = await query(queryString, values);
    return this.mapDbAutomationRuleToAutomationRule(result.rows[0]);
  }

  async deleteAutomationRule(goalId: string, ruleId: string): Promise<boolean> {
    // Check if rule exists and belongs to goal
    const rule = await this.findAutomationRuleById(ruleId);
    if (!rule || rule.goalId !== goalId) {
      throw new NotFoundError('Automation rule', ruleId);
    }

    const result = await query(
      'DELETE FROM automation_rules WHERE id = $1 RETURNING id',
      [ruleId]
    );

    return result.rows.length > 0;
  }

  private async getGoalMilestones(goalId: string): Promise<Milestone[]> {
    const result = await query(
      'SELECT * FROM milestones WHERE goal_id = $1 ORDER BY amount',
      [goalId]
    );

    return result.rows.map(row => this.mapDbMilestoneToMilestone(row));
  }

  private async getGoalAutomationRules(goalId: string): Promise<AutomationRule[]> {
    const result = await query(
      'SELECT * FROM automation_rules WHERE goal_id = $1 ORDER BY created_at',
      [goalId]
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

  private mapDbGoalToGoal(dbGoal: any): SavingsGoal {
    return {
      id: dbGoal.id,
      userId: dbGoal.user_id,
      name: dbGoal.name,
      description: dbGoal.description,
      targetAmount: parseFloat(dbGoal.target_amount),
      currentAmount: parseFloat(dbGoal.current_amount),
      targetDate: dbGoal.target_date.toISOString().split('T')[0],
      category: dbGoal.category,
      priority: dbGoal.priority,
      isActive: dbGoal.is_active,
      icon: dbGoal.icon,
      color: dbGoal.color,
      photoUrl: dbGoal.photo_url,
      framingType: dbGoal.framing_type,
      lossAvoidanceDescription: dbGoal.loss_avoidance_description,
      achievementDescription: dbGoal.achievement_description,
      createdAt: dbGoal.created_at.toISOString(),
      updatedAt: dbGoal.updated_at.toISOString(),
    };
  }

  private mapDbMilestoneToMilestone(dbMilestone: any): Milestone {
    return {
      id: dbMilestone.id,
      goalId: dbMilestone.goal_id,
      amount: parseFloat(dbMilestone.amount),
      description: dbMilestone.description,
      isCompleted: dbMilestone.is_completed,
      completedDate: dbMilestone.completed_date?.toISOString().split('T')[0] || null,
      createdAt: dbMilestone.created_at.toISOString(),
    };
  }

  private mapDbAutomationRuleToAutomationRule(dbRule: any): AutomationRule {
    return {
      id: dbRule.id,
      goalId: dbRule.goal_id,
      type: dbRule.type,
      amount: dbRule.amount ? parseFloat(dbRule.amount) : null,
      percentage: dbRule.percentage ? parseFloat(dbRule.percentage) : null,
      frequency: dbRule.frequency,
      isActive: dbRule.is_active,
      createdAt: dbRule.created_at.toISOString(),
    };
  }
}

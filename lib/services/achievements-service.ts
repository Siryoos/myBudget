import { query } from '@/lib/database';
import { BaseService, NotFoundError } from './base-service';
import { AchievementCreate, AchievementUpdate, UserAchievementUpdate, achievementSchemas, userAchievementSchemas } from '@/lib/validation-schemas';
import type { Achievement, UserAchievement } from '@/types';

export interface AchievementWithProgress extends Achievement {
  userProgress?: {
    isUnlocked: boolean;
    unlockedDate?: string;
    progress: number;
    maxProgress: number;
  };
}

export class AchievementsService extends BaseService {
  constructor() {
    super('achievements');
  }

  async create(data: AchievementCreate): Promise<Achievement> {
    // Validate input data
    const validatedData = this.validateData(achievementSchemas.create, data);

    const result = await query(`
      INSERT INTO achievements (
        name, description, category, icon, requirement_type,
        requirement_value, requirement_timeframe, requirement_description, points
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      validatedData.name,
      validatedData.description,
      validatedData.category,
      validatedData.icon,
      validatedData.requirementType,
      validatedData.requirementValue,
      validatedData.requirementTimeframe || null,
      validatedData.requirementDescription || null,
      validatedData.points,
    ]);

    return this.mapDbAchievementToAchievement(result.rows[0]);
  }

  async findAll(): Promise<Achievement[]> {
    const result = await query('SELECT * FROM achievements ORDER BY points DESC, name');
    return result.rows.map(row => this.mapDbAchievementToAchievement(row));
  }

  async findById(id: string): Promise<Achievement | null> {
    const achievement = await super.findById(id);
    return achievement ? this.mapDbAchievementToAchievement(achievement) : null;
  }

  async findByCategory(category: string): Promise<Achievement[]> {
    const result = await query(
      'SELECT * FROM achievements WHERE category = $1 ORDER BY points DESC',
      [category]
    );
    return result.rows.map(row => this.mapDbAchievementToAchievement(row));
  }

  async update(id: string, data: AchievementUpdate): Promise<Achievement> {
    // Validate input data
    const validatedData = this.validateData(achievementSchemas.update, data);

    // Check if achievement exists
    const existingAchievement = await this.findById(id);
    if (!existingAchievement) {
      throw new NotFoundError('Achievement', id);
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
      return existingAchievement;
    }

    const queryString = `
      UPDATE achievements
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(queryString, values);
    return this.mapDbAchievementToAchievement(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    // Check if achievement exists
    const achievement = await this.findById(id);
    if (!achievement) {
      throw new NotFoundError('Achievement', id);
    }

    return await super.delete(id);
  }

  // User achievement methods
  async getUserAchievements(userId: string): Promise<AchievementWithProgress[]> {
    const result = await query(`
      SELECT
        a.*,
        ua.is_unlocked,
        ua.unlocked_date,
        ua.progress,
        ua.max_progress
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      ORDER BY a.points DESC, a.name
    `, [userId]);

    return result.rows.map(row => ({
      ...this.mapDbAchievementToAchievement(row),
      userProgress: row.is_unlocked !== null ? {
        isUnlocked: row.is_unlocked,
        unlockedDate: row.unlocked_date?.toISOString().split('T')[0],
        progress: row.progress || 0,
        maxProgress: row.max_progress || row.requirement_value,
      } : undefined,
    }));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    // Check if achievement exists
    const achievement = await this.findById(achievementId);
    if (!achievement) {
      throw new NotFoundError('Achievement', achievementId);
    }

    // Check if user already has this achievement
    const existingUserAchievement = await this.findUserAchievement(userId, achievementId);

    if (existingUserAchievement) {
      if (existingUserAchievement.isUnlocked) {
        throw new Error('Achievement already unlocked');
      }

      // Update existing record to unlocked
      const result = await query(`
        UPDATE user_achievements
        SET is_unlocked = true, unlocked_date = CURRENT_DATE, progress = max_progress
        WHERE user_id = $1 AND achievement_id = $2
        RETURNING *
      `, [userId, achievementId]);

      return this.mapDbUserAchievementToUserAchievement(result.rows[0]);
    } else {
      // Create new user achievement record
      const result = await query(`
        INSERT INTO user_achievements (user_id, achievement_id, is_unlocked, unlocked_date, progress, max_progress)
        VALUES ($1, $2, true, CURRENT_DATE, $3, $3)
        RETURNING *
      `, [userId, achievementId, achievement.requirementValue]);

      return this.mapDbUserAchievementToUserAchievement(result.rows[0]);
    }
  }

  async updateUserAchievement(
    userId: string,
    achievementId: string,
    data: UserAchievementUpdate
  ): Promise<UserAchievement> {
    // Validate input data
    const validatedData = this.validateData(userAchievementSchemas.update, data);

    // Check if user achievement exists
    const existingUserAchievement = await this.findUserAchievement(userId, achievementId);
    if (!existingUserAchievement) {
      throw new NotFoundError('User achievement', `${userId}-${achievementId}`);
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
      return existingUserAchievement;
    }

    const queryString = `
      UPDATE user_achievements
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount} AND achievement_id = $${paramCount + 1}
      RETURNING *
    `;
    values.push(userId, achievementId);

    const result = await query(queryString, values);
    return this.mapDbUserAchievementToUserAchievement(result.rows[0]);
  }

  async getUserProgress(userId: string): Promise<{
    totalAchievements: number;
    unlockedAchievements: number;
    totalPoints: number;
    unlockedPoints: number;
    completionPercentage: number;
  }> {
    const result = await query(`
      SELECT
        COUNT(a.*) as total_achievements,
        COUNT(CASE WHEN ua.is_unlocked THEN 1 END) as unlocked_achievements,
        COALESCE(SUM(a.points), 0) as total_points,
        COALESCE(SUM(CASE WHEN ua.is_unlocked THEN a.points END), 0) as unlocked_points
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
    `, [userId]);

    const row = result.rows[0];
    const totalAchievements = parseInt(row.total_achievements);
    const unlockedAchievements = parseInt(row.unlocked_achievements);
    const totalPoints = parseInt(row.total_points);
    const unlockedPoints = parseInt(row.unlocked_points);

    return {
      totalAchievements,
      unlockedAchievements,
      totalPoints,
      unlockedPoints,
      completionPercentage: totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0,
    };
  }

  async checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]> {
    // Get user's current statistics
    const userStats = await this.getUserStatistics(userId);
    const unlockedAchievements: UserAchievement[] = [];

    // Get all achievements
    const allAchievements = await this.findAll();

    for (const achievement of allAchievements) {
      let shouldUnlock = false;
      let currentProgress = 0;
      let maxProgress = achievement.requirementValue;

      // Check if achievement criteria are met based on requirement type
      switch (achievement.requirementType) {
        case 'transaction_count':
          currentProgress = userStats.transactionCount;
          shouldUnlock = currentProgress >= achievement.requirementValue;
          break;

        case 'saving_streak':
          // This would require more complex logic to track saving streaks
          // For now, we'll use a simple implementation
          currentProgress = userStats.savingsTransactions;
          shouldUnlock = currentProgress >= achievement.requirementValue;
          break;

        case 'budget_adherence':
          // Check if user has been within budget limits
          const budgetAdherence = await this.calculateBudgetAdherence(userId);
          currentProgress = Math.floor(budgetAdherence * 100); // Convert to percentage
          maxProgress = 100;
          shouldUnlock = budgetAdherence >= (achievement.requirementValue / 100);
          break;

        case 'goal_completion':
          currentProgress = userStats.completedGoals;
          shouldUnlock = currentProgress >= achievement.requirementValue;
          break;
      }

      // Check if user already has this achievement
      const existingUserAchievement = await this.findUserAchievement(userId, achievement.id);

      if (!existingUserAchievement && shouldUnlock) {
        // Unlock the achievement
        const unlockedAchievement = await this.unlockAchievement(userId, achievement.id);
        unlockedAchievements.push(unlockedAchievement);
      } else if (existingUserAchievement && !existingUserAchievement.isUnlocked) {
        // Update progress
        await this.updateUserAchievement(userId, achievement.id, {
          progress: Math.min(currentProgress, maxProgress),
          isUnlocked: shouldUnlock,
        });
      }
    }

    return unlockedAchievements;
  }

  private async findUserAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
    const result = await query(
      'SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
      [userId, achievementId]
    );

    return result.rows.length > 0
      ? this.mapDbUserAchievementToUserAchievement(result.rows[0])
      : null;
  }

  private async getUserStatistics(userId: string): Promise<{
    transactionCount: number;
    savingsTransactions: number;
    completedGoals: number;
  }> {
    const result = await query(`
      SELECT
        COUNT(t.*) as transaction_count,
        COUNT(CASE WHEN t.category = 'Savings' THEN 1 END) as savings_transactions,
        COUNT(CASE WHEN sg.is_active = false THEN 1 END) as completed_goals
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      LEFT JOIN savings_goals sg ON u.id = sg.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);

    const row = result.rows[0];
    return {
      transactionCount: parseInt(row.transaction_count) || 0,
      savingsTransactions: parseInt(row.savings_transactions) || 0,
      completedGoals: parseInt(row.completed_goals) || 0,
    };
  }

  private async calculateBudgetAdherence(userId: string): Promise<number> {
    // This is a simplified implementation
    // In a real app, you'd calculate this based on budget vs actual spending over time
    const result = await query(`
      SELECT
        COALESCE(AVG(
          CASE
            WHEN bc.spent <= bc.allocated THEN 1.0
            ELSE bc.allocated::float / GREATEST(bc.spent, 1)
          END
        ), 0) as adherence
      FROM budget_categories bc
      JOIN budgets b ON bc.budget_id = b.id
      WHERE b.user_id = $1 AND bc.spent > 0
    `, [userId]);

    return parseFloat(result.rows[0].adherence) || 0;
  }

  private mapDbAchievementToAchievement(dbAchievement: any): Achievement {
    return {
      id: dbAchievement.id,
      name: dbAchievement.name,
      description: dbAchievement.description,
      category: dbAchievement.category,
      icon: dbAchievement.icon,
      requirementType: dbAchievement.requirement_type,
      requirementValue: dbAchievement.requirement_value,
      requirementTimeframe: dbAchievement.requirement_timeframe,
      requirementDescription: dbAchievement.requirement_description,
      points: dbAchievement.points,
      createdAt: dbAchievement.created_at.toISOString(),
    };
  }

  private mapDbUserAchievementToUserAchievement(dbUserAchievement: any): UserAchievement {
    return {
      id: dbUserAchievement.id,
      userId: dbUserAchievement.user_id,
      achievementId: dbUserAchievement.achievement_id,
      isUnlocked: dbUserAchievement.is_unlocked,
      unlockedDate: dbUserAchievement.unlocked_date?.toISOString().split('T')[0],
      progress: dbUserAchievement.progress,
      maxProgress: dbUserAchievement.max_progress,
      createdAt: dbUserAchievement.created_at.toISOString(),
    };
  }
}

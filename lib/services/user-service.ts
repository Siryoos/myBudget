import bcrypt from 'bcryptjs';

import { query } from '@/lib/database';
import type { UserCreate, UserUpdate } from '@/lib/validation-schemas';
import { userSchemas } from '@/lib/validation-schemas';
import type { User } from '@/types';
import { UserRole } from '@/types/auth';

import { BaseService, NotFoundError, ValidationError, ConflictError } from './base-service';

export interface UserProfile extends User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  currency: string;
  language: string;
  monthlyIncome?: number;
  riskTolerance: string;
  savingsRate?: number;
  debtToIncomeRatio?: number;
  creditScore?: number;
  dependents: number;
  createdAt: string;
  updatedAt: string;
}

export class UserService extends BaseService {
  constructor() {
    super('users');
  }

  async create(data: UserCreate): Promise<UserProfile> {
    // Validate input data
    const validatedData = this.validateData(userSchemas.create, data);

    // Check if email already exists
    const existingUser = await this.findByEmail(validatedData.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    const result = await query(`
      INSERT INTO users (
        email, name, password_hash, currency, language,
        monthly_income, date_format, timezone, risk_tolerance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      validatedData.email,
      validatedData.name,
      passwordHash,
      validatedData.currency || 'USD',
      validatedData.language || 'en',
      validatedData.monthlyIncome,
      'MM/DD/YYYY',
      'UTC',
      'moderate',
    ]);

    const user = result.rows[0];
    return this.mapDbUserToProfile(user);
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const result = await query(
      'SELECT * FROM users WHERE lower(email) = lower($1)',
      [email],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbUserToProfile(result.rows[0]);
  }

  async findById(id: string): Promise<UserProfile | null> {
    const user = await super.findById(id);
    return user ? this.mapDbUserToProfile(user) : null;
  }

  async update(id: string, data: UserUpdate): Promise<UserProfile> {
    // Validate input data
    const validatedData = this.validateData(userSchemas.update, data);

    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    // Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await this.findByEmail(validatedData.email);
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
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
      return existingUser;
    }

    const queryString = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(queryString, values);
    return this.mapDbUserToProfile(result.rows[0]);
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    // Validate new password
    const validatedData = this.validateData(userSchemas.changePassword, {
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });

    // Get user with password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User', id);
    }

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, id],
    );
  }

  async delete(id: string): Promise<boolean> {
    // Check if user exists
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }

    // Delete user (cascade will handle related data)
    return await super.delete(id);
  }

  async getProfile(id: string): Promise<UserProfile> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  async authenticate(email: string, password: string): Promise<UserProfile | null> {
    // Get user with password hash
    const result = await query(`
      SELECT * FROM users WHERE lower(email) = lower($1)
    `, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return null;
    }

    return this.mapDbUserToProfile(user);
  }

  private mapDbUserToProfile(dbUser: any): UserProfile {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: (dbUser.role as UserRole) ?? UserRole.USER,
      avatar: dbUser.avatar,
      currency: dbUser.currency,
      language: dbUser.language,
      monthlyIncome: dbUser.monthly_income,
      riskTolerance: dbUser.risk_tolerance,
      savingsRate: dbUser.savings_rate,
      debtToIncomeRatio: dbUser.debt_to_income_ratio,
      creditScore: dbUser.credit_score,
      dependents: dbUser.dependents,
      createdAt: dbUser.created_at.toISOString(),
      updatedAt: dbUser.updated_at.toISOString(),
    };
  }
}

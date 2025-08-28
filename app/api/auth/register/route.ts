import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { hashPassword, generateToken } from '@/lib/auth';
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, DEFAULT_CURRENCY, DEFAULT_LANGUAGE } from '@/lib/constants';
import { query } from '@/lib/database';

const registerSchema = z.object({
  email: z.string().email().transform(s => s.trim().toLowerCase()),
  password: z.string().min(8),
  name: z.string().min(2),
  currency: z.enum(SUPPORTED_CURRENCIES, {
    errorMap: () => ({ message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` }),
  }).optional().default(DEFAULT_CURRENCY),
  language: z.enum(SUPPORTED_LANGUAGES, {
    errorMap: () => ({ message: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` }),
  }).optional().default(DEFAULT_LANGUAGE),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, currency, language } = registerSchema.parse(body);

    // Create normalized email for consistent database operations
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists using case-insensitive email comparison
    const existingUser = await query('SELECT id FROM users WHERE lower(email) = lower($1)', [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 },
      );
    }

    // Hash password and create user with normalized email
    const hashedPassword = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password_hash, name, currency, language) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name',
      [normalizedEmail, hashedPassword, name, currency, language],
    );

    const user = result.rows[0];
    // Ensure the returned user object has the normalized email
    const userWithNormalizedEmail = { ...user, email: normalizedEmail };
    const token = await generateToken({ id: user.id, userId: user.id, email: normalizedEmail });

    return NextResponse.json({
      success: true,
      data: { user: userWithNormalizedEmail, token },
    });

  } catch (error) {
    if (error instanceof ZodError) {
      // Handle Zod validation errors
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    // Handle other errors
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 },
    );
  }
}

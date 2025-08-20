import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { hashPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  currency: z.string().optional(),
  language: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, currency = 'USD', language = 'en' } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password_hash, name, currency, language) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name',
      [email, hashedPassword, name, currency, language]
    );

    const user = result.rows[0];
    const token = generateToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      success: true,
      data: { user, token }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

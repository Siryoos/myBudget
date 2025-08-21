import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { comparePassword, generateToken } from '@/lib/auth';
import { z, ZodError } from 'zod';

const loginSchema = z.object({
  email: z.string().email().transform(s => s.trim().toLowerCase()),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Find user
    const result = await query(
      'SELECT id, email, name, password_hash FROM users WHERE lower(email) = lower($1)',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      success: true,
      data: { 
        user: { id: user.id, email: user.email, name: user.name },
        token 
      }
    });

  } catch (error) {
    if (error instanceof ZodError) {
      // Handle Zod validation errors
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.flatten()
        },
        { status: 400 }
      );
    }
    
    // Handle other errors
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

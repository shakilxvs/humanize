import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';

const RegisterSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export async function POST(req: Request) {
  try {
    const body = RegisterSchema.parse(await req.json());
    const email = body.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('An account with that email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await db.user.create({
      data: { name: body.name, email, passwordHash }
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.userMessage }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Please check your name, email, and password (min 8 characters).' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
  }
}

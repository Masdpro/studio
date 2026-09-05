import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, role, displayName } = body as {
    email?: string;
    password?: string;
    role?: 'customer' | 'vendor' | 'delivery_agent';
    displayName?: string;
  };

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'email, password and role are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();

  db.insert(users)
    .values({ id, email, passwordHash, role, displayName, createdAt: new Date() })
    .run();

  return NextResponse.json({ id, email, role }, { status: 201 });
}

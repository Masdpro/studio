import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Public self-registration is deliberately limited to these — 'admin' is
// granted by an existing admin (or seeded directly), never chosen by
// whoever happens to POST to this endpoint.
type PublicRole = 'customer' | 'vendor' | 'delivery_agent';
const PUBLIC_ROLES: PublicRole[] = ['customer', 'vendor', 'delivery_agent'];
function isPublicRole(role: string): role is PublicRole {
  return (PUBLIC_ROLES as string[]).includes(role);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, role, displayName } = body as {
    email?: string;
    password?: string;
    role?: string;
    displayName?: string;
  };

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'email, password and role are required' }, { status: 400 });
  }
  if (!isPublicRole(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
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

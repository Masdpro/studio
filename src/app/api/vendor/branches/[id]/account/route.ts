import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { users, vendorBranches } from '@/db/schema';
import { userHasRole } from '@/lib/roles';

async function owned(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !userHasRole(session.user.id, 'vendor')) return null;
  return db.select().from(vendorBranches).where(and(eq(vendorBranches.id, id), eq(vendorBranches.vendorId, session.user.id))).get() ?? null;
}

/** Creates the branch's own login (or resets its password if it already has one). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await owned(id);
  if (!branch) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });
  const body = await request.json().catch(() => null);
  const password = String(body?.password ?? '');
  if (password.length < 8 || password.length > 72) return NextResponse.json({ error: 'Password must be 8 to 72 characters.' }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 10);

  if (branch.accountUserId) {
    db.update(users).set({ passwordHash }).where(eq(users.id, branch.accountUserId)).run();
    return NextResponse.json({ ok: true, reset: true });
  }
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (db.select().from(users).where(eq(users.email, email)).get()) return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });

  const userId = randomUUID();
  db.insert(users).values({ id: userId, email, passwordHash, role: 'customer', displayName: branch.name, approvalStatus: 'approved', emailVerifiedAt: new Date(), createdAt: new Date() }).run();
  db.update(vendorBranches).set({ accountUserId: userId }).where(eq(vendorBranches.id, id)).run();
  return NextResponse.json({ ok: true, email }, { status: 201 });
}

/** Removes the branch's access (the account stays as a plain customer account). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await owned(id);
  if (!branch) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });
  db.update(vendorBranches).set({ accountUserId: null }).where(eq(vendorBranches.id, id)).run();
  return NextResponse.json({ ok: true });
}

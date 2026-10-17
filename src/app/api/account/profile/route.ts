import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';

function read(userId: string) {
  const u = db.select().from(users).where(eq(users.id, userId)).get();
  if (!u) return null;
  return { name: u.displayName ?? '', email: u.email, phone: u.phone ?? '', phoneVerified: !!u.phoneVerifiedAt, address: u.address ?? '' };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const p = session?.user?.id ? read(session.user.id) : null;
  if (!p) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  return NextResponse.json(p);
}

/** PATCH { name?, address? } updates details; { currentPassword, newPassword } changes the password. */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: string; address?: string; currentPassword?: string; newPassword?: string };
  const set: Partial<typeof users.$inferInsert> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'Enter your name (2 to 80 characters).' }, { status: 400 });
    set.displayName = name;
  }
  if (body.address !== undefined) {
    const address = String(body.address).trim();
    if (address.length > 200) return NextResponse.json({ error: 'Address is too long (200 characters max).' }, { status: 400 });
    set.address = address || null;
  }
  if (body.newPassword !== undefined) {
    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user || !(await bcrypt.compare(String(body.currentPassword ?? ''), user.passwordHash))) {
      return NextResponse.json({ error: 'Your current password is not right.' }, { status: 400 });
    }
    const np = String(body.newPassword);
    if (np.length < 8 || np.length > 72) return NextResponse.json({ error: 'New password must be 8 to 72 characters.' }, { status: 400 });
    set.passwordHash = await bcrypt.hash(np, 10);
  }
  if (!Object.keys(set).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  db.update(users).set(set).where(eq(users.id, id)).run();
  return NextResponse.json({ ok: true, ...read(id) });
}

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { requireSuperAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sendAdminInvite } from '@/lib/verification';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST { email, name } (super admin only): creates a new admin account and emails them
 * a link to choose their own password. Existing customer/vendor accounts are not promoted;
 * admins should use a separate work address.
 */
export async function POST(request: Request) {
  const session = await requireSuperAdminSession();
  if (!session) return NextResponse.json({ error: 'Only the super admin can add admins.' }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; name?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  if (!EMAIL.test(email) || email.length > 200) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ error: "Enter the new admin's name." }, { status: 400 });

  const existing = db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, email)).get();
  if (existing) {
    return NextResponse.json(
      { error: existing.role === 'admin' ? 'That person is already an admin.' : 'That email already has a Closebuy account. Use a separate work email for the admin.' },
      { status: 409 },
    );
  }

  const id = randomUUID();
  // Nobody knows this password; the invite link is the only way in.
  const unusable = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  db.insert(users)
    .values({ id, email, passwordHash: unusable, role: 'admin', displayName: name, createdAt: new Date(), approvalStatus: 'approved', isSuperAdmin: false })
    .run();

  const inviter = session.user.name || session.user.email || 'The Closebuy super admin';
  const sent = await sendAdminInvite(id, inviter);
  return NextResponse.json({ ok: true, id, ...(process.env.NODE_ENV !== 'production' && sent ? { devLink: sent.link } : {}) });
}

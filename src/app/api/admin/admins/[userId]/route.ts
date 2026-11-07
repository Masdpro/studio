import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireSuperAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sendAdminInvite } from '@/lib/verification';

type Params = { params: Promise<{ userId: string }> };

function findAdmin(userId: string) {
  const u = db.select().from(users).where(eq(users.id, userId)).get();
  return u && u.role === 'admin' ? u : null;
}

/** POST (super admin only): re-sends the "choose your password" invite to an admin who hasn't set one yet. */
export async function POST(_request: Request, { params }: Params) {
  const session = await requireSuperAdminSession();
  if (!session) return NextResponse.json({ error: 'Only the super admin can manage admins.' }, { status: 403 });
  const { userId } = await params;
  const admin = findAdmin(userId);
  if (!admin) return NextResponse.json({ error: 'Admin not found.' }, { status: 404 });
  if (admin.emailVerifiedAt) return NextResponse.json({ error: 'This admin has already set their password.' }, { status: 400 });
  const sent = await sendAdminInvite(admin.id, session.user.name || session.user.email || 'The Closebuy super admin');
  return NextResponse.json({ ok: true, ...(process.env.NODE_ENV !== 'production' && sent ? { devLink: sent.link } : {}) });
}

/** DELETE (super admin only): removes admin rights and signs that account out everywhere. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireSuperAdminSession();
  if (!session) return NextResponse.json({ error: 'Only the super admin can manage admins.' }, { status: 403 });
  const { userId } = await params;
  const admin = findAdmin(userId);
  if (!admin) return NextResponse.json({ error: 'Admin not found.' }, { status: 404 });
  if (admin.id === session.user.id || admin.isSuperAdmin) {
    return NextResponse.json({ error: "The super admin's rights can't be removed here." }, { status: 400 });
  }
  db.update(users)
    .set({ role: 'customer', sessionVersion: (admin.sessionVersion ?? 0) + 1 })
    .where(eq(users.id, admin.id))
    .run();
  return NextResponse.json({ ok: true });
}

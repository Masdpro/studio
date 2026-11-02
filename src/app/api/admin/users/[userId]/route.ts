import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createNotification } from '@/lib/services/notifications';

/**
 * PATCH { suspended: true, reason } blocks sign-in, signs the account out
 * everywhere and hides its shop; { suspended: false } restores it.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const { userId } = await params;
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (user.id === session.user.id || user.role === 'admin') {
    return NextResponse.json({ error: "Admin accounts can't be suspended here." }, { status: 400 });
  }

  const { suspended, reason } = (await request.json().catch(() => ({}))) as { suspended?: boolean; reason?: string };
  if (typeof suspended !== 'boolean') return NextResponse.json({ error: 'Say whether to suspend or restore.' }, { status: 400 });
  if (suspended) {
    const note = typeof reason === 'string' ? reason.trim().slice(0, 200) : '';
    if (note.length < 3) return NextResponse.json({ error: 'Give a short reason for the suspension.' }, { status: 400 });
    db.update(users)
      .set({ suspendedAt: new Date(), suspendedReason: note, sessionVersion: (user.sessionVersion ?? 0) + 1 })
      .where(eq(users.id, userId))
      .run();
  } else {
    db.update(users).set({ suspendedAt: null, suspendedReason: null }).where(eq(users.id, userId)).run();
    await createNotification({ userId, message: 'Your Closebuy account has been restored. Welcome back.', category: 'Activity', iconName: 'CheckCircle' });
  }
  return NextResponse.json({ ok: true });
}

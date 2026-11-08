import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getVerificationState } from '@/lib/verification';
import { createNotification } from '@/lib/services/notifications';
import { sendEmail } from '@/lib/notify';
import { renderEmail } from '@/lib/email-template';
import { appUrl } from '@/lib/verification';
import { approvalMachine } from '@/lib/state-machines';

/** PATCH { action: 'approve' } or { action: 'reject', note } */
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const { userId } = await params;
  const { action, note } = (await request.json().catch(() => ({}))) as { action?: string; note?: string };

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const state = getVerificationState(userId);
  if (!user || !state || !state.needsReview) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

  if (action === 'approve') {
    // Approving an account that is already approved changes nothing (and doesn't email them again).
    if (user.approvalStatus === 'approved') return NextResponse.json({ ok: true });
    if (!approvalMachine.can(user.approvalStatus, 'approved', 'admin')) return NextResponse.json({ error: 'This account cannot be approved right now.' }, { status: 409 });
    if (!state.readyForReview) {
      return NextResponse.json({ error: state.phoneRequired ? 'Email, phone and all documents must be completed before approval.' : 'Email and all documents must be completed before approval.' }, { status: 409 });
    }
    db.update(users).set({ approvalStatus: 'approved', approvalNote: null }).where(eq(users.id, userId)).run();
    await createNotification({ userId, message: 'Your Closebuy account has been verified. You can now start trading.', category: 'Activity', link: '/account/verification' });
    await sendEmail(
      user.email,
      'Your Closebuy account is approved',
      renderEmail({
        greetingName: user.displayName,
        intro: ['Good news — your account has been verified and you can now start trading on Closebuy.'],
        button: { label: 'Open Closebuy', url: `${appUrl()}/auth/login` },
      }),
    );
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const reason = (note ?? '').trim();
    if (reason.length < 5) return NextResponse.json({ error: 'Give the user a short reason so they can fix it.' }, { status: 400 });
    if (!approvalMachine.can(user.approvalStatus, 'rejected', 'admin')) return NextResponse.json({ error: 'This account cannot be rejected right now.' }, { status: 409 });
    db.update(users).set({ approvalStatus: 'rejected', approvalNote: reason }).where(eq(users.id, userId)).run();
    await createNotification({ userId, message: `Your verification needs attention: ${reason}`, category: 'Activity', link: '/account/verification' });
    await sendEmail(
      user.email,
      'Your Closebuy verification needs attention',
      renderEmail({
        greetingName: user.displayName,
        intro: ['We could not approve your account yet.', `Reason: ${reason}`, 'Please sign in, fix this under Account verification and re-submit.'],
        button: { label: 'Sign in to Closebuy', url: `${appUrl()}/auth/login?callbackUrl=${encodeURIComponent('/account/verification')}` },
      }),
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

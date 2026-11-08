import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { ROLE_LABELS, getVerificationState, setRoleApproval, type TradingRole } from '@/lib/verification';
import { createNotification } from '@/lib/services/notifications';
import { sendEmail } from '@/lib/notify';
import { renderEmail } from '@/lib/email-template';
import { appUrl } from '@/lib/verification';
import { approvalMachine } from '@/lib/state-machines';

/**
 * PATCH { action: 'approve', role? } or { action: 'reject', note, role? }
 *
 * Each trading role (vendor, delivery agent) is approved on its own. Without `role`, the action
 * goes to the role that is waiting for review (or the only role the account has).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const { userId } = await params;
  const { action, note, role: requested } = (await request.json().catch(() => ({}))) as { action?: string; note?: string; role?: string };

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const state = getVerificationState(userId);
  if (!user || !state || !state.needsReview) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

  const target = requested
    ? state.tradingRoles.find((r) => r.role === requested)
    : (state.tradingRoles.find((r) => r.approvalStatus !== 'approved') ?? state.tradingRoles[0]);
  if (!target) return NextResponse.json({ error: requested ? 'This account does not have that role.' : 'Account not found.' }, { status: 404 });
  const role = target.role as TradingRole;
  const what = ROLE_LABELS[role].toLowerCase();

  if (action === 'approve') {
    // Approving a role that is already approved changes nothing (and doesn't email them again).
    if (target.approvalStatus === 'approved') return NextResponse.json({ ok: true });
    if (!approvalMachine.can(target.approvalStatus, 'approved', 'admin')) return NextResponse.json({ error: 'This account cannot be approved right now.' }, { status: 409 });
    if (!target.readyForReview) {
      return NextResponse.json(
        { error: state.phoneRequired ? `Email, phone and all ${what} documents must be completed before approval.` : `Email and all ${what} documents must be completed before approval.` },
        { status: 409 },
      );
    }
    setRoleApproval(userId, role, 'approved', null);
    await createNotification({ userId, message: `Your Closebuy ${what} profile has been verified. You can now start trading as a ${what}.`, category: 'Activity', link: '/account/verification' });
    await sendEmail(
      user.email,
      `You're approved as a Closebuy ${what}`,
      renderEmail({
        greetingName: user.displayName,
        intro: [`Good news — your ${what} profile has been verified and you can now start trading on Closebuy as a ${what}.`],
        button: { label: 'Open Closebuy', url: `${appUrl()}/auth/login` },
      }),
    );
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const reason = (note ?? '').trim();
    if (reason.length < 5) return NextResponse.json({ error: 'Give the user a short reason so they can fix it.' }, { status: 400 });
    if (!approvalMachine.can(target.approvalStatus, 'rejected', 'admin')) return NextResponse.json({ error: 'This account cannot be rejected right now.' }, { status: 409 });
    setRoleApproval(userId, role, 'rejected', reason);
    await createNotification({ userId, message: `Your ${what} verification needs attention: ${reason}`, category: 'Activity', link: '/account/verification' });
    await sendEmail(
      user.email,
      `Your Closebuy ${what} verification needs attention`,
      renderEmail({
        greetingName: user.displayName,
        intro: [`We could not approve your ${what} profile yet.`, `Reason: ${reason}`, 'Please sign in, fix this under Account verification and re-submit.'],
        button: { label: 'Sign in to Closebuy', url: `${appUrl()}/auth/login?callbackUrl=${encodeURIComponent('/account/verification')}` },
      }),
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

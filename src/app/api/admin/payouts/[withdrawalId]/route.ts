import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { approveWithdrawal, confirmWithdrawalOtp, rejectWithdrawal, resendWithdrawalOtp } from '@/lib/services/withdrawals';

/**
 * POST { action: 'approve' }              starts the Paystack transfer (Paystack then sends the owner an OTP)
 * POST { action: 'otp', otp }             releases it with that OTP
 * POST { action: 'resend' }               asks Paystack to send the OTP again
 * POST { action: 'reject', reason }       declines it and refunds the wallet
 */
export async function POST(request: Request, { params }: { params: Promise<{ withdrawalId: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const { withdrawalId } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string; otp?: string; reason?: string };
  try {
    switch (body.action) {
      case 'approve':
        return NextResponse.json({ ok: true, withdrawal: await approveWithdrawal(withdrawalId) });
      case 'otp':
        return NextResponse.json({ ok: true, withdrawal: await confirmWithdrawalOtp(withdrawalId, String(body.otp ?? '')) });
      case 'resend':
        await resendWithdrawalOtp(withdrawalId);
        return NextResponse.json({ ok: true });
      case 'reject': {
        const reason = String(body.reason ?? '').trim().slice(0, 140);
        if (reason.length < 3) return NextResponse.json({ error: 'Give a short reason they will see.' }, { status: 400 });
        return NextResponse.json({ ok: true, withdrawal: await rejectWithdrawal(withdrawalId, reason) });
      }
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Something went wrong.' }, { status: 400 });
  }
}

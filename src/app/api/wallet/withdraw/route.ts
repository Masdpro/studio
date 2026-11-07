import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requestWithdrawal } from '@/lib/services/withdrawals';

/** POST { amount }: asks to withdraw earnings to the saved bank account. An admin approves each payout. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  const { amount } = (await request.json().catch(() => ({}))) as { amount?: number };
  try {
    const w = await requestWithdrawal(session.user.id, Number(amount));
    return NextResponse.json({ ok: true, withdrawal: { id: w.id, status: w.status, net: w.net, fee: w.fee } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not start the withdrawal.' }, { status: 400 });
  }
}

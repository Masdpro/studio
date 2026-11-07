import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requestWithdrawal } from '@/lib/services/withdrawals';

/** POST { amount }: withdraws earnings to the saved bank account through Paystack. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  const { amount } = (await request.json().catch(() => ({}))) as { amount?: number };
  try {
    const w = await requestWithdrawal(session.user.id, Number(amount));
    if (w.status === 'failed' || w.status === 'reversed') {
      return NextResponse.json({ error: "The transfer couldn't be sent right now, so the money is back in your wallet. Please try again later.", withdrawal: { status: w.status } }, { status: 502 });
    }
    return NextResponse.json({ ok: true, withdrawal: { id: w.id, status: w.status, net: w.net, fee: w.fee } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not start the withdrawal.' }, { status: 400 });
  }
}

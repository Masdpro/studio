import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWalletHistory } from '@/lib/services/wallets';

/** The signed-in user's wallet history, newest first. ?before=<ms timestamp> pages back. */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  const before = Number(new URL(request.url).searchParams.get('before')) || undefined;
  const { entries, hasMore } = getWalletHistory(session.user.id, { before, limit: 30 });
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      balanceAfter: e.balanceAfter,
      fee: e.fee,
      orderId: e.orderId,
      description: e.description,
      createdAt: e.createdAt.getTime(),
    })),
    hasMore,
  });
}

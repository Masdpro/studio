import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializePaystackTransaction } from '@/lib/paystack';
import { createPendingWalletFunding } from '@/lib/services/wallets';
import { log } from '@/lib/log';

/** Starts a real Paystack payment to fund the signed-in user's wallet. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const { amount } = (await request.json()) as { amount: number };
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 100 || amount > 1_000_000) {
    return NextResponse.json({ error: 'Top up between ₦100 and ₦1,000,000.' }, { status: 400 });
  }

  const reference = await createPendingWalletFunding(session.user.id, amount);

  try {
    const { authorizationUrl } = await initializePaystackTransaction({
      email: session.user.email,
      amountNaira: amount,
      reference,
      // Land back on the homepage — the wallet display in the header picks up
      // the ?reference= param itself and shows a toast, no dedicated page.
      callbackUrl: new URL('/shop', request.url).toString(),
    });
    return NextResponse.json({ authorizationUrl, reference });
  } catch (err) {
    log.forRequest(request).error('Could not start a wallet top-up with Paystack', { area: 'payments', err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start payment.' },
      { status: 502 }
    );
  }
}

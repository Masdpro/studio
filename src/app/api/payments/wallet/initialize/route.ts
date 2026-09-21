import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializePaystackTransaction } from '@/lib/paystack';
import { createPendingWalletFunding } from '@/lib/services/wallets';

/** Starts a real Paystack payment to fund the signed-in user's wallet. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const { amount } = (await request.json()) as { amount: number };
  if (typeof amount !== 'number' || !(amount > 0)) {
    return NextResponse.json({ error: 'A positive amount is required.' }, { status: 400 });
  }

  const reference = await createPendingWalletFunding(session.user.id, amount);

  try {
    const { authorizationUrl } = await initializePaystackTransaction({
      email: session.user.email,
      amountNaira: amount,
      reference,
      // Land back on the homepage — the wallet display in the header picks up
      // the ?reference= param itself and shows a toast, no dedicated page.
      callbackUrl: new URL('/', request.url).toString(),
    });
    return NextResponse.json({ authorizationUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start payment.' },
      { status: 502 }
    );
  }
}

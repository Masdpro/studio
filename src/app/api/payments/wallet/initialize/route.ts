import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializePaystackTransaction } from '@/lib/paystack';
import { createPendingWalletFunding } from '@/lib/services/wallets';
import { log } from '@/lib/log';

/**
 * Starts a real Paystack payment into the signed-in user's wallet.
 * `purpose: 'order'` is checkout's "Pay online": the money lands in the wallet first (so it is never
 * lost if the order can't be placed), then /checkout/paid places the order from it.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const { amount, purpose } = (await request.json()) as { amount: number; purpose?: 'topup' | 'order' };
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 100 || amount > 1_000_000) {
    return NextResponse.json({ error: 'Top up between ₦100 and ₦1,000,000.' }, { status: 400 });
  }

  const reference = await createPendingWalletFunding(session.user.id, amount);

  try {
    const back = purpose === 'order' ? '/checkout/paid' : '/shop';
    const { authorizationUrl, accessCode } = await initializePaystackTransaction({
      email: session.user.email,
      amountNaira: amount,
      reference,
      // A top-up lands back on the shop, where the wallet pop-up confirms it and shows a toast;
      // paying for an order lands on /checkout/paid, which confirms it and places the order.
      callbackUrl: new URL(back, request.url).toString(),
      cancelUrl: new URL(`${back}?cancelled=1&reference=${encodeURIComponent(reference)}`, request.url).toString(),
    });
    // The website opens Paystack as a pop-up on the page (accessCode); the phone app opens
    // authorizationUrl in a sheet inside the app and closes it on the callback or cancel address.
    return NextResponse.json({ authorizationUrl, accessCode, reference });
  } catch (err) {
    log.forRequest(request).error('Could not start a wallet top-up with Paystack', { area: 'payments', err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start payment.' },
      { status: 502 }
    );
  }
}

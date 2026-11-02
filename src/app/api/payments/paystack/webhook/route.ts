import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { verifyPaystackTransaction } from '@/lib/paystack';
import { getPaymentTransaction, completeWalletFunding } from '@/lib/services/wallets';

/**
 * Paystack calls this when a payment succeeds, so a top-up is credited even if
 * the customer closed the tab before coming back. Set this URL as the webhook
 * in the Paystack dashboard: https://<your-domain>/api/payments/paystack/webhook
 *
 * The request is only trusted if its signature matches our secret key, and
 * even then the payment is re-checked with Paystack before crediting.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Not configured.' }, { status: 503 });

  const raw = await request.text();
  const signature = request.headers.get('x-paystack-signature') ?? '';
  const expected = createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const reference = event.data?.reference;
  if (event.event !== 'charge.success' || !reference) return NextResponse.json({ ok: true });

  const transaction = await getPaymentTransaction(reference);
  // Not one of our wallet top-ups (or already credited): acknowledge so Paystack stops retrying.
  if (!transaction || transaction.purpose !== 'wallet_funding' || transaction.status === 'success') {
    return NextResponse.json({ ok: true });
  }

  const result = await verifyPaystackTransaction(reference);
  if (result.status === 'success' && Math.round(result.amountNaira * 100) >= Math.round(transaction.amount * 100)) {
    await completeWalletFunding(reference);
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyPaystackTransaction } from '@/lib/paystack';
import { getPaymentTransaction, completeWalletFunding, markWalletFundingFailed } from '@/lib/services/wallets';

/** Confirms a wallet-funding payment with Paystack and credits the wallet exactly once. */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ error: 'A payment reference is required.' }, { status: 400 });
  }

  const transaction = await getPaymentTransaction(reference);
  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: 'Payment reference not found.' }, { status: 404 });
  }

  if (transaction.status === 'success') {
    const { newBalance } = await completeWalletFunding(reference);
    return NextResponse.json({ success: true, newBalance });
  }

  try {
    const result = await verifyPaystackTransaction(reference);
    if (!result.success) {
      await markWalletFundingFailed(reference);
      return NextResponse.json({ success: false, error: 'Payment was not successful.' });
    }
    const { newBalance } = await completeWalletFunding(reference);
    return NextResponse.json({ success: true, newBalance });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to verify payment.' },
      { status: 502 }
    );
  }
}

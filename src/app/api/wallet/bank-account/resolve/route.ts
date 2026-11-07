import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveBankAccount } from '@/lib/paystack';

/** POST { bankCode, accountNumber }: the name on that account, for the owner to confirm. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  const { bankCode, accountNumber } = (await request.json().catch(() => ({}))) as { bankCode?: string; accountNumber?: string };
  if (!bankCode || !accountNumber || !/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: 'Choose your bank and enter your 10-digit account number.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await resolveBankAccount(accountNumber, bankCode));
  } catch {
    return NextResponse.json({ error: "We couldn't find that account. Check the number and bank." }, { status: 400 });
  }
}

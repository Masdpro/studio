import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listBanks } from '@/lib/paystack';

/** Nigerian banks for the payout account form. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  try {
    return NextResponse.json({ banks: await listBanks() });
  } catch {
    return NextResponse.json({ error: 'Could not load the list of banks. Try again shortly.' }, { status: 502 });
  }
}

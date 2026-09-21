import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrCreateWallet } from '@/lib/services/wallets';

/** Returns the signed-in user's own wallet balance. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const wallet = await getOrCreateWallet(session.user.id);
  return NextResponse.json({ wallet });
}

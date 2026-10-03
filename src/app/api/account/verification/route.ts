import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getVerificationState } from '@/lib/verification';

/** The signed-in user's own verification checklist. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  return NextResponse.json({ state: getVerificationState(session.user.id) });
}

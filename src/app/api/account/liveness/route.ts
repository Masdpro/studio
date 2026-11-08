import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LivenessError, startLivenessCheck } from '@/lib/services/liveness';

/** Starts a live selfie check: returns its id and the random moves to ask for. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  try {
    return NextResponse.json(startLivenessCheck(session.user.id), { status: 201 });
  } catch (err) {
    if (err instanceof LivenessError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

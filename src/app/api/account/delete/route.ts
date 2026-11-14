import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AccountDeletionError, deleteAccount, deletionBlockers } from '@/lib/services/account-deletion';
import { rateLimit, tooMany } from '@/lib/rate-limit';

/** GET: what (if anything) still has to be finished before the signed-in account can be deleted. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  return NextResponse.json({ blockers: deletionBlockers(id) });
}

/** POST { password }: permanently deletes the signed-in account. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const limited = rateLimit(`account-delete:${id}`, 5, 15 * 60 * 1000);
  if (!limited.ok) return tooMany(limited.retryAfter);
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  try {
    return NextResponse.json(await deleteAccount(id, String(body.password ?? '')));
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      const status = err.code === 'WRONG_PASSWORD' ? 400 : err.code === 'NOT_FOUND' ? 404 : 409;
      return NextResponse.json({ error: err.message, code: err.code, reasons: err.reasons }, { status });
    }
    throw err;
  }
}

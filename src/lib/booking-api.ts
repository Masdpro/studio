import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { userHasRole } from '@/lib/roles';
import { tradingBlockReason } from '@/lib/verification';
import { BookingError } from '@/lib/services/bookings';
import { log } from '@/lib/log';

/** The signed-in user's id, or null. */
export async function signedInId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** The signed-in vendor's id, or a response to send back. Set `trading` for actions that need a verified vendor. */
export async function vendorOr401(opts: { trading?: boolean } = {}): Promise<{ id: string } | { res: NextResponse }> {
  const id = await signedInId();
  if (!id) return { res: NextResponse.json({ error: 'Sign-in required.' }, { status: 401 }) };
  if (!userHasRole(id, 'vendor')) return { res: NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 403 }) };
  if (opts.trading) {
    const blocked = tradingBlockReason(id, 'vendor');
    if (blocked) return { res: NextResponse.json({ error: blocked }, { status: 403 }) };
  }
  return { id };
}

/** Turns a BookingError into its message and status; anything else is logged as a 500. */
export function bookingErrorResponse(err: unknown) {
  if (err instanceof BookingError) return NextResponse.json({ error: err.message, code: err.code, ...err.extra }, { status: err.status });
  log.error('Booking request failed', { area: 'bookings', err });
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, any>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

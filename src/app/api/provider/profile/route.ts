import { NextResponse } from 'next/server';
import { getProvider, PROVIDER_FIELDS, upsertProvider } from '@/lib/services/providers';
import { bookingErrorResponse, providerOr401, readJson, signedInId } from '@/lib/booking-api';
import { getUserRoles } from '@/lib/roles';
import { startTradingRole } from '@/lib/verification';

/** The signed-in provider's business profile. */
export async function GET() {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  return NextResponse.json({ provider: getProvider(v.id) ?? null });
}

/** Updates the business profile. Changing the name changes the public link. */
export async function PUT(request: Request) {
  const v = await providerOr401();
  if ('res' in v) return v.res;
  const body = await readJson(request);
  const input = Object.fromEntries(PROVIDER_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  try {
    return NextResponse.json({ provider: upsertProvider(v.id, input) });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}

/** A signed-in customer (or store owner) adds a service business to their account. It starts pending review. */
export async function POST(request: Request) {
  const id = await signedInId();
  if (!id) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 });
  const roles = getUserRoles(id);
  if (roles.includes('admin') || roles.includes('branch')) return NextResponse.json({ error: 'Staff and branch logins can’t own a service business. Use your personal account.' }, { status: 403 });
  if (roles.includes('provider')) return NextResponse.json({ error: 'You already have a service business on this account.', code: 'ACCOUNT_EXISTS' }, { status: 409 });
  const body = await readJson(request);
  const input = Object.fromEntries(PROVIDER_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  try {
    const provider = upsertProvider(id, input);
    startTradingRole(id, body.phone, roles.some((r) => r === 'vendor' || r === 'delivery_agent'));
    return NextResponse.json({ provider }, { status: 201 });
  } catch (err) {
    return bookingErrorResponse(err);
  }
}

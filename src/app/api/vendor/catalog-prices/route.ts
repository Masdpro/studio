import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { userHasRole } from '@/lib/roles';
import { catalogPriceMap } from '@/lib/services/catalog-prices';

/** GET -> { prices: { "<lower-cased product name>": price } }, the suggested prices Quick add pre-fills. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !userHasRole(id, 'vendor')) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  return NextResponse.json({ prices: catalogPriceMap() }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
}

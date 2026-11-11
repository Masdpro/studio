import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { priceStatus, refreshCatalogPrices } from '@/lib/services/catalog-prices';

/** GET -> how many Quick add products have a suggested price, and when they were last/next updated. */
export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  return NextResponse.json(priceStatus());
}

/** POST -> starts updating the suggested prices now (it runs in the background; poll GET). */
export async function POST() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  if (priceStatus().running) return NextResponse.json({ ...priceStatus(), message: 'Already updating.' });
  refreshCatalogPrices().catch((err) => console.error('[catalog-prices] refresh failed:', err));
  return NextResponse.json({ ...priceStatus(), running: true }, { status: 202 });
}

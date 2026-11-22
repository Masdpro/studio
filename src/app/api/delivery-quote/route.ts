import { NextResponse } from 'next/server';
import { quoteDelivery } from '@/lib/services/delivery-quote';

/** What delivery will cost from each shop in the cart to an address (shown at checkout, charged on the order). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { address?: unknown; shops?: unknown } | null;
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const shops = Array.isArray(body?.shops)
    ? (body!.shops as { vendorId?: unknown; branchId?: unknown }[])
        .filter((s) => typeof s?.vendorId === 'string')
        .slice(0, 20)
        .map((s) => ({ vendorId: s.vendorId as string, branchId: typeof s.branchId === 'string' ? s.branchId : undefined }))
    : [];
  if (!address || !shops.length) {
    return NextResponse.json({ error: 'Enter a delivery address.' }, { status: 400 });
  }
  return NextResponse.json(await quoteDelivery(address, shops));
}

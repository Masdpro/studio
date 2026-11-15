import { NextResponse } from 'next/server';
import { getProducts, getProductsByVendor, suspendedVendorIds } from '@/lib/services/products';
import { getVendorById, getVendors } from '@/lib/services/vendors';
import { getMarkets } from '@/lib/services/markets';
import { getAllBranches, getBranchesByVendor } from '@/lib/services/branches';
import { listedProviders } from '@/lib/services/providers';

// Always the latest shops, products and service businesses (never a copy made at build time).
export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

/**
 * GET — everything the mobile app's Shop and Book home screens show: the same lists the website's
 * /shop and /services pages read on the server. `?side=shop` or `?side=book` returns just one side.
 * `?vendor=<id>` returns one shop's page instead: the shop, its branches and all its products
 * (including products sold only at one branch), like the website's store page.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const vendorId = params.get('vendor');
  if (vendorId) {
    const vendor = await getVendorById(vendorId);
    if (!vendor || suspendedVendorIds().has(vendorId)) return NextResponse.json({ error: 'This shop is not available.' }, { status: 404 });
    const [products, branches] = await Promise.all([getProductsByVendor(vendorId), getBranchesByVendor(vendorId)]);
    const { contactEmail: _e, ...shop } = vendor;
    return NextResponse.json({ vendor: shop, products, branches: branches.map(({ accountEmail: _a, ...b }) => b) }, noStore);
  }

  const side = params.get('side');
  const body: Record<string, unknown> = {};
  if (side !== 'book') {
    const [products, vendors, markets, branches] = await Promise.all([getProducts(), getVendors(), getMarkets(), getAllBranches()]);
    // Contact emails aren't needed to browse; keep them off the wire.
    Object.assign(body, {
      products,
      vendors: vendors.map(({ contactEmail: _e, ...v }) => v),
      markets,
      branches: branches.map(({ accountEmail: _a, ...b }) => b),
    });
  }
  if (side !== 'shop') body.providers = listedProviders();
  return NextResponse.json(body, noStore);
}

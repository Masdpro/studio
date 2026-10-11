import { NextResponse } from 'next/server';
import { getBranchesByVendor } from '@/lib/services/branches';
import { getVendorById } from '@/lib/services/vendors';

/** Public: pickup locations for the given vendors (cart/checkout uses this). ?vendorIds=a,b */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get('vendorIds') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const result: Record<string, { name: string; main: string; branches: { id: string; name: string; address: string; status?: string }[] }> = {};
  for (const id of ids) {
    const [vendor, branches] = await Promise.all([getVendorById(id), getBranchesByVendor(id)]);
    if (!vendor || branches.length === 0) continue;
    result[id] = {
      name: vendor.businessName,
      main: `${vendor.streetAddress}, ${vendor.city}`,
      branches: branches.map((b) => ({ id: b.id, name: b.name, address: `${b.streetAddress}, ${b.city}`, status: b.status })),
    };
  }
  return NextResponse.json({ vendors: result });
}

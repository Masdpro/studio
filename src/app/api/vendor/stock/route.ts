import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBranchForUser, userHasRole } from '@/lib/roles';
import { DEFAULT_LOW_STOCK, getStockRowsFor, locationNames, restockList } from '@/lib/services/stock';
import { getMainProductsByVendor, getProductsByBranch } from '@/lib/services/products';

/** GET — stock counts for every product the signed-in vendor (or branch account) manages, plus the restock list. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 });
  let vendorId: string;
  let list;
  if (userHasRole(id, 'vendor')) {
    vendorId = id;
    list = await getMainProductsByVendor(id);
  } else {
    const branch = getBranchForUser(id);
    if (!branch) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
    vendorId = branch.vendorId;
    list = await getProductsByBranch(branch.id);
  }
  const ids = new Set(list.map((p) => p.id));
  const rows = Object.fromEntries(getStockRowsFor([...ids]));
  const restock = restockList(vendorId).filter((p) => ids.has(p.id));
  return NextResponse.json({ rows, locations: locationNames(vendorId), restock, defaultLowStock: DEFAULT_LOW_STOCK });
}

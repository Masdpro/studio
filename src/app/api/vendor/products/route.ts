import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBranchForUser, userHasRole } from '@/lib/roles';
import { createProduct, getMainProductsByVendor, getProductsByBranch } from '@/lib/services/products';
import { tradingBlockReason } from '@/lib/verification';

/** Lists the signed-in vendor's products (or, for a branch account, that branch's own products). */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 });
  if (userHasRole(id, 'vendor')) return NextResponse.json({ products: await getMainProductsByVendor(id) });
  const branch = getBranchForUser(id);
  if (branch) return NextResponse.json({ products: await getProductsByBranch(branch.id) });
  return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
}

/** Creates a product: a vendor's shared product, or a product that belongs to one branch. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 });
  const isVendor = userHasRole(id, 'vendor');
  const branch = isVendor ? null : getBranchForUser(id);
  if (!isVendor && !branch) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });

  if (isVendor) {
    const blocked = tradingBlockReason(id);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });
  }

  const data = await request.json();
  if (!data.name || typeof data.price !== 'number') {
    return NextResponse.json({ error: 'A product name and price are required.' }, { status: 400 });
  }

  const productId = await createProduct({
    imageUrl: 'https://placehold.co/600x400.png',
    description: '',
    ...data,
    vendorId: branch ? branch.vendorId : id,
    branchId: branch ? branch.id : undefined,
  });
  return NextResponse.json({ id: productId }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProductsByVendor, createProduct } from '@/lib/services/products';

/** Lists the signed-in vendor's own products. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'vendor') {
    return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  }
  const products = await getProductsByVendor(session.user.id);
  return NextResponse.json({ products });
}

/** Creates a new product owned by the signed-in vendor. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'vendor') {
    return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  }

  const data = await request.json();
  if (!data.name || typeof data.price !== 'number') {
    return NextResponse.json({ error: 'A product name and price are required.' }, { status: 400 });
  }

  const productId = await createProduct({
    imageUrl: 'https://placehold.co/600x400.png',
    description: '',
    ...data,
    vendorId: session.user.id,
  });
  return NextResponse.json({ id: productId }, { status: 201 });
}

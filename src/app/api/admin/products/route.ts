import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { getProducts, createProduct } from '@/lib/services/products';

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const products = await getProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const data = await request.json();
  if (!data.vendorId || !data.name || typeof data.price !== 'number') {
    return NextResponse.json({ error: 'A vendor, name and price are required.' }, { status: 400 });
  }

  const id = await createProduct({
    ...data,
    imageUrl: data.imageUrl || 'https://placehold.co/600x400.png',
    description: data.description || '',
  });
  return NextResponse.json({ id }, { status: 201 });
}

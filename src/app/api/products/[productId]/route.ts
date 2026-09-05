import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProductById, updateProduct, deleteProduct } from '@/lib/services/products';

async function assertOwnership(productId: string, userId: string) {
  const product = await getProductById(productId);
  if (!product) return { ok: false as const, status: 404, error: 'Product not found.' };
  if (product.vendorId !== userId) return { ok: false as const, status: 403, error: 'You do not own this product.' };
  return { ok: true as const };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const check = await assertOwnership(productId, session.user.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const data = await request.json();
  await updateProduct(productId, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const check = await assertOwnership(productId, session.user.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  await deleteProduct(productId);
  return NextResponse.json({ ok: true });
}

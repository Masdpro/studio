import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { getProductById, updateProduct, deleteProduct } from '@/lib/services/products';

// Unlike the vendor-facing product route, admin may also reassign vendorId —
// that's the whole point of an admin panel (fixing a miscategorized stall).
const EDITABLE_FIELDS = [
  'vendorId', 'name', 'description', 'price', 'discountPrice', 'imageUrl', 'category', 'aiHint', 'isAwoof',
] as const;

function pickEditableFields(body: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) result[field] = body[field];
  }
  return result;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const { productId } = await params;
  const existing = await getProductById(productId);
  if (!existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const body = await request.json();
  const fields = pickEditableFields(body);
  // An emptied-out Image URL field means "use the placeholder", not "no image" —
  // imageUrl is a required, always-rendered field on Product.
  if (fields.imageUrl === '') fields.imageUrl = 'https://placehold.co/600x400.png';
  await updateProduct(productId, fields);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const { productId } = await params;
  const existing = await getProductById(productId);
  if (!existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  await deleteProduct(productId);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { userHasRole } from '@/lib/roles';
import { tradingBlockReason } from '@/lib/verification';
import { createProduct } from '@/lib/services/products';
import { isProductPhoto } from '@/lib/product-media';

const MAX_ITEMS = 60;

/**
 * POST { items: [{ name, description, category, price, imageUrl }] } — lists several products at once
 * (the Quick add flow). Every item needs a name, a price and an uploaded photo; nothing is saved
 * unless all of them are valid.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !userHasRole(id, 'vendor')) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  const blocked = tradingBlockReason(id, 'vendor');
  if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

  const { items } = (await request.json().catch(() => ({}))) as { items?: unknown };
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'Choose at least one product.' }, { status: 400 });
  if (items.length > MAX_ITEMS) return NextResponse.json({ error: `You can add up to ${MAX_ITEMS} products at a time.` }, { status: 400 });

  const clean: { name: string; description: string; category: string; price: number; imageUrl: string }[] = [];
  for (const raw of items as Record<string, unknown>[]) {
    const name = typeof raw?.name === 'string' ? raw.name.trim().slice(0, 80) : '';
    const price = Math.round(Number(raw?.price) * 100) / 100;
    if (name.length < 2) return NextResponse.json({ error: 'Every product needs a name.' }, { status: 400 });
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) return NextResponse.json({ error: `Enter a price for ${name}.` }, { status: 400 });
    if (!isProductPhoto(raw?.imageUrl)) return NextResponse.json({ error: `Add a photo for ${name}.` }, { status: 400 });
    clean.push({
      name,
      price,
      imageUrl: raw.imageUrl as string,
      description: typeof raw?.description === 'string' && raw.description.trim() ? raw.description.trim().slice(0, 500) : name,
      category: typeof raw?.category === 'string' ? raw.category.trim().slice(0, 60) : '',
    });
  }

  for (const p of clean) {
    await createProduct({ ...p, vendorId: id, aiHint: p.category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'product' } as any);
  }
  return NextResponse.json({ ok: true, created: clean.length }, { status: 201 });
}

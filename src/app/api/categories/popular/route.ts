import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, products } from '@/db/schema';

export const dynamic = 'force-dynamic';

/** Product categories ranked by units ordered (cancelled orders ignored). */
export async function GET() {
  const cat = new Map<string, string>();
  for (const p of db.select({ id: products.id, category: products.category }).from(products).all()) {
    if (p.category) cat.set(p.id, p.category);
  }
  const units: Record<string, number> = {};
  for (const o of db.select({ items: orders.itemsJson, status: orders.status }).from(orders).all()) {
    if (o.status === 'Cancelled') continue;
    try {
      for (const it of JSON.parse(o.items) as { productId: string; quantity: number }[]) {
        const c = cat.get(it.productId);
        if (c) units[c] = (units[c] ?? 0) + (Number(it.quantity) || 1);
      }
    } catch {}
  }
  const ranked = Object.entries(units).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  return NextResponse.json({ categories: ranked });
}

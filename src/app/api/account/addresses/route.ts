import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, desc, eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { orders, users } from '@/db/schema';

/** Delivery addresses this customer has used before (most recent first), then the one on their profile. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ addresses: [] });
  const rows = db
    .select({ a: orders.deliveryAddress })
    .from(orders)
    .where(and(eq(orders.customerId, id), eq(orders.deliveryPreference, 'delivery')))
    .orderBy(desc(orders.createdAt))
    .limit(50)
    .all();
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (a?: string | null) => {
    const t = (a ?? '').trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k)) { seen.add(k); out.push(t); }
  };
  rows.forEach((r) => add(r.a));
  add(db.select({ a: users.address }).from(users).where(eq(users.id, id)).get()?.a);
  return NextResponse.json({ addresses: out.slice(0, 6) });
}

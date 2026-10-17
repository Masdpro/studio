import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { desc, eq, inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { orders, vendorBranches, vendors } from '@/db/schema';
import { userHasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** What each branch login has been buying as a customer (their own purchases, anywhere on Closebuy). */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !userHasRole(id, 'vendor')) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });

  const branches = db.select().from(vendorBranches).where(eq(vendorBranches.vendorId, id)).all().filter((b) => b.accountUserId);
  const userIds = branches.map((b) => b.accountUserId as string);
  if (!userIds.length) return NextResponse.json({ branches: [] });

  const rows = db.select().from(orders).where(inArray(orders.customerId, userIds)).orderBy(desc(orders.createdAt)).all();
  const vendorNames = new Map(db.select({ id: vendors.id, name: vendors.businessName }).from(vendors).all().map((v) => [v.id, v.name]));

  return NextResponse.json({
    branches: branches.map((b) => {
      const mine = rows.filter((r) => r.customerId === b.accountUserId);
      const live = mine.filter((r) => r.status !== 'Cancelled');
      return {
        id: b.id,
        name: b.name,
        orders: live.length,
        spent: live.reduce((a, r) => a + r.totalAmount, 0),
        recent: mine.slice(0, 10).map((r) => {
          let items = '';
          try { items = (JSON.parse(r.itemsJson) as { name: string; quantity: number }[]).map((i) => `${i.quantity}× ${i.name}`).join(', '); } catch {}
          return { id: r.id, date: r.createdAt.getTime(), store: vendorNames.get(r.vendorId) ?? 'Unknown store', items, total: r.totalAmount, status: r.status };
        }),
      };
    }),
  });
}

import { NextResponse } from 'next/server';
import { desc, inArray } from 'drizzle-orm';
import { requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { orders as ordersTable, users, vendors } from '@/db/schema';
import { getOrderById } from '@/lib/services/orders';

/** All orders, newest first, with the customer and shop names filled in. */
export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const rows = db.select({ id: ordersTable.id }).from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(300).all();
  const orders = (await Promise.all(rows.map((r) => getOrderById(r.id)))).filter((o) => !!o);
  const userIds = Array.from(new Set(orders.flatMap((o) => [o!.customerId, o!.vendorId])));
  const people = userIds.length ? db.select({ id: users.id, email: users.email, name: users.displayName }).from(users).where(inArray(users.id, userIds)).all() : [];
  const shops = userIds.length ? db.select({ id: vendors.id, name: vendors.businessName }).from(vendors).where(inArray(vendors.id, userIds)).all() : [];
  const person = new Map(people.map((p) => [p.id, p]));
  const shop = new Map(shops.map((s) => [s.id, s.name]));
  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o!,
      customerName: person.get(o!.customerId)?.name ?? person.get(o!.customerId)?.email ?? o!.customerId,
      customerEmail: person.get(o!.customerId)?.email,
      vendorName: shop.get(o!.vendorId) ?? person.get(o!.vendorId)?.name ?? o!.vendorId,
    })),
  });
}

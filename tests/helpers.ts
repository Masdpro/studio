/** Small builders for test data, plus a way to call route handlers as a given user. */
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { deliveryAgents, orders, users, vendors } from '@/db/schema';
import { eq } from 'drizzle-orm';

export function signInAs(userId: string | null) {
  const role = userId ? db.select({ role: users.role }).from(users).where(eq(users.id, userId)).get()?.role : undefined;
  (globalThis as any).__testSession.current = userId ? { user: { id: userId, role } } : null;
}

export function makeUser(opts: { role?: 'customer' | 'vendor' | 'delivery_agent' | 'admin'; approval?: 'pending' | 'approved' | 'rejected' } = {}) {
  const id = randomUUID();
  db.insert(users)
    .values({
      id,
      email: `${id}@test.local`,
      passwordHash: 'x',
      role: opts.role ?? 'customer',
      displayName: `User ${id.slice(0, 4)}`,
      createdAt: new Date(),
      emailVerifiedAt: new Date(),
      phone: '+2348000000000',
      phoneVerifiedAt: new Date(),
      approvalStatus: opts.approval ?? 'approved',
    })
    .run();
  return id;
}

export function makeVendor(approval: 'pending' | 'approved' | 'rejected' = 'approved') {
  const id = makeUser({ role: 'vendor', approval });
  db.insert(vendors)
    .values({ id, businessName: 'Test Shop', contactEmail: `${id}@test.local`, phone: '+2348000000000', streetAddress: '1 Test St', city: 'Lagos', country: 'Nigeria', status: 'Open', approvalStatus: approval })
    .run();
  return id;
}

export function makeAgent(approval: 'pending' | 'approved' | 'rejected' = 'approved') {
  const id = makeUser({ role: 'delivery_agent', approval });
  db.insert(deliveryAgents)
    .values({ id, name: 'Test Agent', email: `${id}@test.local`, phone: '+2348000000000', streetAddress: '2 Test St', city: 'Lagos', country: 'Nigeria', approvalStatus: approval })
    .run();
  return id;
}

export function makeOrder(opts: { customerId: string; vendorId: string; status: string; preference?: 'delivery' | 'pickup'; agentId?: string | null; total?: number }) {
  const id = randomUUID();
  db.insert(orders)
    .values({
      id,
      customerId: opts.customerId,
      vendorId: opts.vendorId,
      itemsJson: JSON.stringify([{ id: 'p1', name: 'Thing', price: opts.total ?? 1000, quantity: 1, vendorId: opts.vendorId }]),
      totalAmount: opts.total ?? 1000,
      status: opts.status,
      pickupAddress: '1 Test St',
      deliveryAddress: '3 Home St',
      deliveryFee: 0,
      createdAt: new Date(),
      deliveryAgentId: opts.agentId ?? null,
      deliveryPreference: opts.preference ?? 'delivery',
    })
    .run();
  return id;
}

export const orderStatus = (id: string) => db.select({ s: orders.status }).from(orders).where(eq(orders.id, id)).get()?.s;

export function jsonRequest(method: string, body?: unknown) {
  return new Request('http://test.local/api', { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}

export const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

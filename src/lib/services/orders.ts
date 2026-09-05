
import { db } from '@/db';
import { orders as ordersTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Order, CartItem } from '@/lib/types';
import { masterSampleOrders } from '@/lib/mockData';

export async function getOrdersForCustomer(customerId: string): Promise<Order[]> {
  const rows = db.select().from(ordersTable).where(eq(ordersTable.customerId, customerId)).orderBy(desc(ordersTable.createdAt)).all();
  if (rows.length === 0) return masterSampleOrders.filter((o) => o.customerId === customerId);
  return rows.map(rowToOrder);
}

export async function getOrdersForVendor(vendorId: string): Promise<Order[]> {
  const rows = db.select().from(ordersTable).where(eq(ordersTable.vendorId, vendorId)).orderBy(desc(ordersTable.createdAt)).all();
  if (rows.length === 0) return masterSampleOrders.filter((o) => o.vendorId === vendorId);
  return rows.map(rowToOrder);
}

export async function getOrdersForDeliveryAgent(agentId: string): Promise<Order[]> {
  const rows = db.select().from(ordersTable).where(eq(ordersTable.deliveryAgentId, agentId)).all();
  if (rows.length === 0) return masterSampleOrders.filter((o) => o.deliveryAgentId === agentId);
  return rows.map(rowToOrder);
}

export async function getOrderById(orderId: string): Promise<Order | undefined> {
  const row = db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).get();
  return row ? rowToOrder(row) : undefined;
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
  const id = randomUUID();
  db.insert(ordersTable)
    .values({
      id,
      customerId: data.customerId,
      vendorId: data.vendorId,
      itemsJson: JSON.stringify(data.items),
      totalAmount: data.totalAmount,
      status: data.status,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      deliveryFee: data.deliveryFee,
      estimatedDistance: data.estimatedDistance,
      createdAt: new Date(),
      deliveryAgentId: data.deliveryAgentId,
      deliveryPreference: data.deliveryPreference,
    })
    .run();
  return id;
}

export async function updateOrderStatus(orderId: string, status: Order['status'], extra: Partial<Order> = {}): Promise<void> {
  const { items, ...rest } = extra;
  db.update(ordersTable)
    .set({ status, ...(items ? { itemsJson: JSON.stringify(items) } : {}), ...(rest as any) })
    .where(eq(ordersTable.id, orderId))
    .run();
}

function rowToOrder(row: typeof ordersTable.$inferSelect): Order {
  return {
    id: row.id,
    customerId: row.customerId,
    vendorId: row.vendorId,
    items: JSON.parse(row.itemsJson) as CartItem[],
    totalAmount: row.totalAmount,
    status: row.status as Order['status'],
    pickupAddress: row.pickupAddress,
    deliveryAddress: row.deliveryAddress,
    deliveryFee: row.deliveryFee,
    estimatedDistance: row.estimatedDistance ?? undefined,
    createdAt: row.createdAt,
    deliveryAgentId: row.deliveryAgentId ?? undefined,
    deliveryPreference: row.deliveryPreference as Order['deliveryPreference'],
  };
}

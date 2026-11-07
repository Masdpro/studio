import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { timingSafeEqual } from 'crypto';
import { newDeliveryCode } from '@/lib/services/orders';

const MAX_ATTEMPTS = 5;

/** The order's delivery code, creating one for orders placed before codes existed. */
export function getDeliveryCode(orderId: string): string | null {
  const row = db.select({ code: orders.deliveryCode, pref: orders.deliveryPreference }).from(orders).where(eq(orders.id, orderId)).get();
  if (!row || row.pref !== 'delivery') return null;
  if (row.code) return row.code;
  const code = newDeliveryCode();
  db.update(orders).set({ deliveryCode: code }).where(eq(orders.id, orderId)).run();
  return code;
}

/** Checks the code an agent typed. Five wrong tries lock the order until support steps in. */
export function checkDeliveryCode(orderId: string, typed: unknown): { ok: true } | { ok: false; error: string } {
  const row = db.select({ code: orders.deliveryCode, attempts: orders.deliveryCodeAttempts }).from(orders).where(eq(orders.id, orderId)).get();
  if (!row) return { ok: false, error: 'Order not found.' };
  if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
    return { ok: false, error: 'Too many wrong codes for this order. Ask the customer to contact Closebuy support.' };
  }
  const code = row.code ?? getDeliveryCode(orderId);
  const input = typeof typed === 'string' ? typed.replace(/\D/g, '') : '';
  if (!/^\d{4}$/.test(input)) return { ok: false, error: "Enter the customer's 4-digit delivery code." };
  if (!code || !timingSafeEqual(Buffer.from(code), Buffer.from(input))) {
    db.update(orders).set({ deliveryCodeAttempts: sql`${orders.deliveryCodeAttempts} + 1` }).where(eq(orders.id, orderId)).run();
    const left = MAX_ATTEMPTS - (row.attempts ?? 0) - 1;
    return { ok: false, error: left > 0 ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong codes for this order. Ask the customer to contact Closebuy support.' };
  }
  return { ok: true };
}

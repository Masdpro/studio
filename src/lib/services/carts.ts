import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { carts } from '@/db/schema';
import type { CartItem } from '@/lib/types';
import { cleanCartItems } from '@/lib/cart-sync';

/** The customer's saved cart (empty if they have never saved one). */
export function getSavedCart(userId: string): { items: CartItem[]; updatedAt: number } {
  const row = db.select().from(carts).where(eq(carts.userId, userId)).get();
  if (!row) return { items: [], updatedAt: 0 };
  let items: CartItem[] = [];
  try {
    items = cleanCartItems(JSON.parse(row.items));
  } catch {
    items = [];
  }
  return { items, updatedAt: row.updatedAt.getTime() };
}

/** Replaces the customer's saved cart. */
export function saveCart(userId: string, input: unknown): { items: CartItem[]; updatedAt: number } {
  const items = cleanCartItems(input);
  const updatedAt = new Date();
  db.insert(carts)
    .values({ userId, items: JSON.stringify(items), updatedAt })
    .onConflictDoUpdate({ target: carts.userId, set: { items: JSON.stringify(items), updatedAt } })
    .run();
  return { items, updatedAt: updatedAt.getTime() };
}

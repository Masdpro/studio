import type { CartItem } from '@/lib/types';
import { cartLineKey } from '@/lib/cart-line';

/** Most lines one cart can hold (the orders route accepts up to 100 items too). */
export const MAX_CART_LINES = 100;

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined);
const whole = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : undefined;

/**
 * Keeps only well-formed cart lines. Prices here are display copies: checkout always re-prices
 * from the product records, so a tampered cart can never change what anyone pays.
 */
export function cleanCartItems(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return [];
  const out: CartItem[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const productId = str(r.productId, 64);
    const name = str(r.name, 200);
    const quantity = whole(r.quantity, 1, 999);
    const price = typeof r.price === 'number' && Number.isFinite(r.price) && r.price >= 0 ? r.price : undefined;
    if (!productId || !name || quantity === undefined || price === undefined) continue;
    const line: CartItem = { productId, name, price, quantity };
    const vendorId = str(r.vendorId, 64);
    const imageUrl = str(r.imageUrl, 1000);
    const aiHint = str(r.aiHint, 100);
    const color = str(r.color, 60);
    const size = str(r.size, 60);
    const maxQuantity = whole(r.maxQuantity, 0, 1_000_000);
    if (vendorId) line.vendorId = vendorId;
    if (imageUrl) line.imageUrl = imageUrl;
    if (aiHint) line.aiHint = aiHint;
    if (color) line.color = color;
    if (size) line.size = size;
    if (maxQuantity !== undefined) line.maxQuantity = maxQuantity;
    const key = cartLineKey(line);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= MAX_CART_LINES) break;
  }
  return out;
}

/**
 * Adds a guest cart (things picked before signing in) to the account's saved cart. The same
 * product, colour and size become one line with the larger quantity, never the two added up.
 */
export function mergeCarts(saved: CartItem[], guest: CartItem[]): CartItem[] {
  const out = saved.map((i) => ({ ...i }));
  for (const g of guest) {
    const hit = out.find((i) => cartLineKey(i) === cartLineKey(g));
    if (hit) hit.quantity = Math.max(hit.quantity, g.quantity);
    else out.push({ ...g });
  }
  return out.slice(0, MAX_CART_LINES);
}

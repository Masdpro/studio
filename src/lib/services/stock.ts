import { randomUUID } from 'crypto';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { products as productsTable, stockLevels, stockMovements, vendorBranches } from '@/db/schema';
import { createNotification } from '@/lib/services/notifications';
import { log } from '@/lib/log';

/**
 * Stock for vendors: a product either isn't tracked (no rows, always available) or has one or more
 * counts in stock_levels, split by where it's kept (the main shop or a branch) and, optionally, by
 * colour and size. products.stock always holds the total, so shoppers' "Only 3 left" / "Sold out"
 * keep working without knowing about the split.
 */

export const MAIN = 'main';
/** Alert level used when the vendor hasn't chosen one (matches the "Only N left" badge shoppers see). */
export const DEFAULT_LOW_STOCK = 5;
export const MAX_QUANTITY = 1_000_000;

export type StockRow = { location: string; color: string; size: string; quantity: number };
export type StockKey = { location: string; color: string; size: string };
export type StockLine = { productId: string; quantity: number; location?: string; color?: string; size?: string; orderId?: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Exec = typeof db | Tx;

const norm = (v: string | undefined | null) => (v ?? '').trim();
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function getStockRows(productId: string, exec: Exec = db): StockRow[] {
  return exec
    .select({ location: stockLevels.location, color: stockLevels.color, size: stockLevels.size, quantity: stockLevels.quantity })
    .from(stockLevels)
    .where(eq(stockLevels.productId, productId))
    .all();
}

export function getStockRowsFor(productIds: string[]): Map<string, StockRow[]> {
  const out = new Map<string, StockRow[]>();
  if (!productIds.length) return out;
  for (let i = 0; i < productIds.length; i += 500) {
    const rows = db.select().from(stockLevels).where(inArray(stockLevels.productId, productIds.slice(i, i + 500))).all();
    for (const r of rows) {
      if (!out.has(r.productId)) out.set(r.productId, []);
      out.get(r.productId)!.push({ location: r.location, color: r.color, size: r.size, quantity: r.quantity });
    }
  }
  return out;
}

/** How a product's stock is split, read from its rows. */
export function layoutOf(rows: StockRow[]) {
  const locations = [...new Set(rows.map((r) => r.location))];
  return {
    tracked: rows.length > 0,
    byLocation: locations.length > 1,
    locations,
    byColor: rows.some((r) => r.color !== ''),
    bySize: rows.some((r) => r.size !== ''),
  };
}

/**
 * Which count an order line draws from. Stock kept in one place serves every branch; stock split by
 * branch only serves the branch it's at. Returns null when nothing is stocked for that choice.
 */
export function resolveKey(rows: StockRow[], want: { location?: string; color?: string; size?: string }): StockKey | null {
  if (!rows.length) return null;
  const locations = [...new Set(rows.map((r) => r.location))];
  const location = locations.length === 1 ? locations[0] : locations.includes(norm(want.location) || MAIN) ? norm(want.location) || MAIN : null;
  if (location === null) return null;
  const at = rows.filter((r) => r.location === location);
  const byColor = at.some((r) => r.color !== '');
  const bySize = at.some((r) => r.size !== '');
  const match = at.find((r) => (byColor ? same(r.color, norm(want.color)) : r.color === '') && (bySize ? same(r.size, norm(want.size)) : r.size === ''));
  return match ? { location: match.location, color: match.color, size: match.size } : null;
}

/** Units available for one choice, or undefined if the product doesn't track stock. */
export function availableFor(rows: StockRow[], want: { location?: string; color?: string; size?: string }): number | undefined {
  if (!rows.length) return undefined;
  const key = resolveKey(rows, want);
  if (!key) return 0;
  return rows.find((r) => r.location === key.location && r.color === key.color && r.size === key.size)?.quantity ?? 0;
}

/** Colour/size combinations and their total across locations, for the shopper's option picker. */
export function variantTotals(rows: StockRow[]): { color: string; size: string; quantity: number }[] {
  if (!rows.some((r) => r.color !== '' || r.size !== '')) return [];
  const m = new Map<string, { color: string; size: string; quantity: number }>();
  for (const r of rows) {
    const k = `${r.color}\u0000${r.size}`;
    const cur = m.get(k) ?? { color: r.color, size: r.size, quantity: 0 };
    cur.quantity += r.quantity;
    m.set(k, cur);
  }
  return [...m.values()];
}

function recalcTotal(tx: Exec, productId: string): number | null {
  const rows = getStockRows(productId, tx);
  const total = rows.length ? rows.reduce((n, r) => n + r.quantity, 0) : null;
  tx.update(productsTable).set({ stock: total }).where(eq(productsTable.id, productId)).run();
  return total;
}

function logMovement(tx: Exec, m: { productId: string; key: StockKey; change: number; after: number; reason: (typeof stockMovements.$inferInsert)['reason']; orderId?: string; userId?: string }) {
  tx.insert(stockMovements).values({
    id: randomUUID(),
    productId: m.productId,
    location: m.key.location,
    color: m.key.color,
    size: m.key.size,
    change: m.change,
    quantityAfter: m.after,
    reason: m.reason,
    orderId: m.orderId ?? null,
    userId: m.userId ?? null,
    createdAt: new Date(),
  }).run();
}

class StockShortError extends Error {
  constructor(public productId: string, public available: number) { super('Out of stock'); }
}

/**
 * Takes units out of stock for an order, all or nothing. Lines for products that don't track stock
 * are skipped. On success the vendor is alerted about anything that ran low or sold out.
 */
export function reserveStock(lines: StockLine[]): { ok: true } | { ok: false; productId: string; available: number } {
  const before = new Map<string, number | null>();
  const soldOutKeys: { productId: string; key: StockKey }[] = [];
  try {
    db.transaction((tx) => {
      for (const l of lines) {
        const rows = getStockRows(l.productId, tx);
        if (!rows.length) continue;
        if (!before.has(l.productId)) before.set(l.productId, rows.reduce((n, r) => n + r.quantity, 0));
        const key = resolveKey(rows, l);
        if (!key) throw new StockShortError(l.productId, 0);
        const res = tx.update(stockLevels)
          .set({ quantity: sql`${stockLevels.quantity} - ${l.quantity}` })
          .where(and(eq(stockLevels.productId, l.productId), eq(stockLevels.location, key.location), eq(stockLevels.color, key.color), eq(stockLevels.size, key.size), gte(stockLevels.quantity, l.quantity)))
          .run();
        if (res.changes === 0) throw new StockShortError(l.productId, availableFor(rows, l) ?? 0);
        const after = (rows.find((r) => r.location === key.location && r.color === key.color && r.size === key.size)?.quantity ?? 0) - l.quantity;
        logMovement(tx, { productId: l.productId, key, change: -l.quantity, after, reason: 'order', orderId: l.orderId });
        if (after === 0) soldOutKeys.push({ productId: l.productId, key });
        recalcTotal(tx, l.productId);
      }
    });
  } catch (err) {
    if (err instanceof StockShortError) return { ok: false, productId: err.productId, available: err.available };
    throw err;
  }
  void alertVendors(before, soldOutKeys).catch((err) => log.error('Low-stock alert failed', { area: 'stock', err }));
  return { ok: true };
}

/** Puts units back (payment failed after reserving, or the order was cancelled before it left the shop). */
export function releaseStock(lines: StockLine[], reason: 'cancelled' = 'cancelled') {
  db.transaction((tx) => {
    for (const l of lines) {
      const rows = getStockRows(l.productId, tx);
      if (!rows.length) continue;
      // If the vendor has since changed how the product is counted, put it back where it fits best.
      const key = resolveKey(rows, l) ?? resolveKey(rows, { location: l.location }) ?? { location: rows[0].location, color: rows[0].color, size: rows[0].size };
      const cur = rows.find((r) => r.location === key.location && r.color === key.color && r.size === key.size)?.quantity ?? 0;
      tx.update(stockLevels)
        .set({ quantity: sql`${stockLevels.quantity} + ${l.quantity}` })
        .where(and(eq(stockLevels.productId, l.productId), eq(stockLevels.location, key.location), eq(stockLevels.color, key.color), eq(stockLevels.size, key.size)))
        .run();
      logMovement(tx, { productId: l.productId, key, change: l.quantity, after: cur + l.quantity, reason, orderId: l.orderId });
      recalcTotal(tx, l.productId);
    }
  });
}

export type StockInput = { location: string; color?: string; size?: string; quantity: number };

export class StockInputError extends Error {}

/**
 * Replaces a product's counts (the vendor's stock screen). rows = null stops tracking. Checks that
 * every location is the main shop or one of the vendor's branches and every colour/size is offered.
 */
export function setStock(productId: string, rows: StockInput[] | null, by: { userId?: string }): number | null {
  const product = db.select().from(productsTable).where(eq(productsTable.id, productId)).get();
  if (!product) throw new StockInputError('Product not found.');
  const branchIds = new Set(db.select({ id: vendorBranches.id }).from(vendorBranches).where(eq(vendorBranches.vendorId, product.vendorId)).all().map((b) => b.id));
  const colors = parseList(product.colorsJson);
  const sizes = parseList(product.sizesJson);

  const clean = new Map<string, StockRow>();
  for (const r of rows ?? []) {
    const location = norm(r.location) || MAIN;
    if (location !== MAIN && !branchIds.has(location)) throw new StockInputError('That branch is not one of yours.');
    if (product.branchId && location !== product.branchId) throw new StockInputError('This product is only sold at one branch.');
    const color = norm(r.color);
    const size = norm(r.size);
    const colorMatch = color ? colors.find((c) => same(c, color)) : '';
    const sizeMatch = size ? sizes.find((s) => same(s, size)) : '';
    if (colorMatch === undefined) throw new StockInputError(`"${color}" isn't one of this product's colours.`);
    if (sizeMatch === undefined) throw new StockInputError(`"${size}" isn't one of this product's sizes.`);
    const quantity = Math.floor(Number(r.quantity));
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > MAX_QUANTITY) throw new StockInputError('Enter a whole number of units (0 or more).');
    const row = { location, color: colorMatch, size: sizeMatch, quantity };
    clean.set(`${row.location}\u0000${row.color.toLowerCase()}\u0000${row.size.toLowerCase()}`, row);
  }
  if (rows && !clean.size) throw new StockInputError('Add at least one stock count, or choose not to track stock.');
  if (clean.size > 2000) throw new StockInputError('Too many stock counts for one product.');

  let total: number | null = null;
  const previousTotal = product.stock;
  const zeroed: StockKey[] = [];
  db.transaction((tx) => {
    const old = getStockRows(productId, tx);
    const oldByKey = new Map(old.map((r) => [`${r.location}\u0000${r.color.toLowerCase()}\u0000${r.size.toLowerCase()}`, r]));
    tx.delete(stockLevels).where(eq(stockLevels.productId, productId)).run();
    for (const [k, r] of clean) {
      tx.insert(stockLevels).values({ productId, ...r }).run();
      const was = oldByKey.get(k)?.quantity ?? 0;
      if (was !== r.quantity) logMovement(tx, { productId, key: r, change: r.quantity - was, after: r.quantity, reason: 'counted', userId: by.userId });
      if (r.quantity === 0 && was > 0) zeroed.push(r);
    }
    total = recalcTotal(tx, productId);
  });
  void alertVendors(new Map([[productId, previousTotal]]), zeroed.map((key) => ({ productId, key }))).catch(() => {});
  return total;
}

/** +/- on one count (quick buttons on the products list). Never goes below zero. */
export function adjustStock(productId: string, key: Partial<StockKey>, delta: number, by: { userId?: string }): number | null {
  const d = Math.trunc(Number(delta));
  if (!Number.isFinite(d) || d === 0 || Math.abs(d) > MAX_QUANTITY) throw new StockInputError('Enter how many units to add or remove.');
  let total: number | null = null;
  const before = db.select({ stock: productsTable.stock }).from(productsTable).where(eq(productsTable.id, productId)).get()?.stock ?? null;
  let soldOut: StockKey | null = null;
  db.transaction((tx) => {
    const rows = getStockRows(productId, tx);
    if (!rows.length) throw new StockInputError('Turn on stock tracking for this product first.');
    const target = rows.length === 1 ? rows[0] : rows.find((r) => r.location === (key.location ?? MAIN) && same(r.color, key.color ?? '') && same(r.size, key.size ?? ''));
    if (!target) throw new StockInputError('That stock count was not found.');
    const next = Math.min(MAX_QUANTITY, Math.max(0, target.quantity + d));
    if (next === target.quantity) { total = recalcTotal(tx, productId); return; }
    tx.update(stockLevels).set({ quantity: next })
      .where(and(eq(stockLevels.productId, productId), eq(stockLevels.location, target.location), eq(stockLevels.color, target.color), eq(stockLevels.size, target.size)))
      .run();
    logMovement(tx, { productId, key: target, change: next - target.quantity, after: next, reason: 'adjusted', userId: by.userId });
    if (next === 0) soldOut = target;
    total = recalcTotal(tx, productId);
  });
  void alertVendors(new Map([[productId, before]]), soldOut ? [{ productId, key: soldOut }] : []).catch(() => {});
  return total;
}

/** Sets every count to zero. A product that wasn't tracked starts tracking with zero at its shop. */
export function markSoldOut(productId: string, by: { userId?: string }) {
  const product = db.select({ branchId: productsTable.branchId }).from(productsTable).where(eq(productsTable.id, productId)).get();
  if (!product) return;
  db.transaction((tx) => {
    const rows = getStockRows(productId, tx);
    if (!rows.length) {
      const key = { location: product.branchId ?? MAIN, color: '', size: '' };
      tx.insert(stockLevels).values({ productId, ...key, quantity: 0 }).run();
      logMovement(tx, { productId, key, change: 0, after: 0, reason: 'sold_out', userId: by.userId });
    }
    for (const r of rows) {
      if (r.quantity === 0) continue;
      tx.update(stockLevels).set({ quantity: 0 })
        .where(and(eq(stockLevels.productId, productId), eq(stockLevels.location, r.location), eq(stockLevels.color, r.color), eq(stockLevels.size, r.size)))
        .run();
      logMovement(tx, { productId, key: r, change: -r.quantity, after: 0, reason: 'sold_out', userId: by.userId });
    }
    recalcTotal(tx, productId);
  });
}

export function getMovements(productId: string, limit = 30) {
  return db.select().from(stockMovements).where(eq(stockMovements.productId, productId)).orderBy(desc(stockMovements.createdAt)).limit(limit).all();
}

/** Names for locations ('main' -> "Main shop", branch id -> branch name) for one vendor. */
export function locationNames(vendorId: string): Record<string, string> {
  const out: Record<string, string> = { [MAIN]: 'Main shop' };
  for (const b of db.select({ id: vendorBranches.id, name: vendorBranches.name }).from(vendorBranches).where(eq(vendorBranches.vendorId, vendorId)).all()) out[b.id] = b.name;
  return out;
}

export function describeKey(key: StockKey, names: Record<string, string>, multiLocation: boolean) {
  const parts = [key.color, key.size].filter(Boolean);
  const where = multiLocation || key.location !== MAIN ? names[key.location] ?? 'a branch' : '';
  return [parts.join(' / '), where && `at ${where}`].filter(Boolean).join(' ');
}

/** Tells the vendor when a product falls to its low-stock level, sells out, or one option sells out. */
async function alertVendors(before: Map<string, number | null>, soldOutKeys: { productId: string; key: StockKey }[]) {
  const ids = [...new Set([...before.keys(), ...soldOutKeys.map((k) => k.productId)])];
  if (!ids.length) return;
  const products = db.select().from(productsTable).where(inArray(productsTable.id, ids)).all();
  for (const p of products) {
    if (p.stock === null) continue;
    const prev = before.get(p.id);
    const level = p.lowStockAt ?? DEFAULT_LOW_STOCK;
    const link = '/vendor/dashboard/products?filter=restock';
    if (p.stock === 0 && (prev === undefined || prev === null || prev > 0)) {
      await createNotification({ userId: p.vendorId, message: `Sold out: ${p.name}. Restock it so customers can order it again.`, category: 'Activity', link, iconName: 'PackageX' });
      continue;
    }
    if (p.stock > 0 && p.stock <= level && (prev === undefined || prev === null || prev > level)) {
      await createNotification({ userId: p.vendorId, message: `Running low: only ${p.stock} ${p.name} left.`, category: 'Activity', link, iconName: 'PackageMinus' });
    }
    // One colour/size/branch running out while others are still in stock.
    const keys = soldOutKeys.filter((k) => k.productId === p.id);
    if (keys.length && p.stock > 0) {
      const names = locationNames(p.vendorId);
      const multi = new Set(getStockRows(p.id).map((r) => r.location)).size > 1;
      const what = keys.map((k) => describeKey(k.key, names, multi)).filter(Boolean).join(', ');
      if (what) await createNotification({ userId: p.vendorId, message: `${p.name} (${what}) is sold out.`, category: 'Activity', link, iconName: 'PackageX' });
    }
  }
}

/** Products the vendor should restock: at or below their low-stock level, or with an option/branch at zero. */
export function restockList(vendorId: string) {
  const products = db.select().from(productsTable).where(eq(productsTable.vendorId, vendorId)).all().filter((p) => p.stock !== null && !p.paused);
  const rows = getStockRowsFor(products.map((p) => p.id));
  return products
    .map((p) => {
      const r = rows.get(p.id) ?? [];
      const level = p.lowStockAt ?? DEFAULT_LOW_STOCK;
      const emptyParts = r.length > 1 ? r.filter((x) => x.quantity === 0).length : 0;
      return { id: p.id, name: p.name, imageUrl: p.imageUrl, stock: p.stock ?? 0, lowStockAt: level, emptyParts, branchId: p.branchId };
    })
    .filter((p) => p.stock <= p.lowStockAt || p.emptyParts > 0)
    .sort((a, b) => a.stock - b.stock);
}

function parseList(json: string | null): string[] {
  try {
    const v = json ? JSON.parse(json) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];
  } catch {
    return [];
  }
}

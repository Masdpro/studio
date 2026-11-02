
import { db } from '@/db';
import { products as productsTable, users as usersTable } from '@/db/schema';
import { and, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Product } from '@/lib/types';
import { sampleProductsForMockOrders } from '@/lib/mockData';
import { sanitizeGallery, sanitizeVideo, sanitizeOptions, sanitizeStock } from '@/lib/product-media';

export async function getProducts(opts: { includeSuspended?: boolean } = {}): Promise<Product[]> {
  const rows = db.select().from(productsTable).all();
  if (rows.length === 0) return sampleProductsForMockOrders;
  const hidden = opts.includeSuspended ? new Set<string>() : suspendedVendorIds();
  // Products that belong to a single branch only show on that vendor's store page; suspended shops don't show at all.
  return rows.filter((r) => !r.branchId && !hidden.has(r.vendorId)).map(rowToProduct);
}

/** Vendors an admin has suspended: their products are hidden and can't be ordered. */
export function suspendedVendorIds(): Set<string> {
  return new Set(db.select({ id: usersTable.id }).from(usersTable).where(isNotNull(usersTable.suspendedAt)).all().map((u) => u.id));
}

export async function getProductsByBranch(branchId: string): Promise<Product[]> {
  return db.select().from(productsTable).where(eq(productsTable.branchId, branchId)).all().map(rowToProduct);
}

export async function getMainProductsByVendor(vendorId: string): Promise<Product[]> {
  return db.select().from(productsTable).where(eq(productsTable.vendorId, vendorId)).all().filter((r) => !r.branchId).map(rowToProduct);
}

export async function getProductsByVendor(vendorId: string): Promise<Product[]> {
  const rows = db.select().from(productsTable).where(eq(productsTable.vendorId, vendorId)).all();
  if (rows.length === 0) return sampleProductsForMockOrders.filter((p) => p.vendorId === vendorId);
  return rows.map(rowToProduct);
}

export async function getProductById(productId: string): Promise<Product | undefined> {
  const row = db.select().from(productsTable).where(eq(productsTable.id, productId)).get();
  if (row) return rowToProduct(row);
  return sampleProductsForMockOrders.find((p) => p.id === productId);
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<string> {
  const id = randomUUID();
  db.insert(productsTable).values({ id, ...toRowFields(data) } as any).run();
  return id;
}

export async function updateProduct(productId: string, data: Partial<Product>): Promise<void> {
  db.update(productsTable).set(toRowFields(data) as any).where(eq(productsTable.id, productId)).run();
}

/**
 * Takes units out of stock for an order, all or nothing. Products that don't
 * track stock are skipped. Returns the first product that ran short, if any.
 */
export function reserveStock(lines: { productId: string; quantity: number }[]): { ok: true } | { ok: false; productId: string } {
  try {
    db.transaction((tx) => {
      for (const l of lines) {
        const row = tx.select({ stock: productsTable.stock }).from(productsTable).where(eq(productsTable.id, l.productId)).get();
        if (!row || row.stock === null) continue;
        const res = tx.update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${l.quantity}` })
          .where(and(eq(productsTable.id, l.productId), isNotNull(productsTable.stock), gte(productsTable.stock, l.quantity)))
          .run();
        if (res.changes === 0) throw new StockShortError(l.productId);
      }
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof StockShortError) return { ok: false, productId: err.productId };
    throw err;
  }
}

/** Puts reserved units back (e.g. when payment fails after reserving). */
export function releaseStock(lines: { productId: string; quantity: number }[]) {
  for (const l of lines) {
    db.update(productsTable)
      .set({ stock: sql`${productsTable.stock} + ${l.quantity}` })
      .where(and(eq(productsTable.id, l.productId), isNotNull(productsTable.stock)))
      .run();
  }
}

class StockShortError extends Error {
  constructor(public productId: string) { super('Out of stock'); }
}

export async function deleteProduct(productId: string): Promise<void> {
  db.delete(productsTable).where(eq(productsTable.id, productId)).run();
}

/** Turns product input into table columns: the extra photos are stored as JSON, and only our own uploads are kept. */
function toRowFields(data: Partial<Product>) {
  const { galleryImages, videoUrl, colors, sizes, stock, ...rest } = data as any;
  const out: Record<string, unknown> = { ...rest };
  if ('stock' in (data as object)) out.stock = sanitizeStock(stock);
  if (galleryImages !== undefined) out.galleryJson = JSON.stringify(sanitizeGallery(galleryImages));
  if (videoUrl !== undefined) out.videoUrl = sanitizeVideo(videoUrl) ?? null;
  if (colors !== undefined) out.colorsJson = JSON.stringify(sanitizeOptions(colors));
  if (sizes !== undefined) out.sizesJson = JSON.stringify(sanitizeOptions(sizes));
  return out;
}

function parseGallery(json: string | null): string[] {
  try { return sanitizeGallery(json ? JSON.parse(json) : []); } catch { return []; }
}

function parseOptions(json: string | null): string[] {
  try { return sanitizeOptions(json ? JSON.parse(json) : []); } catch { return []; }
}

function rowToProduct(row: typeof productsTable.$inferSelect): Product {
  return {
    id: row.id,
    vendorId: row.vendorId,
    name: row.name,
    description: row.description,
    price: row.price,
    discountPrice: row.discountPrice ?? undefined,
    imageUrl: row.imageUrl,
    category: row.category ?? undefined,
    aiHint: row.aiHint ?? undefined,
    isAwoof: !!row.isAwoof,
    branchId: row.branchId ?? undefined,
    galleryImages: parseGallery(row.galleryJson),
    videoUrl: row.videoUrl ?? undefined,
    colors: parseOptions(row.colorsJson),
    sizes: parseOptions(row.sizesJson),
    stock: row.stock ?? undefined,
  };
}

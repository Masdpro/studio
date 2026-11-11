
import { db } from '@/db';
import { products as productsTable, users as usersTable } from '@/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { getStockRows, getStockRowsFor, setStock, variantTotals, MAIN } from '@/lib/services/stock';
import { randomUUID } from 'crypto';
import type { Product } from '@/lib/types';
import { sampleProductsForMockOrders } from '@/lib/mockData';
import { useSampleData } from '@/lib/sample-mode';
import { sanitizeGallery, sanitizeVideo, sanitizeOptions, sanitizeStock } from '@/lib/product-media';

export async function getProducts(opts: { includeSuspended?: boolean } = {}): Promise<Product[]> {
  const rows = db.select().from(productsTable).all();
  if (rows.length === 0 && useSampleData) return sampleProductsForMockOrders;
  const hidden = opts.includeSuspended ? new Set<string>() : suspendedVendorIds();
  // Products that belong to a single branch only show on that vendor's store page; suspended shops and
  // paused products don't show at all (admins see everything).
  return withVariants(rows.filter((r) => !r.branchId && !hidden.has(r.vendorId) && (opts.includeSuspended || !r.paused)).map(rowToProduct));
}

/** Vendors an admin has suspended: their products are hidden and can't be ordered. */
export function suspendedVendorIds(): Set<string> {
  return new Set(db.select({ id: usersTable.id }).from(usersTable).where(isNotNull(usersTable.suspendedAt)).all().map((u) => u.id));
}

/** A branch's own products, paused ones included (for the people managing them). */
export async function getProductsByBranch(branchId: string): Promise<Product[]> {
  return withVariants(db.select().from(productsTable).where(eq(productsTable.branchId, branchId)).all().map(rowToProduct));
}

/** The vendor's main-shop products, paused ones included (for the vendor's own management screens). */
export async function getMainProductsByVendor(vendorId: string): Promise<Product[]> {
  return withVariants(db.select().from(productsTable).where(eq(productsTable.vendorId, vendorId)).all().filter((r) => !r.branchId).map(rowToProduct));
}

/** Everything a vendor sells, for their public store pages (paused products are left out). */
export async function getProductsByVendor(vendorId: string): Promise<Product[]> {
  const rows = db.select().from(productsTable).where(eq(productsTable.vendorId, vendorId)).all();
  if (rows.length === 0 && useSampleData) return sampleProductsForMockOrders.filter((p) => p.vendorId === vendorId);
  return withVariants(rows.filter((r) => !r.paused).map(rowToProduct));
}

export async function getProductById(productId: string): Promise<Product | undefined> {
  const row = db.select().from(productsTable).where(eq(productsTable.id, productId)).get();
  if (row) return withVariants([rowToProduct(row)])[0];
  if (!useSampleData) return undefined;
  return sampleProductsForMockOrders.find((p) => p.id === productId);
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<string> {
  const id = randomUUID();
  const { stock, ...fields } = toRowFields(data);
  db.insert(productsTable).values({ id, ...fields } as any).run();
  if (typeof stock === 'number') setStock(id, [{ location: data.branchId ?? MAIN, quantity: stock }], {});
  return id;
}

export async function updateProduct(productId: string, data: Partial<Product>): Promise<void> {
  const { stock, ...fields } = toRowFields(data);
  if (Object.keys(fields).length) db.update(productsTable).set(fields as any).where(eq(productsTable.id, productId)).run();
  // The simple "Quantity in stock" field sets one overall count. Products counted per branch, colour or
  // size are managed on the stock screen instead, so that field leaves them alone.
  if ('stock' in (data as object)) {
    const rows = getStockRows(productId);
    const simple = rows.length <= 1 && rows.every((r) => r.color === '' && r.size === '');
    if (simple) {
      const product = db.select({ branchId: productsTable.branchId }).from(productsTable).where(eq(productsTable.id, productId)).get();
      setStock(productId, typeof stock === 'number' ? [{ location: rows[0]?.location ?? product?.branchId ?? MAIN, quantity: stock }] : null, {});
    }
  }
}

/** Adds each product's per colour/size totals, so the option picker can show what's sold out. */
function withVariants(list: Product[]): Product[] {
  const rows = getStockRowsFor(list.filter((p) => p.stock !== undefined).map((p) => p.id));
  return list.map((p) => {
    const v = variantTotals(rows.get(p.id) ?? []);
    return v.length ? { ...p, variantStock: v } : p;
  });
}

export { reserveStock, releaseStock } from '@/lib/services/stock';

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
    paused: !!row.paused,
    lowStockAt: row.lowStockAt ?? undefined,
  };
}

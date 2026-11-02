
import { db } from '@/db';
import { products as productsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Product } from '@/lib/types';
import { sampleProductsForMockOrders } from '@/lib/mockData';
import { sanitizeGallery, sanitizeVideo, sanitizeOptions } from '@/lib/product-media';

export async function getProducts(): Promise<Product[]> {
  const rows = db.select().from(productsTable).all();
  if (rows.length === 0) return sampleProductsForMockOrders;
  // Products that belong to a single branch only show on that vendor's store page.
  return rows.filter((r) => !r.branchId).map(rowToProduct);
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

export async function deleteProduct(productId: string): Promise<void> {
  db.delete(productsTable).where(eq(productsTable.id, productId)).run();
}

/** Turns product input into table columns: the extra photos are stored as JSON, and only our own uploads are kept. */
function toRowFields(data: Partial<Product>) {
  const { galleryImages, videoUrl, colors, sizes, ...rest } = data as any;
  const out: Record<string, unknown> = { ...rest };
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
  };
}


import { db } from '@/db';
import { vendors as vendorsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Vendor } from '@/lib/types';
import { sampleVendors } from '@/lib/mockData';
import { slugify } from '@/lib/slug';

export async function getVendors(): Promise<Vendor[]> {
  const rows = db.select().from(vendorsTable).all();
  if (rows.length === 0) return sampleVendors;
  return rows.map(rowToVendor);
}

export async function getVendorById(vendorId: string): Promise<Vendor | undefined> {
  const row = db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId)).get();
  if (row) return rowToVendor(row);
  return sampleVendors.find((v) => v.id === vendorId);
}

export async function getVendorsByLocationTag(locationTag: string): Promise<Vendor[]> {
  const rows = db.select().from(vendorsTable).where(eq(vendorsTable.locationTag, locationTag)).all();
  if (rows.length === 0) return sampleVendors.filter((v) => v.locationTag === locationTag);
  return rows.map(rowToVendor);
}

/** Vendors whose stall sits inside the given local market. */
export async function getVendorsByMarketId(marketId: string): Promise<Vendor[]> {
  const rows = db.select().from(vendorsTable).where(eq(vendorsTable.marketId, marketId)).all();
  if (rows.length === 0) return sampleVendors.filter((v) => v.marketId === marketId);
  return rows.map(rowToVendor);
}

export async function getVendorBySlug(slug: string): Promise<Vendor | undefined> {
  const row = db.select().from(vendorsTable).where(eq(vendorsTable.slug, slug)).get();
  return row ? rowToVendor(row) : undefined;
}

export function vendorSlugTaken(slug: string, excludeId?: string): boolean {
  const r = db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.slug, slug)).get();
  return !!r && r.id !== excludeId;
}

function uniqueSlug(input: string, vendorId: string): string {
  let base = slugify(input) || 'store';
  if (base.length < 3) base += '-store';
  let s = base;
  let i = 2;
  while (vendorSlugTaken(s, vendorId)) s = base + '-' + i++;
  return s;
}

/** Creates/updates a vendor profile. `vendorId` should match the signed-in user's id. */
export async function upsertVendor(vendorId: string, data: Partial<Vendor>): Promise<void> {
  const existing = db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId)).get();
  const d: any = { ...data };
  if (d.slug) d.slug = uniqueSlug(d.slug, vendorId);
  else if (!existing?.slug) d.slug = uniqueSlug(d.businessName ?? existing?.businessName ?? 'store', vendorId);
  if (existing) {
    db.update(vendorsTable).set(d).where(eq(vendorsTable.id, vendorId)).run();
  } else {
    db.insert(vendorsTable)
      .values({ id: vendorId, profileManaged: true, ...d })
      .run();
  }
}

export async function deleteVendor(vendorId: string): Promise<void> {
  db.delete(vendorsTable).where(eq(vendorsTable.id, vendorId)).run();
}

function rowToVendor(row: typeof vendorsTable.$inferSelect): Vendor {
  return {
    id: row.id,
    slug: row.slug ?? undefined,
    businessName: row.businessName,
    contactEmail: row.contactEmail,
    phone: row.phone,
    streetAddress: row.streetAddress,
    city: row.city,
    country: row.country,
    profileManaged: !!row.profileManaged,
    externalStoreUrl: row.externalStoreUrl ?? undefined,
    locationTag: row.locationTag ?? undefined,
    marketId: row.marketId ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    operatingHours: row.operatingHours ?? undefined,
    status: (row.status as Vendor['status']) ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
  };
}

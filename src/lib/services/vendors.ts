
import { db } from '@/db';
import { vendors as vendorsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Vendor } from '@/lib/types';
import { sampleVendors } from '@/lib/mockData';

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

/** Creates/updates a vendor profile. `vendorId` should match the signed-in user's id. */
export async function upsertVendor(vendorId: string, data: Partial<Vendor>): Promise<void> {
  const existing = db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId)).get();
  if (existing) {
    db.update(vendorsTable).set(data as any).where(eq(vendorsTable.id, vendorId)).run();
  } else {
    db.insert(vendorsTable)
      .values({ id: vendorId, profileManaged: true, ...(data as any) })
      .run();
  }
}

function rowToVendor(row: typeof vendorsTable.$inferSelect): Vendor {
  return {
    id: row.id,
    businessName: row.businessName,
    contactEmail: row.contactEmail,
    phone: row.phone,
    streetAddress: row.streetAddress,
    city: row.city,
    country: row.country,
    profileManaged: !!row.profileManaged,
    externalStoreUrl: row.externalStoreUrl ?? undefined,
    locationTag: row.locationTag ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    operatingHours: row.operatingHours ?? undefined,
    status: (row.status as Vendor['status']) ?? undefined,
  };
}

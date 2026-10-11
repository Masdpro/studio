import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { vendorBranches } from '@/db/schema';
import type { VendorBranch } from '@/lib/types';

function rowToBranch(r: typeof vendorBranches.$inferSelect): VendorBranch {
  return {
    id: r.id,
    vendorId: r.vendorId,
    name: r.name,
    streetAddress: r.streetAddress,
    city: r.city,
    country: r.country,
    locationTag: r.locationTag ?? undefined,
    marketId: r.marketId ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    phone: r.phone ?? undefined,
    operatingHours: r.operatingHours ?? undefined,
    status: (r.status as VendorBranch['status']) ?? undefined,
  };
}

export async function getAllBranches(): Promise<VendorBranch[]> {
  return db.select().from(vendorBranches).all().map(rowToBranch);
}

export async function getBranchesByVendor(vendorId: string): Promise<VendorBranch[]> {
  return db.select().from(vendorBranches).where(eq(vendorBranches.vendorId, vendorId)).all().map(rowToBranch);
}

export async function getBranchById(id: string): Promise<VendorBranch | undefined> {
  const r = db.select().from(vendorBranches).where(eq(vendorBranches.id, id)).get();
  return r ? rowToBranch(r) : undefined;
}

export async function createBranch(vendorId: string, data: Omit<VendorBranch, 'id' | 'vendorId'>): Promise<string> {
  const id = randomUUID();
  db.insert(vendorBranches).values({ id, vendorId, ...data, createdAt: new Date() }).run();
  return id;
}

/** Only touches a branch that belongs to `vendorId`. Returns false if there is no such branch. */
export async function updateBranch(id: string, vendorId: string, data: Partial<Omit<VendorBranch, 'id' | 'vendorId'>>): Promise<boolean> {
  const res = db.update(vendorBranches).set(data).where(and(eq(vendorBranches.id, id), eq(vendorBranches.vendorId, vendorId))).run();
  return res.changes > 0;
}

export async function deleteBranch(id: string, vendorId: string): Promise<boolean> {
  const res = db.delete(vendorBranches).where(and(eq(vendorBranches.id, id), eq(vendorBranches.vendorId, vendorId))).run();
  return res.changes > 0;
}

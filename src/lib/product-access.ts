import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { products } from '@/db/schema';
import { getBranchForUser } from '@/lib/roles';

/**
 * Whether this user may manage a product's stock and visibility: the vendor who owns it, or the
 * branch account of the branch it belongs to. Returns the product's vendor id when allowed.
 */
export function manageableProduct(productId: string, userId: string): { ok: true; vendorId: string; branchId: string | null } | { ok: false; status: number; error: string } {
  const p = db.select({ vendorId: products.vendorId, branchId: products.branchId }).from(products).where(eq(products.id, productId)).get();
  if (!p) return { ok: false, status: 404, error: 'Product not found.' };
  if (p.vendorId === userId) return { ok: true, vendorId: p.vendorId, branchId: p.branchId };
  const branch = getBranchForUser(userId);
  if (branch && p.branchId === branch.id) return { ok: true, vendorId: p.vendorId, branchId: p.branchId };
  return { ok: false, status: 403, error: 'You do not manage this product.' };
}

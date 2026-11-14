import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, vendors, deliveryAgents, vendorBranches, serviceProviders } from '@/db/schema';

export type AppRole = 'customer' | 'vendor' | 'delivery_agent' | 'provider' | 'admin' | 'branch';

/** The branch this login belongs to, if it is a branch account. */
export function getBranchForUser(userId: string): { id: string; vendorId: string; name: string } | null {
  const b = db.select().from(vendorBranches).where(eq(vendorBranches.accountUserId, userId)).get();
  return b ? { id: b.id, vendorId: b.vendorId, name: b.name } : null;
}

/** branch id -> login email, for one vendor's branches (only ever sent to that vendor). */
export function branchAccountEmails(vendorId: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const b of db.select().from(vendorBranches).where(eq(vendorBranches.vendorId, vendorId)).all()) {
    if (!b.accountUserId) continue;
    const u = db.select({ email: users.email }).from(users).where(eq(users.id, b.accountUserId)).get();
    if (u) out[b.id] = u.email;
  }
  return out;
}

/**
 * Everything an account can do. Every non-admin account is a customer; vendor (product store),
 * provider (service business), delivery-agent and branch profiles hang off that same account
 * (same id), so one login covers all.
 * Accounts created with the old vendor / delivery_agent role keep working.
 */
export function getUserRoles(userId: string): AppRole[] {
  const u = db.select().from(users).where(eq(users.id, userId)).get();
  if (!u) return [];
  if (u.role === 'admin') return ['admin'];
  const roles: AppRole[] = ['customer'];
  if (u.role === 'vendor' || db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, userId)).get()) roles.push('vendor');
  if (u.role === 'delivery_agent' || db.select({ id: deliveryAgents.id }).from(deliveryAgents).where(eq(deliveryAgents.id, userId)).get()) roles.push('delivery_agent');
  if (u.role === 'provider' || db.select({ id: serviceProviders.id }).from(serviceProviders).where(eq(serviceProviders.id, userId)).get()) roles.push('provider');
  if (getBranchForUser(userId)) roles.push('branch');
  return roles;
}

/** The name shown for an account (display name, else email). */
export function getDisplayName(userId: string): string | null {
  const u = db.select({ n: users.displayName, e: users.email }).from(users).where(eq(users.id, userId)).get();
  return u ? (u.n ?? u.e) : null;
}

/**
 * The business this account sells for, if any: its own store (vendor id = account id), or the
 * store a branch login belongs to. Used to stop anyone ordering from their own business.
 */
export function ownBusinessId(userId: string): string | null {
  if (db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, userId)).get()) return userId;
  return getBranchForUser(userId)?.vendorId ?? null;
}

export function userHasRole(userId: string, role: AppRole): boolean {
  return getUserRoles(userId).includes(role);
}

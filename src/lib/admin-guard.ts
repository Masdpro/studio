import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';

/** Returns the signed-in admin's session, or null if the caller isn't one. */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

/** True if this account is the super admin (checked against the database, not the session). */
export function isSuperAdmin(userId: string): boolean {
  const u = db.select({ role: users.role, isSuperAdmin: users.isSuperAdmin }).from(users).where(eq(users.id, userId)).get();
  return !!u && u.role === 'admin' && !!u.isSuperAdmin;
}

/** Returns the session only if the caller is the super admin, the one account allowed to manage admins. */
export async function requireSuperAdminSession() {
  const session = await requireAdminSession();
  if (!session || !isSuperAdmin(session.user.id)) return null;
  return session;
}

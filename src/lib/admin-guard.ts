import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Returns the signed-in admin's session, or null if the caller isn't one. */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { isSuperAdmin, requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getUserRoles } from '@/lib/roles';

/** Every account (newest first) with its roles and status, for support to look up and suspend. */
export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const rows = db.select().from(users).orderBy(desc(users.createdAt)).limit(1000).all();
  return NextResponse.json({
    me: { id: session.user.id, isSuperAdmin: isSuperAdmin(session.user.id) },
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.displayName ?? '',
      phone: u.phone ?? '',
      roles: getUserRoles(u.id),
      approvalStatus: u.approvalStatus,
      emailVerified: !!u.emailVerifiedAt,
      suspended: !!u.suspendedAt,
      suspendedReason: u.suspendedReason ?? '',
      createdAt: u.createdAt,
      isSuperAdmin: u.role === 'admin' && !!u.isSuperAdmin,
      // Admins added by invite have no usable password until they open the link.
      invitePending: u.role === 'admin' && !u.emailVerifiedAt,
    })),
  });
}

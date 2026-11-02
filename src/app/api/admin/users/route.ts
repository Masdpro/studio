import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getUserRoles } from '@/lib/roles';

/** Every account (newest first) with its roles and status, for support to look up and suspend. */
export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const rows = db.select().from(users).orderBy(desc(users.createdAt)).limit(1000).all();
  return NextResponse.json({
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
    })),
  });
}

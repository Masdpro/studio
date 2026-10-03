import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getVerificationState } from '@/lib/verification';

/** Every vendor and delivery agent with their verification progress (pending first). */
export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const rows = db.select().from(users).where(inArray(users.role, ['vendor', 'delivery_agent'])).all();
  const order = { pending: 0, rejected: 1, approved: 2 } as const;
  const list = rows
    .map((u) => ({ id: u.id, name: u.displayName ?? u.email, createdAt: u.createdAt, ...getVerificationState(u.id)! }))
    .sort((a, b) => order[a.approvalStatus] - order[b.approvalStatus] || b.createdAt.getTime() - a.createdAt.getTime());
  return NextResponse.json({ accounts: list });
}

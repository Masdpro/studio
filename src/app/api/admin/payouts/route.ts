import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users, withdrawals } from '@/db/schema';
import { refreshPendingWithdrawals, maskAccount } from '@/lib/services/withdrawals';
import { platformFeePercent } from '@/lib/services/earnings';

/** Recent withdrawals across all vendors and agents. */
export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  await refreshPendingWithdrawals();
  const rows = db
    .select({ w: withdrawals, email: users.email, name: users.displayName, suspendedAt: users.suspendedAt })
    .from(withdrawals)
    .leftJoin(users, eq(users.id, withdrawals.userId))
    .orderBy(desc(withdrawals.createdAt))
    .limit(200)
    .all();
  return NextResponse.json({
    serviceFeePercent: platformFeePercent(),
    withdrawals: rows.map(({ w, email, name, suspendedAt }) => ({
      id: w.id,
      userId: w.userId,
      user: name ?? email ?? w.userId,
      email,
      suspended: !!suspendedAt,
      amount: w.amount,
      fee: w.fee,
      net: w.net,
      status: w.status,
      failureReason: w.failureReason,
      bank: `${w.bankName} ${maskAccount(w.accountNumber)} · ${w.accountName}`,
      createdAt: w.createdAt.getTime(),
      completedAt: w.completedAt?.getTime() ?? null,
    })),
  });
}

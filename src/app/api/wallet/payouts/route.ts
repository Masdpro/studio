import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserRoles } from '@/lib/roles';
import { platformFeePercent } from '@/lib/services/earnings';
import {
  MIN_WITHDRAWAL,
  getBankAccount,
  getEarningsSummary,
  listWithdrawals,
  maskAccount,
  refreshPendingWithdrawals,
  withdrawalBlockReason,
} from '@/lib/services/withdrawals';

/** Earnings, payout bank account and recent withdrawals for a vendor / delivery agent. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  const userId = session.user.id;
  const roles = getUserRoles(userId);
  const earner = roles.includes('vendor') || roles.includes('delivery_agent');
  if (!earner) return NextResponse.json({ earner: false });

  await refreshPendingWithdrawals(userId);
  const bank = getBankAccount(userId);
  return NextResponse.json({
    earner: true,
    summary: getEarningsSummary(userId),
    bankAccount: bank ? { bankCode: bank.bankCode, bankName: bank.bankName, accountName: bank.accountName, accountNumber: maskAccount(bank.accountNumber) } : null,
    blockReason: withdrawalBlockReason(userId),
    minWithdrawal: MIN_WITHDRAWAL,
    serviceFeePercent: platformFeePercent(),
    withdrawals: listWithdrawals(userId).map((w) => ({
      id: w.id,
      amount: w.amount,
      fee: w.fee,
      net: w.net,
      status: w.status,
      failureReason: w.failureReason,
      bankName: w.bankName,
      accountNumber: maskAccount(w.accountNumber),
      createdAt: w.createdAt.getTime(),
    })),
  });
}

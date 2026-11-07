import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getUserRoles } from '@/lib/roles';
import { clearFailedPasswords, isLockedOut, recordFailedPassword } from '@/lib/login-throttle';
import { maskAccount, saveBankAccount } from '@/lib/services/withdrawals';

/** PUT { bankCode, accountNumber, password }: sets where withdrawals are paid. Needs the account password. */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  const userId = session.user.id;
  const roles = getUserRoles(userId);
  if (!roles.includes('vendor') && !roles.includes('delivery_agent')) {
    return NextResponse.json({ error: 'Only vendors and delivery agents can add a payout account.' }, { status: 403 });
  }
  const { bankCode, accountNumber, password } = (await request.json().catch(() => ({}))) as { bankCode?: string; accountNumber?: string; password?: string };
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (user.suspendedAt) return NextResponse.json({ error: 'Your account is suspended.' }, { status: 403 });
  if (isLockedOut(user.email)) return NextResponse.json({ error: 'Too many wrong passwords. Wait 15 minutes and try again.' }, { status: 429 });
  if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
    recordFailedPassword(user.email);
    return NextResponse.json({ error: 'That password is not right.' }, { status: 401 });
  }
  clearFailedPasswords(user.email);
  try {
    const saved = await saveBankAccount(userId, String(bankCode ?? ''), String(accountNumber ?? '').trim());
    return NextResponse.json({ ok: true, bankAccount: { ...saved, accountNumber: maskAccount(saved.accountNumber) } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the bank account.' }, { status: 400 });
  }
}

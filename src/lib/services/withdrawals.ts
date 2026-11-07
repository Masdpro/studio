import { db } from '@/db';
import { bankAccounts, users, walletTransactions, withdrawals, wallets } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

/** Withdrawals that are still in progress (money held from the wallet, not yet paid or refunded). */
export const OPEN_STATUSES = ['awaiting_approval', 'awaiting_otp', 'pending'] as const;
import { randomUUID } from 'crypto';
import { applyEntry, postEntry, InsufficientFundsError } from '@/lib/services/wallets';
import { createNotification } from '@/lib/services/notifications';
import { getUserRoles } from '@/lib/roles';
import { getVerificationState } from '@/lib/verification';
import { createTransferRecipient, finalizeTransfer, initiateTransfer, listBanks, resendTransferOtp, resolveBankAccount, verifyTransfer } from '@/lib/paystack';
import { sendEmail } from '@/lib/notify';
import { renderEmail } from '@/lib/email-template';

export const MIN_WITHDRAWAL = 1000;
/** After a bank account is changed (not first added), payouts wait this long, in case the change wasn't the owner. */
const BANK_CHANGE_HOLD_MS = 24 * 60 * 60 * 1000;

/** Paystack's fee per transfer, taken out of the amount withdrawn. */
export function transferFee(amount: number): number {
  if (amount <= 5000) return 10;
  if (amount <= 50000) return 25;
  return 50;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const naira = (n: number) => `₦${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export const maskAccount = (n: string) => `••••${n.slice(-4)}`;

type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * What a vendor / agent can take out: money they earned (sales and delivery fees, less any
 * reversals) that hasn't already been withdrawn, and no more than what's in the wallet now.
 * Wallet top-ups can be spent on Closebuy but not withdrawn.
 */
export function getEarningsSummary(userId: string, tx: Db = db) {
  const rows = tx
    .select({ type: walletTransactions.type, amount: walletTransactions.amount })
    .from(walletTransactions)
    .where(and(eq(walletTransactions.userId, userId), inArray(walletTransactions.type, ['sale', 'delivery_earning', 'earning_reversal', 'withdrawal', 'withdrawal_reversal'])))
    .all();
  let earned = 0;
  let paidOut = 0;
  for (const r of rows) {
    if (r.type === 'withdrawal' || r.type === 'withdrawal_reversal') paidOut += r.amount;
    else earned += r.amount;
  }
  const balance = tx.select().from(wallets).where(eq(wallets.userId, userId)).get()?.balance ?? 0;
  return {
    balance: round2(balance),
    totalEarned: round2(earned),
    totalWithdrawn: round2(-paidOut),
    withdrawable: round2(Math.max(0, Math.min(balance, earned + paidOut))),
  };
}

export function getBankAccount(userId: string) {
  return db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId)).get() ?? null;
}

/** Why this user can't withdraw right now, or null if they can. */
export function withdrawalBlockReason(userId: string): string | null {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return 'Account not found.';
  if (user.suspendedAt) return 'Your account is suspended, so withdrawals are on hold. Contact Closebuy support.';
  const roles = getUserRoles(userId);
  if (!roles.includes('vendor') && !roles.includes('delivery_agent')) return 'Only vendors and delivery agents can withdraw earnings.';
  const v = getVerificationState(userId);
  if (!v?.mayTrade) return 'Finish account verification and wait for approval before withdrawing.';
  const bank = getBankAccount(userId);
  if (!bank) return 'Add the bank account your withdrawals should go to.';
  const changed = bank.updatedAt.getTime() !== bank.createdAt.getTime();
  if (changed && Date.now() - bank.updatedAt.getTime() < BANK_CHANGE_HOLD_MS) {
    const hours = Math.ceil((BANK_CHANGE_HOLD_MS - (Date.now() - bank.updatedAt.getTime())) / 3600000);
    return `You changed your bank account recently. For your safety, withdrawals resume in about ${hours} hour${hours === 1 ? '' : 's'}.`;
  }
  return null;
}

export async function saveBankAccount(userId: string, bankCode: string, accountNumber: string) {
  if (!/^\d{10}$/.test(accountNumber)) throw new Error('Enter your 10-digit account number.');
  const bank = (await listBanks()).find((b) => b.code === bankCode);
  if (!bank) throw new Error('Choose your bank from the list.');
  const { accountName } = await resolveBankAccount(accountNumber, bankCode);
  const recipientCode = await createTransferRecipient({ name: accountName, accountNumber, bankCode });
  const existing = getBankAccount(userId);
  const now = new Date();
  if (existing) {
    db.update(bankAccounts).set({ bankCode, bankName: bank.name, accountNumber, accountName, recipientCode, updatedAt: now }).where(eq(bankAccounts.userId, userId)).run();
  } else {
    db.insert(bankAccounts).values({ userId, bankCode, bankName: bank.name, accountNumber, accountName, recipientCode, createdAt: now, updatedAt: now }).run();
  }
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (user) {
    await sendEmail(
      user.email,
      existing ? 'Your Closebuy payout bank account was changed' : 'Payout bank account added to Closebuy',
      renderEmail({
        greetingName: user.displayName,
        intro: [
          `Withdrawals from your Closebuy wallet will now go to ${accountName}, ${bank.name} ${maskAccount(accountNumber)}.`,
          ...(existing ? ['For your safety, withdrawals are paused for 24 hours after a change.'] : []),
        ],
        outro: ["If you didn't make this change, reset your password right away and contact support@cbuyapp.com."],
      }),
    );
  }
  return { bankName: bank.name, accountName, accountNumber };
}

async function notifyAdmins(message: string) {
  const admins = db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).all();
  for (const a of admins) await createNotification({ userId: a.id, message, category: 'Activity', link: '/admin/payouts', iconName: 'AlertTriangle' });
}

/**
 * Holds the amount from the wallet and queues the withdrawal for an admin to approve.
 * Nothing is sent to the bank until an admin approves it and confirms Paystack's OTP.
 */
export async function requestWithdrawal(userId: string, amountInput: number) {
  const amount = round2(amountInput);
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) throw new Error(`The minimum withdrawal is ${naira(MIN_WITHDRAWAL)}.`);
  const blocked = withdrawalBlockReason(userId);
  if (blocked) throw new Error(blocked);
  const bank = getBankAccount(userId)!;
  const fee = transferFee(amount);
  const net = round2(amount - fee);
  const reference = `wd_${randomUUID().replace(/-/g, '')}`;

  // Checks and the hold happen together, so two requests at once can't both pass.
  db.transaction((tx) => {
    const open = tx.select({ id: withdrawals.id }).from(withdrawals).where(and(eq(withdrawals.userId, userId), inArray(withdrawals.status, [...OPEN_STATUSES]))).get();
    if (open) throw new Error('You already have a withdrawal in progress. You can make another once it has been paid.');
    const { withdrawable } = getEarningsSummary(userId, tx);
    if (amount > withdrawable) throw new Error(`You can withdraw up to ${naira(withdrawable)} right now.`);
    applyEntry(tx, {
      id: `withdrawal:${reference}`,
      userId,
      type: 'withdrawal',
      amount: -amount,
      fee,
      requireFunds: true,
      description: `Withdrawal to ${bank.bankName} ${maskAccount(bank.accountNumber)}${fee ? ` · ${naira(fee)} transfer fee` : ''}`,
    });
    tx.insert(withdrawals).values({
      id: reference,
      userId,
      amount,
      fee,
      net,
      status: 'awaiting_approval',
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      createdAt: new Date(),
    }).run();
  });

  const who = db.select({ name: users.displayName, email: users.email }).from(users).where(eq(users.id, userId)).get();
  await notifyAdmins(`${who?.name ?? who?.email ?? 'A vendor'} asked to withdraw ${naira(amount)}. Approve it on the Payouts page.`);
  return db.select().from(withdrawals).where(eq(withdrawals.id, reference)).get()!;
}

function getWithdrawal(reference: string) {
  const w = db.select().from(withdrawals).where(eq(withdrawals.id, reference)).get();
  if (!w) throw new Error('Withdrawal not found.');
  return w;
}

/** Admin approves: asks Paystack to send the transfer. Paystack then texts/emails the owner an OTP to confirm it. */
export async function approveWithdrawal(reference: string) {
  const w = getWithdrawal(reference);
  if (w.status !== 'awaiting_approval') throw new Error('This withdrawal is no longer waiting for approval.');
  const user = db.select().from(users).where(eq(users.id, w.userId)).get();
  if (user?.suspendedAt) throw new Error('This account is suspended. Decline the withdrawal instead.');
  const bank = getBankAccount(w.userId);
  if (!bank) throw new Error('This person has no payout bank account any more. Decline the withdrawal instead.');
  // Claim it first so a double click can't start two transfers.
  const claimed = db.update(withdrawals).set({ status: 'pending' }).where(and(eq(withdrawals.id, reference), eq(withdrawals.status, 'awaiting_approval'))).run();
  if (claimed.changes !== 1) throw new Error('This withdrawal is no longer waiting for approval.');

  try {
    const result = await initiateTransfer({ amountNaira: w.net, recipientCode: bank.recipientCode, reference, reason: 'Closebuy earnings' });
    db.update(withdrawals).set({ transferCode: result.transferCode }).where(eq(withdrawals.id, reference)).run();
    if (result.status === 'otp') {
      db.update(withdrawals).set({ status: 'awaiting_otp' }).where(eq(withdrawals.id, reference)).run();
    } else if (result.status === 'success') {
      await settleWithdrawal(reference, 'success');
    } else if (result.status === 'failed' || result.status === 'reversed') {
      await settleWithdrawal(reference, result.status, 'Paystack declined the transfer.');
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Could not reach Paystack.';
    await settleWithdrawal(reference, 'failed', reason);
    throw new Error(`Paystack refused the transfer: ${reason} The money is back in their wallet.`);
  }
  return getWithdrawal(reference);
}

/** Admin types the OTP Paystack sent; the transfer is released to the bank. */
export async function confirmWithdrawalOtp(reference: string, otp: string) {
  const w = getWithdrawal(reference);
  if (w.status !== 'awaiting_otp' || !w.transferCode) throw new Error('This withdrawal is not waiting for an OTP.');
  const code = String(otp ?? '').trim();
  if (!/^\d{4,8}$/.test(code)) throw new Error('Enter the OTP Paystack sent you.');
  let status;
  try {
    ({ status } = await finalizeTransfer(w.transferCode, code));
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Paystack did not accept the OTP.');
  }
  db.update(withdrawals).set({ status: 'pending' }).where(and(eq(withdrawals.id, reference), eq(withdrawals.status, 'awaiting_otp'))).run();
  if (status === 'success') await settleWithdrawal(reference, 'success');
  else if (status === 'failed' || status === 'reversed') await settleWithdrawal(reference, status, 'Paystack declined the transfer.');
  return getWithdrawal(reference);
}

export async function resendWithdrawalOtp(reference: string) {
  const w = getWithdrawal(reference);
  if (w.status !== 'awaiting_otp' || !w.transferCode) throw new Error('This withdrawal is not waiting for an OTP.');
  await resendTransferOtp(w.transferCode);
}

/** Admin declines: the held money goes back to the wallet. */
export async function rejectWithdrawal(reference: string, reason: string) {
  const w = getWithdrawal(reference);
  if (w.status !== 'awaiting_approval' && w.status !== 'awaiting_otp') throw new Error('This withdrawal can no longer be declined.');
  await settleWithdrawal(reference, 'rejected', reason);
  return getWithdrawal(reference);
}

/** Records how a withdrawal ended. A failed or reversed one puts the money back. Runs once per withdrawal. */
export async function settleWithdrawal(reference: string, outcome: 'success' | 'failed' | 'reversed' | 'rejected', reason?: string) {
  const w = db.select().from(withdrawals).where(eq(withdrawals.id, reference)).get();
  if (!w) return;
  // A success can still be reversed by the bank later; anything else is final.
  if (!((OPEN_STATUSES as readonly string[]).includes(w.status) || (w.status === 'success' && outcome === 'reversed'))) return;
  const claimed = db.update(withdrawals)
    .set({ status: outcome, failureReason: outcome === 'success' ? null : reason ?? null, completedAt: new Date() })
    .where(and(eq(withdrawals.id, reference), eq(withdrawals.status, w.status)))
    .run();
  if (claimed.changes !== 1) return;

  if (outcome === 'success') {
    await createNotification({ userId: w.userId, message: `${naira(w.net)} has been sent to ${w.bankName} ${maskAccount(w.accountNumber)}.`, category: 'Transaction', link: '/wallet', iconName: 'CheckCircle' });
    return;
  }
  postEntry({
    id: `withdrawal_reversal:${reference}`,
    userId: w.userId,
    type: 'withdrawal_reversal',
    amount: w.amount,
    description: outcome === 'rejected'
      ? `Withdrawal declined${reason ? ` (${reason})` : ''} · returned to wallet`
      : `Withdrawal to ${w.bankName} ${maskAccount(w.accountNumber)} didn't go through · returned to wallet`,
  });
  await createNotification({
    userId: w.userId,
    message: outcome === 'rejected'
      ? `Your ${naira(w.amount)} withdrawal was declined${reason ? `: ${reason}` : ''}. The money is back in your wallet.`
      : `Your ${naira(w.amount)} withdrawal didn't go through, so the money is back in your wallet. You can try again later.`,
    category: 'Transaction',
    link: '/wallet',
    iconName: 'XCircle',
  });
  if (outcome !== 'rejected') await notifyAdmins(`A ${naira(w.amount)} withdrawal failed (${reason ?? outcome}). Check the Paystack balance and transfer settings.`);
}

/** Re-checks withdrawals still pending with Paystack (in case a webhook was missed). */
export async function refreshPendingWithdrawals(userId?: string) {
  const pending = db.select().from(withdrawals)
    .where(userId ? and(eq(withdrawals.userId, userId), eq(withdrawals.status, 'pending')) : eq(withdrawals.status, 'pending'))
    .all();
  for (const w of pending) {
    if (Date.now() - w.createdAt.getTime() < 30 * 1000) continue;
    try {
      const r = await verifyTransfer(w.id);
      if (r.status === 'success' || r.status === 'failed' || r.status === 'reversed') await settleWithdrawal(w.id, r.status, r.reason);
    } catch {
      // Leave it pending; the webhook or a later check will settle it.
    }
  }
}

export function listWithdrawals(userId: string, limit = 20) {
  return db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt)).limit(limit).all();
}

export { InsufficientFundsError };

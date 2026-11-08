import { db } from '@/db';
import { wallets as walletsTable, paymentTransactions as paymentTransactionsTable, walletTransactions } from '@/db/schema';
import { and, desc, eq, gte, inArray, lt, ne, sql } from 'drizzle-orm';
import { paymentMachine } from '@/lib/state-machines';

/** Payment statuses that may still become 'failed' (only 'pending'). */
const CAN_FAIL = paymentMachine.stateNames.filter((s) => paymentMachine.can(s, 'failed'));
import { randomUUID } from 'crypto';
import type { Wallet } from '@/lib/types';
import { createNotification } from '@/lib/services/notifications';

export type WalletEntryType = (typeof walletTransactions.$inferInsert)['type'];

export type WalletEntry = {
  /** Deterministic key for the event (e.g. "sale:<orderId>"): the same key is never applied twice. */
  id: string;
  userId: string;
  type: WalletEntryType;
  /** Naira. Positive adds to the balance, negative takes from it. */
  amount: number;
  description: string;
  orderId?: string | null;
  fee?: number | null;
  /** For spending: refuse (InsufficientFundsError) instead of letting the balance go below zero. */
  requireFunds?: boolean;
};

/** Thrown when a debit needs more than the wallet holds, so callers can tell it apart from other failures. */
export class InsufficientFundsError extends Error {
  constructor(public balance: number, public needed: number) {
    super(`Insufficient wallet balance: have ₦${balance.toLocaleString()}, need ₦${needed.toLocaleString()}.`);
    this.name = 'InsufficientFundsError';
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function ensureWallet(tx: Tx | typeof db, userId: string) {
  const w = tx.select().from(walletsTable).where(eq(walletsTable.userId, userId)).get();
  if (w) return w;
  const wallet = { id: randomUUID(), userId, balance: 0, currency: 'NGN' };
  tx.insert(walletsTable).values(wallet).run();
  return wallet;
}

/**
 * Applies one ledger entry inside an existing transaction: changes the balance and records the
 * entry with the balance after it. Returns null if an entry with this id was already applied.
 */
export function applyEntry(tx: Tx, e: WalletEntry): { balance: number } | null {
  if (tx.select({ id: walletTransactions.id }).from(walletTransactions).where(eq(walletTransactions.id, e.id)).get()) return null;
  const amount = round2(e.amount);
  const wallet = ensureWallet(tx, e.userId);
  if (e.requireFunds && amount < 0) {
    const res = tx.update(walletsTable)
      .set({ balance: sql`round(${walletsTable.balance} + ${amount}, 2)` })
      .where(and(eq(walletsTable.userId, e.userId), gte(walletsTable.balance, -amount)))
      .run();
    if (res.changes !== 1) throw new InsufficientFundsError(wallet.balance, -amount);
  } else {
    tx.update(walletsTable).set({ balance: sql`round(${walletsTable.balance} + ${amount}, 2)` }).where(eq(walletsTable.userId, e.userId)).run();
  }
  const balance = tx.select().from(walletsTable).where(eq(walletsTable.userId, e.userId)).get()!.balance;
  tx.insert(walletTransactions).values({
    id: e.id,
    userId: e.userId,
    type: e.type,
    amount,
    balanceAfter: balance,
    fee: e.fee ?? null,
    orderId: e.orderId ?? null,
    description: e.description,
    createdAt: new Date(),
  }).run();
  return { balance };
}

/** Applies one ledger entry on its own. Returns null if it had already been applied. */
export function postEntry(e: WalletEntry): { balance: number } | null {
  return db.transaction((tx) => applyEntry(tx, e));
}

export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  return ensureWallet(db, userId);
}

/** A page of the user's wallet history, newest first. `before` is a createdAt (ms) cursor. */
export function getWalletHistory(userId: string, opts: { before?: number; limit?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  const where = opts.before
    ? and(eq(walletTransactions.userId, userId), lt(walletTransactions.createdAt, new Date(opts.before)))
    : eq(walletTransactions.userId, userId);
  const rows = db.select().from(walletTransactions).where(where).orderBy(desc(walletTransactions.createdAt)).limit(limit + 1).all();
  return { entries: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function createPendingWalletFunding(userId: string, amount: number): Promise<string> {
  const reference = `wallet_${randomUUID()}`;
  db.insert(paymentTransactionsTable)
    .values({ id: reference, userId, purpose: 'wallet_funding', amount, status: 'pending', createdAt: new Date() })
    .run();
  return reference;
}

/**
 * Marks a pending wallet-funding transaction as successful and credits the
 * wallet — but only the first time. Paystack's redirect can land on the
 * callback more than once (back button, retry), so this must be idempotent.
 */
export async function completeWalletFunding(reference: string): Promise<{ alreadyProcessed: boolean; newBalance: number }> {
  const transaction = db.select().from(paymentTransactionsTable).where(eq(paymentTransactionsTable.id, reference)).get();
  if (!transaction) {
    throw new Error('Unknown payment reference.');
  }
  if (transaction.status === 'success') {
    const wallet = await getOrCreateWallet(transaction.userId);
    return { alreadyProcessed: true, newBalance: wallet.balance };
  }

  // Claim the transaction and credit in one step: the redirect back from
  // Paystack, the polling tab and the webhook can all arrive together, and
  // only the first one may add the money.
  const newBalance = db.transaction((tx) => {
    const claimed = tx.update(paymentTransactionsTable)
      .set({ status: 'success', completedAt: new Date() })
      .where(and(eq(paymentTransactionsTable.id, reference), ne(paymentTransactionsTable.status, 'success')))
      .run();
    if (claimed.changes !== 1) return null;
    const applied = applyEntry(tx, {
      id: `funding:${reference}`,
      userId: transaction.userId,
      type: 'funding',
      amount: transaction.amount,
      description: 'Wallet top-up (Paystack)',
    });
    return applied?.balance ?? null;
  });
  if (newBalance === null) {
    const wallet = await getOrCreateWallet(transaction.userId);
    return { alreadyProcessed: true, newBalance: wallet.balance };
  }

  await createNotification({
    userId: transaction.userId,
    message: `₦${transaction.amount.toLocaleString()} was added to your wallet. New balance: ₦${newBalance.toLocaleString()}.`,
    category: 'Transaction',
    iconName: 'Wallet',
    link: '/wallet',
  });

  return { alreadyProcessed: false, newBalance };
}

/** pending → failed (see paymentMachine). A payment that already succeeded is never marked failed. */
export async function markWalletFundingFailed(reference: string): Promise<void> {
  db.update(paymentTransactionsTable)
    .set({ status: 'failed', completedAt: new Date() })
    .where(and(eq(paymentTransactionsTable.id, reference), inArray(paymentTransactionsTable.status, CAN_FAIL)))
    .run();
}

export async function getPaymentTransaction(reference: string) {
  return db.select().from(paymentTransactionsTable).where(eq(paymentTransactionsTable.id, reference)).get();
}

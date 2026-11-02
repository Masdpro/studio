import { db } from '@/db';
import { wallets as walletsTable, paymentTransactions as paymentTransactionsTable } from '@/db/schema';
import { and, eq, gte, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Wallet } from '@/lib/types';
import { createNotification } from '@/lib/services/notifications';

export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const existing = db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).get();
  if (existing) return existing;

  const wallet: Wallet = { id: randomUUID(), userId, balance: 0, currency: 'NGN' };
  db.insert(walletsTable).values(wallet).run();
  return wallet;
}

export async function creditWallet(userId: string, amount: number): Promise<number> {
  await getOrCreateWallet(userId);
  // Add in SQL rather than read-then-write, so two credits at once both count.
  db.update(walletsTable).set({ balance: sql`${walletsTable.balance} + ${amount}` }).where(eq(walletsTable.userId, userId)).run();
  return (await getOrCreateWallet(userId)).balance;
}

/** Thrown by debitWallet so callers can tell "not enough money" apart from other failures. */
export class InsufficientFundsError extends Error {
  constructor(public balance: number, public needed: number) {
    super(`Insufficient wallet balance: have ₦${balance.toLocaleString()}, need ₦${needed.toLocaleString()}.`);
    this.name = 'InsufficientFundsError';
  }
}

/** Throws InsufficientFundsError if the wallet doesn't have enough balance. */
export async function debitWallet(userId: string, amount: number): Promise<number> {
  const wallet = await getOrCreateWallet(userId);
  // Only takes the money if it's all there at the moment of the update, so two
  // checkouts at once can't both spend the same balance.
  const res = db.update(walletsTable)
    .set({ balance: sql`${walletsTable.balance} - ${amount}` })
    .where(and(eq(walletsTable.userId, userId), gte(walletsTable.balance, amount)))
    .run();
  if (res.changes !== 1) {
    throw new InsufficientFundsError((await getOrCreateWallet(userId)).balance || wallet.balance, amount);
  }
  return (await getOrCreateWallet(userId)).balance;
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
    const w = tx.select().from(walletsTable).where(eq(walletsTable.userId, transaction.userId)).get();
    const balance = (w?.balance ?? 0) + transaction.amount;
    if (w) tx.update(walletsTable).set({ balance }).where(eq(walletsTable.userId, transaction.userId)).run();
    else tx.insert(walletsTable).values({ id: randomUUID(), userId: transaction.userId, balance, currency: 'NGN' }).run();
    return balance;
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
  });

  return { alreadyProcessed: false, newBalance };
}

export async function markWalletFundingFailed(reference: string): Promise<void> {
  db.update(paymentTransactionsTable)
    .set({ status: 'failed', completedAt: new Date() })
    .where(eq(paymentTransactionsTable.id, reference))
    .run();
}

export async function getPaymentTransaction(reference: string) {
  return db.select().from(paymentTransactionsTable).where(eq(paymentTransactionsTable.id, reference)).get();
}

import { db } from '@/db';
import { wallets as walletsTable, paymentTransactions as paymentTransactionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
  const wallet = await getOrCreateWallet(userId);
  const newBalance = wallet.balance + amount;
  db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.userId, userId)).run();
  return newBalance;
}

/** Throws if the wallet doesn't have enough balance. */
export async function debitWallet(userId: string, amount: number): Promise<number> {
  const wallet = await getOrCreateWallet(userId);
  if (wallet.balance < amount) {
    throw new Error(`Insufficient wallet balance: have ₦${wallet.balance.toLocaleString()}, need ₦${amount.toLocaleString()}.`);
  }
  const newBalance = wallet.balance - amount;
  db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.userId, userId)).run();
  return newBalance;
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

  const newBalance = await creditWallet(transaction.userId, transaction.amount);
  db.update(paymentTransactionsTable)
    .set({ status: 'success', completedAt: new Date() })
    .where(eq(paymentTransactionsTable.id, reference))
    .run();

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

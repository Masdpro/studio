/**
 * Deleting an account from inside Closebuy (the app stores require this).
 *
 * What happens:
 *  - Personal details are wiped: name, email, phone, saved address, bank account, ID documents and
 *    live-selfie photos, notifications, and the contact details on any store, service business or
 *    delivery profile (business names stay, because they appear on past orders and bookings).
 *  - The person is signed out everywhere and can never sign in to this account again.
 *  - Their store, service business or delivery profile disappears from Closebuy.
 *  - Orders, bookings and wallet records stay (without personal details) because Closebuy has to
 *    keep a record of money that moved, and the other side of each order or booking still needs it.
 *
 * It is refused while anything is still in progress (an order, booking, errand or bank payout) or
 * while money is left in the wallet, so nobody loses money or leaves a customer waiting.
 */
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  bankAccounts,
  bookings,
  deliveryAgents,
  errandRequests,
  livenessChecks,
  notifications,
  orders,
  serviceProviders,
  users,
  verificationCodes,
  verificationDocuments,
  vendors,
  wallets,
  withdrawals,
} from '@/db/schema';
import { BOOKING_ACTIVE } from '@/lib/state-machines/booking';
import { ORDER_OPEN } from '@/lib/state-machines/order';
import { deleteFile } from '@/lib/storage';
import { log } from '@/lib/log';

export class AccountDeletionError extends Error {
  constructor(message: string, public code: 'WRONG_PASSWORD' | 'BLOCKED' | 'NOT_ALLOWED' | 'NOT_FOUND', public reasons: string[] = []) {
    super(message);
  }
}

const ERRAND_IN_PROGRESS = ['AgentAssigned', 'InProgress', 'OutForDelivery'];
const ERRAND_WAITING = ['PendingQuotes', 'AwaitingAcceptance'];
const PAYOUT_IN_PROGRESS = ['awaiting_approval', 'awaiting_otp', 'pending'] as const;

/** Everything that has to be finished before this account can be deleted (empty when it can go). */
export function deletionBlockers(userId: string): string[] {
  const reasons: string[] = [];
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return ['Account not found.'];
  if (user.role === 'admin') reasons.push('Admin accounts can’t be deleted here. Ask the account owner to remove you as an admin first.');

  const openOrders = db
    .select({ n: sql<number>`count(*)` })
    .from(orders)
    .where(and(or(eq(orders.customerId, userId), eq(orders.vendorId, userId), eq(orders.deliveryAgentId, userId)), inArray(orders.status, [...ORDER_OPEN])))
    .get()!.n;
  if (openOrders) reasons.push(`${openOrders} order${openOrders === 1 ? ' is' : 's are'} still in progress. Finish or cancel ${openOrders === 1 ? 'it' : 'them'} first.`);

  const activeBookings = db
    .select({ n: sql<number>`count(*)` })
    .from(bookings)
    .where(and(or(eq(bookings.customerId, userId), eq(bookings.providerId, userId)), inArray(bookings.status, [...BOOKING_ACTIVE])))
    .get()!.n;
  if (activeBookings) reasons.push(`${activeBookings} booking${activeBookings === 1 ? ' is' : 's are'} still coming up. Finish or cancel ${activeBookings === 1 ? 'it' : 'them'} first.`);

  const errands = db
    .select({ n: sql<number>`count(*)` })
    .from(errandRequests)
    .where(and(or(eq(errandRequests.customerId, userId), eq(errandRequests.assignedAgentId, userId)), inArray(errandRequests.status, ERRAND_IN_PROGRESS)))
    .get()!.n;
  if (errands) reasons.push(`${errands} errand${errands === 1 ? ' is' : 's are'} still in progress.`);

  const payouts = db
    .select({ n: sql<number>`count(*)` })
    .from(withdrawals)
    .where(and(eq(withdrawals.userId, userId), inArray(withdrawals.status, [...PAYOUT_IN_PROGRESS])))
    .get()!.n;
  if (payouts) reasons.push('A withdrawal to your bank is still being processed. Wait for it to finish.');

  const balance = db.select({ b: wallets.balance }).from(wallets).where(eq(wallets.userId, userId)).get()?.b ?? 0;
  if (balance > 0) reasons.push(`Your wallet still has ₦${balance.toLocaleString('en-NG')}. Withdraw it to your bank first, so you don’t lose it.`);

  return reasons;
}

/** Deletes the account after checking the password. Throws AccountDeletionError when it can't. */
export async function deleteAccount(userId: string, password: string, now = new Date()) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.email.endsWith('@deleted.cbuyapp.com')) throw new AccountDeletionError('Account not found.', 'NOT_FOUND');
  if (!(await bcrypt.compare(String(password ?? ''), user.passwordHash))) throw new AccountDeletionError('That password isn’t right.', 'WRONG_PASSWORD');

  const reasons = deletionBlockers(userId);
  if (reasons.length) throw new AccountDeletionError('Your account can’t be deleted yet.', user.role === 'admin' ? 'NOT_ALLOWED' : 'BLOCKED', reasons);

  // Private files (ID documents, selfie photos) are removed after the database change succeeds.
  const files = db.select({ f: verificationDocuments.fileName }).from(verificationDocuments).where(eq(verificationDocuments.userId, userId)).all().map((r) => r.f);
  for (const r of db.select({ frames: livenessChecks.frames }).from(livenessChecks).where(eq(livenessChecks.userId, userId)).all()) {
    try {
      files.push(...(JSON.parse(r.frames ?? '[]') as string[]));
    } catch {
      /* ignore unreadable rows */
    }
  }

  const unusablePassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  db.transaction((tx) => {
    tx.update(users)
      .set({
        email: `${userId}@deleted.cbuyapp.com`,
        displayName: 'Deleted account',
        phone: null,
        phoneVerifiedAt: null,
        address: null,
        passwordHash: unusablePassword,
        // A suspended account can't sign in and its shop, service business and delivery profile are hidden.
        suspendedAt: now,
        suspendedReason: 'Account deleted by its owner',
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, userId))
      .run();
    tx.delete(verificationDocuments).where(eq(verificationDocuments.userId, userId)).run();
    tx.delete(livenessChecks).where(eq(livenessChecks.userId, userId)).run();
    tx.delete(verificationCodes).where(eq(verificationCodes.userId, userId)).run();
    tx.delete(bankAccounts).where(eq(bankAccounts.userId, userId)).run();
    tx.delete(notifications).where(eq(notifications.userId, userId)).run();
    // Business and delivery profiles keep their name (it appears on past orders) but lose contact details.
    tx.update(vendors).set({ contactEmail: '', phone: '', streetAddress: '' }).where(eq(vendors.id, userId)).run();
    tx.update(serviceProviders).set({ contactEmail: '', phone: '', streetAddress: '' }).where(eq(serviceProviders.id, userId)).run();
    tx.update(deliveryAgents).set({ name: 'Deleted account', email: '', phone: '', streetAddress: '' }).where(eq(deliveryAgents.id, userId)).run();
    // Errands nobody has taken yet simply close.
    tx.update(errandRequests)
      .set({ status: 'CancelledByCustomer' })
      .where(and(eq(errandRequests.customerId, userId), inArray(errandRequests.status, ERRAND_WAITING)))
      .run();
  });

  for (const f of files) {
    await deleteFile('private', f).catch((err) => log.warn('Could not remove a private file of a deleted account', { area: 'security', err }));
  }
  log.info('Account deleted by its owner', { area: 'security', userId });
  return { deleted: true as const };
}

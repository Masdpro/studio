/**
 * Withdrawal lifecycle (vendor/agent payouts), using the Paystack simulator from
 * PAYSTACK_SIMULATE_TRANSFERS. Written against the behaviour before the state machine refactor.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { withdrawals } from '@/db/schema';
import { postEntry, getOrCreateWallet } from '@/lib/services/wallets';
import {
  approveWithdrawal,
  confirmWithdrawalOtp,
  rejectWithdrawal,
  requestWithdrawal,
  saveBankAccount,
  settleWithdrawal,
} from '@/lib/services/withdrawals';
import { makeVendor } from '../helpers';

const statusOf = (ref: string) => db.select({ s: withdrawals.status }).from(withdrawals).where(eq(withdrawals.id, ref)).get()?.s;
const balance = async (userId: string) => (await getOrCreateWallet(userId)).balance;

let vendor: string;
beforeEach(async () => {
  vendor = makeVendor();
  postEntry({ id: `sale:test-${vendor}`, userId: vendor, type: 'sale', amount: 5000, description: 'Test sale' });
  await saveBankAccount(vendor, '001', '0123456789');
});

const request = async () => (await requestWithdrawal(vendor, 2000)).id;
const toOtp = async () => {
  const ref = await request();
  await approveWithdrawal(ref);
  return ref;
};
const toPending = async () => {
  const ref = await toOtp();
  await confirmWithdrawalOtp(ref, '123456');
  return ref;
};

describe('withdrawal: transitions', () => {
  it('(start) → awaiting_approval, holding the money', async () => {
    const ref = await request();
    expect(statusOf(ref)).toBe('awaiting_approval');
    expect(await balance(vendor)).toBe(3000);
  });
  it('awaiting_approval → awaiting_otp when an admin approves', async () => {
    expect(statusOf(await toOtp())).toBe('awaiting_otp');
  });
  it('awaiting_approval → failed when Paystack refuses, refunding the wallet', async () => {
    const ref = await request();
    const prev = process.env.PAYSTACK_SIMULATE_TRANSFERS;
    process.env.PAYSTACK_SIMULATE_TRANSFERS = 'false';
    try {
      await expect(approveWithdrawal(ref)).rejects.toThrow();
    } finally {
      process.env.PAYSTACK_SIMULATE_TRANSFERS = prev;
    }
    expect(statusOf(ref)).toBe('failed');
    expect(await balance(vendor)).toBe(5000);
  });
  it('awaiting_approval → rejected when an admin declines, refunding the wallet', async () => {
    const ref = await request();
    await rejectWithdrawal(ref, 'Under review');
    expect(statusOf(ref)).toBe('rejected');
    expect(await balance(vendor)).toBe(5000);
  });
  it('awaiting_otp → pending with the right OTP', async () => {
    expect(statusOf(await toPending())).toBe('pending');
  });
  it('awaiting_otp stays put with a wrong OTP', async () => {
    const ref = await toOtp();
    await expect(confirmWithdrawalOtp(ref, '999999')).rejects.toThrow();
    expect(statusOf(ref)).toBe('awaiting_otp');
  });
  it('awaiting_otp → rejected when an admin declines, refunding the wallet', async () => {
    const ref = await toOtp();
    await rejectWithdrawal(ref, 'Changed my mind');
    expect(statusOf(ref)).toBe('rejected');
    expect(await balance(vendor)).toBe(5000);
  });
  it('pending → success when Paystack confirms', async () => {
    const ref = await toPending();
    await settleWithdrawal(ref, 'success');
    expect(statusOf(ref)).toBe('success');
    expect(await balance(vendor)).toBe(3000);
  });
  it('pending → failed refunds the wallet', async () => {
    const ref = await toPending();
    await settleWithdrawal(ref, 'failed', 'Bank down');
    expect(statusOf(ref)).toBe('failed');
    expect(await balance(vendor)).toBe(5000);
  });
  it('pending → reversed refunds the wallet', async () => {
    const ref = await toPending();
    await settleWithdrawal(ref, 'reversed');
    expect(statusOf(ref)).toBe('reversed');
    expect(await balance(vendor)).toBe(5000);
  });
  it('success → reversed when the bank sends it back, refunding the wallet', async () => {
    const ref = await toPending();
    await settleWithdrawal(ref, 'success');
    await settleWithdrawal(ref, 'reversed');
    expect(statusOf(ref)).toBe('reversed');
    expect(await balance(vendor)).toBe(5000);
  });
});

describe('withdrawal: refused moves', () => {
  it('cannot approve twice', async () => {
    const ref = await toOtp();
    await expect(approveWithdrawal(ref)).rejects.toThrow();
    expect(statusOf(ref)).toBe('awaiting_otp');
  });
  it('cannot decline once sent to the bank', async () => {
    const ref = await toPending();
    await expect(rejectWithdrawal(ref, 'Too late')).rejects.toThrow();
    expect(statusOf(ref)).toBe('pending');
  });
  it('final states ignore later outcomes and never refund twice', async () => {
    const ref = await request();
    await rejectWithdrawal(ref, 'No');
    await settleWithdrawal(ref, 'failed');
    await settleWithdrawal(ref, 'success');
    expect(statusOf(ref)).toBe('rejected');
    expect(await balance(vendor)).toBe(5000);
  });
  it('a success cannot later become failed', async () => {
    const ref = await toPending();
    await settleWithdrawal(ref, 'success');
    await settleWithdrawal(ref, 'failed');
    expect(statusOf(ref)).toBe('success');
  });
  it('only one open withdrawal at a time', async () => {
    await request();
    await expect(requestWithdrawal(vendor, 1000)).rejects.toThrow(/already have a withdrawal/);
  });
});

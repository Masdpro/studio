/** Wallet top-up payments (Paystack): pending → success / failed. Written before the refactor. */
import { describe, expect, it } from 'vitest';
import { completeWalletFunding, createPendingWalletFunding, getOrCreateWallet, getPaymentTransaction, markWalletFundingFailed } from '@/lib/services/wallets';
import { makeUser } from '../helpers';

const statusOf = async (ref: string) => (await getPaymentTransaction(ref))?.status;

describe('wallet funding payment', () => {
  it('(start) → pending', async () => {
    const ref = await createPendingWalletFunding(makeUser(), 1500);
    expect(await statusOf(ref)).toBe('pending');
  });
  it('pending → success credits the wallet once, even if confirmed twice', async () => {
    const user = makeUser();
    const ref = await createPendingWalletFunding(user, 1500);
    expect((await completeWalletFunding(ref)).alreadyProcessed).toBe(false);
    expect((await completeWalletFunding(ref)).alreadyProcessed).toBe(true);
    expect(await statusOf(ref)).toBe('success');
    expect((await getOrCreateWallet(user)).balance).toBe(1500);
  });
  it('pending → failed', async () => {
    const ref = await createPendingWalletFunding(makeUser(), 1500);
    await markWalletFundingFailed(ref);
    expect(await statusOf(ref)).toBe('failed');
  });
  it('failed → success when Paystack later confirms the payment went through', async () => {
    const user = makeUser();
    const ref = await createPendingWalletFunding(user, 1500);
    await markWalletFundingFailed(ref);
    await completeWalletFunding(ref);
    expect(await statusOf(ref)).toBe('success');
    expect((await getOrCreateWallet(user)).balance).toBe(1500);
  });
});

describe('wallet funding payment: rules added with the state machine', () => {
  it('success is never turned into failed by a late failure report', async () => {
    const user = makeUser();
    const ref = await createPendingWalletFunding(user, 1500);
    await completeWalletFunding(ref);
    await markWalletFundingFailed(ref);
    expect(await statusOf(ref)).toBe('success');
    expect((await getOrCreateWallet(user)).balance).toBe(1500);
  });
});

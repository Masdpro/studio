/**
 * Paystack webhook — the money-in endpoint. These guard the two things that matter:
 * only Paystack (correct HMAC signature) can trigger it, and a top-up is credited
 * once, for the amount actually paid, and never for a forged or unknown reference.
 *
 * The Paystack API calls are mocked; the wallet ledger is the real one, so the
 * balance assertions exercise the genuine crediting path.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { paymentTransactions } from '@/db/schema';

const paystack = vi.hoisted(() => ({ verify: vi.fn(), transfer: vi.fn() }));
vi.mock('@/lib/paystack', () => ({
  verifyPaystackTransaction: paystack.verify,
  verifyTransfer: paystack.transfer,
}));

import { POST as webhook } from '@/app/api/payments/paystack/webhook/route';
import { createPendingWalletFunding, getOrCreateWallet, getPaymentTransaction } from '@/lib/services/wallets';
import { makeUser } from './helpers';

const SECRET = process.env.PAYSTACK_SECRET_KEY!;
const sign = (raw: string) => createHmac('sha512', SECRET).update(raw).digest('hex');

/** Build the webhook request; omit `signature` to send none, or pass a wrong one. */
function hook(event: unknown, signature?: string | null) {
  const raw = JSON.stringify(event);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const sig = signature === undefined ? sign(raw) : signature;
  if (sig !== null) headers['x-paystack-signature'] = sig;
  return webhook(new Request('http://test.local/api/payments/paystack/webhook', { method: 'POST', body: raw, headers }));
}

const balance = async (userId: string) => (await getOrCreateWallet(userId)).balance;
const statusOf = (ref: string) => db.select({ s: paymentTransactions.status }).from(paymentTransactions).where(eq(paymentTransactions.id, ref)).get()?.s;

beforeEach(() => {
  paystack.verify.mockReset();
  paystack.transfer.mockReset();
});

describe('paystack webhook signature', () => {
  it('rejects a request with no signature', async () => {
    const res = await hook({ event: 'charge.success', data: { reference: 'x' } }, null);
    expect(res.status).toBe(401);
  });

  it('rejects a forged signature', async () => {
    const res = await hook({ event: 'charge.success', data: { reference: 'x' } }, 'deadbeef');
    expect(res.status).toBe(401);
  });

  it('rejects a signature that was valid for a different body (tampering)', async () => {
    const good = sign(JSON.stringify({ event: 'charge.success', data: { reference: 'a' } }));
    const res = await hook({ event: 'charge.success', data: { reference: 'TAMPERED' } }, good);
    expect(res.status).toBe(401);
  });

  it('never calls Paystack or credits anyone for an unknown reference', async () => {
    const res = await hook({ event: 'charge.success', data: { reference: 'wallet_does_not_exist' } });
    expect(res.status).toBe(200);
    expect(paystack.verify).not.toHaveBeenCalled();
  });
});

describe('paystack webhook crediting', () => {
  it('credits a real top-up once, and ignores a replay of the same event', async () => {
    const user = makeUser();
    const ref = await createPendingWalletFunding(user, 5000);
    paystack.verify.mockResolvedValue({ status: 'success', amountNaira: 5000 });

    expect((await hook({ event: 'charge.success', data: { reference: ref } })).status).toBe(200);
    expect(await balance(user)).toBe(5000);
    expect(statusOf(ref)).toBe('success');

    // Paystack retries deliver the same event again — the money must not be added twice.
    expect((await hook({ event: 'charge.success', data: { reference: ref } })).status).toBe(200);
    expect(await balance(user)).toBe(5000);
  });

  it('does not credit when the amount paid is less than the top-up started', async () => {
    const user = makeUser();
    const ref = await createPendingWalletFunding(user, 5000);
    paystack.verify.mockResolvedValue({ status: 'success', amountNaira: 100 });

    expect((await hook({ event: 'charge.success', data: { reference: ref } })).status).toBe(200);
    expect(await balance(user)).toBe(0);
    expect(statusOf(ref)).not.toBe('success');
  });

  it('ignores non-charge events without crediting', async () => {
    const user = makeUser();
    const ref = await createPendingWalletFunding(user, 5000);
    expect((await hook({ event: 'charge.failed', data: { reference: ref } })).status).toBe(200);
    expect(await balance(user)).toBe(0);
    expect(paystack.verify).not.toHaveBeenCalled();
    expect((await getPaymentTransaction(ref))!.status).toBe('pending');
  });
});

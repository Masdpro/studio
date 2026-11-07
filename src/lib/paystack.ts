// Thin server-only wrapper around Paystack's REST API. Never import this
// from a client component — it needs PAYSTACK_SECRET_KEY, which must never
// reach the browser.

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  return key;
}

export async function initializePaystackTransaction(params: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNaira * 100), // Paystack expects kobo
      reference: params.reference,
      callback_url: params.callbackUrl,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? 'Failed to initialize payment.');
  }
  return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
}

// Paystack's own docs conflate these: "abandoned" is what a totally
// untouched, still-on-the-checkout-page transaction reports too — confirmed
// directly against their API (a freshly initialized, never-opened
// transaction verifies as "abandoned"). It is NOT a reliable "the customer
// gave up" signal, only a genuine "failed" (e.g. a declined card) is. Treat
// anything else, "abandoned" included, as still-pending so polling callers
// don't kill a payment the customer is actively completing.
const TERMINAL_FAILURE_STATUSES = new Set(['failed', 'reversed']);

export async function verifyPaystackTransaction(reference: string): Promise<{
  // 'pending' covers both "still in progress" and Paystack's ambiguous
  // "abandoned" — distinct from a confirmed failure, so callers that poll
  // this don't give up on an in-progress payment.
  status: 'success' | 'failed' | 'pending';
  amountNaira: number;
}> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? 'Failed to verify payment.');
  }
  const paystackStatus = data.data.status as string;
  const status = paystackStatus === 'success' ? 'success' : TERMINAL_FAILURE_STATUSES.has(paystackStatus) ? 'failed' : 'pending';
  return { status, amountNaira: data.data.amount / 100 };
}

// ---------------------------------------------------------------------------
// Transfers (payouts to vendors' and agents' bank accounts)
//
// Needs Transfers enabled on the Paystack business. Transfers are paid from the Paystack balance.
// With transfer OTP on (Closebuy's setting), Paystack holds each transfer until an admin types
// the OTP it sends the business owner; see finalizeTransfer.
//
// For local testing only (never in production), PAYSTACK_SIMULATE_TRANSFERS=true
// fakes these calls so the withdrawal flow can be exercised without real money.
// ---------------------------------------------------------------------------

const simulate = () => process.env.PAYSTACK_SIMULATE_TRANSFERS === 'true' && process.env.NODE_ENV !== 'production';

async function paystackGet(path: string) {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${getSecretKey()}` }, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) throw new Error(data.message ?? `Paystack request failed (${res.status}).`);
  return data;
}

async function paystackPost(path: string, body: unknown) {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getSecretKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) throw new Error(data.message ?? `Paystack request failed (${res.status}).`);
  return data;
}

export type Bank = { name: string; code: string };
let bankCache: { at: number; banks: Bank[] } | null = null;

/** Nigerian banks that can receive transfers (cached for a day). */
export async function listBanks(): Promise<Bank[]> {
  if (bankCache && Date.now() - bankCache.at < 24 * 60 * 60 * 1000) return bankCache.banks;
  if (simulate()) return [{ name: 'Test Bank', code: '001' }, { name: 'Access Bank', code: '044' }, { name: 'Opay', code: '999992' }];
  const banks: Bank[] = [];
  let next: string | null = null;
  for (let i = 0; i < 10; i++) {
    const data = await paystackGet(`/bank?country=nigeria&currency=NGN&perPage=100&use_cursor=true${next ? `&next=${encodeURIComponent(next)}` : ''}`);
    for (const b of data.data as { name: string; code: string; active: boolean; is_deleted?: boolean }[]) {
      if (b.active && !b.is_deleted) banks.push({ name: b.name, code: b.code });
    }
    next = data.meta?.next ?? null;
    if (!next) break;
  }
  const unique = Array.from(new Map(banks.map((b) => [b.code, b])).values()).sort((a, b) => a.name.localeCompare(b.name));
  bankCache = { at: Date.now(), banks: unique };
  return unique;
}

/** Looks up the name on a bank account, so the owner can confirm it before saving. */
export async function resolveBankAccount(accountNumber: string, bankCode: string): Promise<{ accountName: string }> {
  if (simulate()) return { accountName: 'TEST ACCOUNT HOLDER' };
  const data = await paystackGet(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
  return { accountName: data.data.account_name };
}

export async function createTransferRecipient(p: { name: string; accountNumber: string; bankCode: string }): Promise<string> {
  if (simulate()) return `RCP_test_${p.accountNumber}`;
  const data = await paystackPost('/transferrecipient', { type: 'nuban', name: p.name, account_number: p.accountNumber, bank_code: p.bankCode, currency: 'NGN' });
  return data.data.recipient_code;
}

export type TransferStatus = 'success' | 'pending' | 'failed' | 'reversed' | 'otp';

export async function initiateTransfer(p: { amountNaira: number; recipientCode: string; reference: string; reason: string }): Promise<{ status: TransferStatus; transferCode: string }> {
  if (simulate()) return { status: 'otp', transferCode: `TRF_test_${p.reference}` };
  const data = await paystackPost('/transfer', {
    source: 'balance',
    amount: Math.round(p.amountNaira * 100),
    recipient: p.recipientCode,
    reference: p.reference,
    reason: p.reason,
    currency: 'NGN',
  });
  return { status: data.data.status, transferCode: data.data.transfer_code };
}

export async function verifyTransfer(reference: string): Promise<{ status: TransferStatus; reason?: string }> {
  if (simulate()) return { status: 'success' };
  const data = await paystackGet(`/transfer/verify/${encodeURIComponent(reference)}`);
  return { status: data.data.status, reason: data.data.gateway_response ?? data.data.reason };
}

/** Completes a transfer that Paystack is holding for the OTP it sent the business owner. */
export async function finalizeTransfer(transferCode: string, otp: string): Promise<{ status: TransferStatus }> {
  if (simulate()) {
    if (otp !== '123456') throw new Error('Invalid OTP');
    return { status: 'pending' };
  }
  const data = await paystackPost('/transfer/finalize_transfer', { transfer_code: transferCode, otp });
  return { status: data.data.status };
}

/** Asks Paystack to send the transfer OTP again. */
export async function resendTransferOtp(transferCode: string): Promise<void> {
  if (simulate()) return;
  await paystackPost('/transfer/resend_otp', { transfer_code: transferCode, reason: 'transfer' });
}

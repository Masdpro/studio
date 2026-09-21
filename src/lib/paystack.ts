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

export async function verifyPaystackTransaction(reference: string): Promise<{
  success: boolean;
  amountNaira: number;
}> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? 'Failed to verify payment.');
  }
  return { success: data.data.status === 'success', amountNaira: data.data.amount / 100 };
}

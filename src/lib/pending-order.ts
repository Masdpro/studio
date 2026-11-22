/**
 * Checkout's "Pay online": the order waiting while the shopper pays on Paystack.
 * Saved in this browser just before going to Paystack, read back on /checkout/paid.
 */
export type PendingOrder = {
  reference: string;
  total: number;
  /** The exact body for POST /api/orders. */
  body: Record<string, unknown>;
  /** A delivery address to remember once the order goes through. */
  deliveryAddress?: string;
  createdAt: number;
};

const KEY = 'closebuy-pending-order';

export function savePendingOrder(p: PendingOrder) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

export function readPendingOrder(): PendingOrder | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingOrder) : null;
  } catch {
    return null;
  }
}

export function clearPendingOrder() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** The most Paystack will take in one online payment here (same limit as a wallet top-up). */
export const ONLINE_PAYMENT_MAX = 1_000_000;

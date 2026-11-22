'use client';

/**
 * Paystack's on-page checkout: their payment window opens as a pop-up over the current page
 * (card, bank transfer, USSD and the rest), so the shopper never leaves Closebuy or opens a tab.
 */

type PaystackPopInstance = {
  resumeTransaction: (
    accessCode: string,
    callbacks?: { onSuccess?: (t: { reference?: string }) => void; onCancel?: () => void; onError?: (e: unknown) => void },
  ) => void;
};
declare global {
  interface Window { PaystackPop?: new () => PaystackPopInstance }
}

const SRC = 'https://js.paystack.co/v2/inline.js';
let loading: Promise<boolean> | null = null;

/** Loads Paystack's script once. Resolves false if it can't be loaded (blocked or offline). */
function loadPaystack(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.PaystackPop) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise<boolean>((resolve) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve(!!window.PaystackPop);
    s.onerror = () => { loading = null; resolve(false); };
    document.head.appendChild(s);
  });
  return loading;
}

export type PopupResult = 'paid' | 'cancelled' | 'unavailable';

/**
 * Opens Paystack's checkout over the page for a payment the server already started.
 * 'unavailable' means the pop-up couldn't load; the caller then falls back to Paystack's own page.
 */
export async function payInPopup(accessCode: string): Promise<PopupResult> {
  if (!accessCode || !(await loadPaystack())) return 'unavailable';
  const Pop = window.PaystackPop;
  if (!Pop) return 'unavailable';
  return new Promise<PopupResult>((resolve) => {
    try {
      new Pop().resumeTransaction(accessCode, {
        onSuccess: () => resolve('paid'),
        onCancel: () => resolve('cancelled'),
        onError: () => resolve('unavailable'),
      });
    } catch {
      resolve('unavailable');
    }
  });
}

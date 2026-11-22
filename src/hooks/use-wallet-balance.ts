'use client';

import { useEffect, useState } from 'react';

/** The signed-in person's wallet balance (null until loaded, or when signed out); refreshes on `wallet:updated`. */
export function useWalletBalance(enabled = true) {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let off = false;
    const load = () =>
      fetch('/api/wallet')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!off) setBalance(typeof d?.wallet?.balance === 'number' ? d.wallet.balance : null); })
        .catch(() => {});
    load();
    window.addEventListener('wallet:updated', load);
    return () => { off = true; window.removeEventListener('wallet:updated', load); };
  }, [enabled]);
  return balance;
}

/** Opens the wallet pop-up (balance and Add funds), optionally with an amount filled in. */
export const openWallet = (amount?: number) => window.dispatchEvent(new CustomEvent('wallet:open', { detail: { amount } }));

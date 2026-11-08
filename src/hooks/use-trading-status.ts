'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { VerificationState } from '@/components/account/AccountVerification';

/** Vendors / agents may only use their tools once an admin has approved them. */
export function useTradingStatus() {
  const { user, isVendor, isAgent, loading } = useAuth();
  const [state, setState] = useState<VerificationState | null>(null);
  // Which account the state above belongs to; until it matches, the answer isn't known yet.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const applies = !!user && (isVendor || isAgent);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!applies || !userId) return;
    let off = false;
    fetch('/api/account/verification')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!off) {
          setState(d?.state ?? null);
          setLoadedFor(userId);
        }
      })
      .catch(() => {
        if (!off) setLoadedFor(userId);
      });
    return () => {
      off = true;
    };
  }, [applies, userId]);
  const loaded = !loading && (!applies || loadedFor === userId);
  return { state: applies ? state : null, loaded, mayTrade: !applies || (loadedFor === userId && state?.mayTrade === true) };
}

/** Sends not-yet-approved vendors / agents back to their dashboard (which shows the approval status). */
export function useRequireTrading(home = '/vendor/dashboard') {
  const t = useTradingStatus();
  const router = useRouter();
  useEffect(() => {
    if (t.loaded && !t.mayTrade) router.replace(home);
  }, [t.loaded, t.mayTrade, router, home]);
  return t;
}

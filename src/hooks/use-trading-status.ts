'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { VerificationState } from '@/components/account/AccountVerification';

/** Vendors / agents may only use their tools once an admin has approved them. */
export function useTradingStatus() {
  const { user, isVendor, isAgent } = useAuth();
  const [state, setState] = useState<VerificationState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const applies = !!user && (isVendor || isAgent);
  useEffect(() => {
    if (!applies) {
      setState(null);
      setLoaded(true);
      return;
    }
    let off = false;
    fetch('/api/account/verification')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!off) {
          setState(d?.state ?? null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!off) setLoaded(true);
      });
    return () => {
      off = true;
    };
  }, [applies, user?.id]);
  return { state, loaded, mayTrade: !applies || state?.mayTrade === true };
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

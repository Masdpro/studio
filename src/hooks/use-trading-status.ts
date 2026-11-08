'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { VerificationState } from '@/components/account/AccountVerification';

/**
 * Vendors / agents may only use their tools once an admin has approved them. Each role is approved
 * on its own: pass the role to ask about it (without one: may the account trade in any role).
 */
export function useTradingStatus(role?: 'vendor' | 'delivery_agent') {
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
  const known = loadedFor === userId && !!state;
  const forRole = role ? state?.tradingRoles?.find((r) => r.role === role) : undefined;
  const mayTrade = !applies || (known && (role ? forRole?.mayTrade === true : state?.mayTrade === true));
  return { state: applies ? state : null, roleState: forRole ?? null, loaded, mayTrade };
}

/** Sends not-yet-approved vendors / agents back to their dashboard (which shows the approval status). */
export function useRequireTrading(home = '/vendor/dashboard') {
  const t = useTradingStatus(home.startsWith('/delivery-agent') ? 'delivery_agent' : 'vendor');
  const router = useRouter();
  useEffect(() => {
    if (t.loaded && !t.mayTrade) router.replace(home);
  }, [t.loaded, t.mayTrade, router, home]);
  return t;
}

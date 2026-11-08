'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { VerificationState } from '@/components/account/AccountVerification';

/** A slim reminder shown to vendors/agents until they are fully verified. */
export function VerificationBanner() {
  const { user, roles } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<VerificationState | null>(null);

  useEffect(() => {
    if (!user || (!roles.includes('vendor') && !roles.includes('delivery_agent'))) {
      setState(null);
      return;
    }
    fetch('/api/account/verification')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d?.state ?? null))
      .catch(() => {});
  }, [user, roles, pathname]);

  if (!state || pathname === '/shop' || pathname.startsWith('/account/verification')) return null;
  // Each role is approved on its own. Remind about a role that isn't cleared yet when nothing can
  // trade, or when the person is on that role's own pages.
  const waiting = (state.tradingRoles ?? []).filter((r) => !r.mayTrade);
  const here = waiting.filter((r) => (r.role === 'vendor' ? pathname.startsWith('/vendor') : pathname.startsWith('/delivery-agent')));
  const shown = !state.mayTrade ? waiting : here;
  if (shown.length === 0) return null;
  const subject = waiting.length === (state.tradingRoles ?? []).length ? 'Your account' : `Your ${shown.map((r) => r.label.toLowerCase()).join(' and ')} profile`;

  const text = shown.some((r) => r.approvalStatus === 'rejected')
    ? `${subject} needs changes before it can be approved.`
    : shown.every((r) => r.readyForReview)
      ? `${subject} is waiting for admin approval.`
      : `Finish verifying ${subject.replace(/^Your/, 'your')} to start trading.`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span className="flex-1">{text}</span>
      <Link href="/account/verification" className="font-medium underline">
        Open account verification
      </Link>
    </div>
  );
}

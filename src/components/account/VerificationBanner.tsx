'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { VerificationState } from '@/components/account/AccountVerification';

/** A slim reminder shown to vendors/agents until they are fully verified. */
export function VerificationBanner() {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<VerificationState | null>(null);

  useEffect(() => {
    if (!user || (role !== 'vendor' && role !== 'delivery_agent')) {
      setState(null);
      return;
    }
    fetch('/api/account/verification')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d?.state ?? null))
      .catch(() => {});
  }, [user, role, pathname]);

  if (!state || state.mayTrade || pathname.startsWith('/account/verification')) return null;

  const text =
    state.approvalStatus === 'rejected'
      ? 'Your verification needs changes.'
      : state.readyForReview
        ? 'Your account is waiting for admin approval.'
        : 'Finish verifying your account to start trading.';

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

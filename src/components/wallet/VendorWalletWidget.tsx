'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Summary = { balance: number; totalEarned: number; totalWithdrawn: number; withdrawable: number };
const naira = (n: number) => `${n < 0 ? '−' : ''}₦${Math.abs(n).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

/** The vendor dashboard's wallet tab: real earnings at a glance, with withdrawals on the Wallet page. */
export function VendorWalletWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pending, setPending] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/wallet/payouts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.earner) {
          setSummary(d.summary);
          setPending(d.withdrawals.filter((w: { status: string }) => ['awaiting_approval', 'awaiting_otp', 'pending'].includes(w.status)).length);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Wallet className="h-6 w-6 text-primary" /> Earnings
        </CardTitle>
        <CardDescription>Money from your sales and deliveries arrives here as soon as each order is delivered or collected.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loaded ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : summary ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-primary/40 bg-primary/5 p-2">
              <p className="text-lg font-semibold text-primary">{naira(summary.withdrawable)}</p>
              <p className="text-xs text-muted-foreground">Available to withdraw</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-lg font-semibold">{naira(summary.totalEarned)}</p>
              <p className="text-xs text-muted-foreground">Total earned</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-lg font-semibold">{naira(summary.totalWithdrawn)}</p>
              <p className="text-xs text-muted-foreground">Withdrawn</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Your earnings will show here once your first order is completed.</p>
        )}
        {pending > 0 && <p className="text-sm text-muted-foreground">You have a withdrawal in progress.</p>}
        <Button asChild className="w-full">
          <Link href="/wallet">
            Withdraw and see history <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

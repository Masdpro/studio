'use client';

import Link from 'next/link';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openWallet, useWalletBalance } from '@/hooks/use-wallet-balance';

/** The wallet on the profile page: balance, Add funds, and a link to history and withdrawals. */
export function WalletCard() {
  const balance = useWalletBalance();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Wallet className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Wallet balance</p>
        <p className="text-2xl font-bold">{balance === null ? '…' : `₦${balance.toLocaleString()}`}</p>
        <Link href="/wallet" className="text-xs font-medium text-primary underline">History &amp; withdrawals</Link>
      </div>
      <Button onClick={() => openWallet()} className="shrink-0">
        <Plus className="mr-1.5 h-4 w-4" />Add funds
      </Button>
    </div>
  );
}

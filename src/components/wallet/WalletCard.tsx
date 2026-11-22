'use client';

import Link from 'next/link';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openWallet, useWalletBalance } from '@/hooks/use-wallet-balance';

/** The wallet on the profile page: balance, Add funds, and a link to history and withdrawals. */
export function WalletCard() {
  const balance = useWalletBalance();
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-xl border bg-background p-4 sm:grid-cols-[auto_1fr_auto]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Wallet className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Wallet balance</p>
        <p className="whitespace-nowrap text-2xl font-bold">{balance === null ? '…' : `₦${balance.toLocaleString()}`}</p>
        <Link href="/wallet" className="text-xs font-medium text-primary underline">History &amp; withdrawals</Link>
      </div>
      <Button onClick={() => openWallet()} className="col-span-2 w-full sm:col-span-1 sm:w-auto">
        <Plus className="mr-1.5 h-4 w-4" />Add funds
      </Button>
    </div>
  );
}

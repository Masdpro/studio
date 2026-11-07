'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SuggestInput } from '@/components/forms/PlaceFields';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Banknote, Building2, Loader2, Wallet } from 'lucide-react';

type Entry = { id: string; type: string; amount: number; balanceAfter: number; fee: number | null; orderId: string | null; description: string; createdAt: number };
type WithdrawalRow = { id: string; amount: number; fee: number; net: number; status: 'pending' | 'success' | 'failed' | 'reversed'; failureReason: string | null; bankName: string; accountNumber: string; createdAt: number };
type Payouts =
  | { earner: false }
  | {
      earner: true;
      summary: { balance: number; totalEarned: number; totalWithdrawn: number; withdrawable: number };
      bankAccount: { bankCode: string; bankName: string; accountName: string; accountNumber: string } | null;
      blockReason: string | null;
      minWithdrawal: number;
      serviceFeePercent: number;
      withdrawals: WithdrawalRow[];
    };

const naira = (n: number) => `${n < 0 ? '−' : ''}₦${Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const when = (ms: number) => new Date(ms).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const transferFee = (a: number) => (a <= 5000 ? 10 : a <= 50000 ? 25 : 50);

const TYPE_LABEL: Record<string, string> = {
  funding: 'Top-up',
  purchase: 'Purchase',
  refund: 'Refund',
  sale: 'Sale',
  delivery_earning: 'Delivery fee',
  earning_reversal: 'Reversal',
  withdrawal: 'Withdrawal',
  withdrawal_reversal: 'Withdrawal returned',
  adjustment: 'Adjustment',
};

const STATUS_STYLE: Record<WithdrawalRow['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  reversed: 'bg-red-100 text-red-800 border-red-300',
};
const STATUS_LABEL: Record<WithdrawalRow['status'], string> = { pending: 'On its way', success: 'Paid', failed: 'Failed · refunded', reversed: 'Reversed · refunded' };

export function WalletView() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [payouts, setPayouts] = useState<Payouts | null>(null);

  const loadAll = useCallback(async () => {
    const [w, t, p] = await Promise.all([
      fetch('/api/wallet').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/wallet/transactions').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/wallet/payouts').then((r) => (r.ok ? r.json() : null)),
    ]);
    if (w?.wallet) setBalance(w.wallet.balance);
    if (t) {
      setEntries(t.entries);
      setHasMore(t.hasMore);
    }
    if (p) setPayouts(p);
  }, []);

  useEffect(() => {
    loadAll();
    window.addEventListener('wallet:updated', loadAll);
    return () => window.removeEventListener('wallet:updated', loadAll);
  }, [loadAll]);

  async function loadMore() {
    const last = entries[entries.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const t = await fetch(`/api/wallet/transactions?before=${last.createdAt}`).then((r) => r.json());
      setEntries((prev) => [...prev, ...t.entries]);
      setHasMore(t.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  const refreshAfterChange = () => {
    loadAll();
    window.dispatchEvent(new Event('wallet:updated'));
    window.dispatchEvent(new Event('notifications:updated'));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Wallet balance
          </CardDescription>
          <CardTitle className="text-4xl">{balance === null ? <Loader2 className="h-8 w-8 animate-spin" /> : naira(balance)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Top up from the wallet button at the top of the page. Purchases, refunds{payouts?.earner ? ', earnings and withdrawals' : ''} all show below.
        </CardContent>
      </Card>

      {payouts?.earner && <EarningsCard data={payouts} onChanged={refreshAfterChange} toast={toast} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Transaction history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul className="divide-y">
              {entries.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3 sm:px-6">
                  <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', e.amount >= 0 ? 'bg-green-100 text-green-700' : 'bg-muted text-foreground')}>
                    {e.amount >= 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{TYPE_LABEL[e.type] ?? e.type}</p>
                      <p className={cn('whitespace-nowrap text-sm font-semibold', e.amount >= 0 ? 'text-green-700' : 'text-foreground')}>
                        {e.amount >= 0 ? '+' : '−'}
                        {naira(Math.abs(e.amount))}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground break-words">{e.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {when(e.createdAt)} · Balance {naira(e.balanceAfter)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <div className="p-4 text-center">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Show older
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EarningsCard({
  data,
  onChanged,
  toast,
}: {
  data: Extract<Payouts, { earner: true }>;
  onChanged: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [editingBank, setEditingBank] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { summary, bankAccount, blockReason, minWithdrawal, withdrawals } = data;

  const value = Number(amount.replace(/,/g, ''));
  const fee = value > 0 ? transferFee(value) : 0;
  const pending = withdrawals.some((w) => w.status === 'pending');

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value >= minWithdrawal)) return setError(`The minimum withdrawal is ${naira(minWithdrawal)}.`);
    if (value > summary.withdrawable) return setError(`You can withdraw up to ${naira(summary.withdrawable)}.`);
    setBusy(true);
    try {
      const res = await fetch('/api/wallet/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: value }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Could not start the withdrawal.');
      } else {
        setAmount('');
        toast({ title: body.withdrawal?.status === 'success' ? 'Withdrawal sent' : 'Withdrawal on its way', description: `${naira(body.withdrawal.net)} is being sent to your bank account.` });
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Banknote className="h-5 w-5 text-primary" /> Earnings & withdrawals
        </CardTitle>
        <CardDescription>
          Earnings arrive as soon as an order is delivered or collected.
          {data.serviceFeePercent > 0 ? ` A ${data.serviceFeePercent}% Closebuy service fee is taken from each sale.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Available to withdraw" value={naira(summary.withdrawable)} strong />
          <Stat label="Total earned" value={naira(summary.totalEarned)} />
          <Stat label="Withdrawn" value={naira(summary.totalWithdrawn)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4" /> Payout bank account
            </h3>
            {bankAccount && !editingBank && (
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setEditingBank(true)}>
                Change
              </Button>
            )}
          </div>
          {bankAccount && !editingBank ? (
            <p className="rounded-md border p-3 text-sm">
              <span className="font-medium">{bankAccount.accountName}</span>
              <br />
              <span className="text-muted-foreground">
                {bankAccount.bankName} {bankAccount.accountNumber}
              </span>
            </p>
          ) : (
            <BankAccountForm
              hasExisting={!!bankAccount}
              onCancel={bankAccount ? () => setEditingBank(false) : undefined}
              onSaved={() => {
                setEditingBank(false);
                toast({ title: 'Bank account saved' });
                onChanged();
              }}
            />
          )}
        </div>

        {blockReason && !(blockReason.startsWith('Add the bank account') && !bankAccount) ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {blockReason}{' '}
              {blockReason.startsWith('Finish account verification') && (
                <Link href="/account/verification" className="font-medium underline">
                  Open verification
                </Link>
              )}
            </AlertDescription>
          </Alert>
        ) : bankAccount ? (
          <form method="post" onSubmit={withdraw} className="space-y-2">
            <Label htmlFor="wd-amount">Amount to withdraw</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="wd-amount"
                inputMode="decimal"
                placeholder={`Minimum ${naira(minWithdrawal)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
              />
              <Button type="button" variant="outline" onClick={() => setAmount(String(summary.withdrawable))} disabled={summary.withdrawable <= 0}>
                Max
              </Button>
              <Button type="submit" disabled={busy || pending || !(value > 0)}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Withdraw
              </Button>
            </div>
            {value > 0 && (
              <p className="text-xs text-muted-foreground">
                Transfer fee {naira(fee)} · you receive <span className="font-medium text-foreground">{naira(Math.max(0, value - fee))}</span> in {bankAccount.bankName} {bankAccount.accountNumber}
              </p>
            )}
            {pending && <p className="text-xs text-muted-foreground">A withdrawal is on its way. You can make another once it arrives.</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        ) : null}

        {withdrawals.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Recent withdrawals</h3>
            <ul className="divide-y rounded-md border">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{naira(w.net)} to {w.bankName} {w.accountNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {when(w.createdAt)} · {naira(w.amount)} incl. {naira(w.fee)} fee
                    </p>
                    {w.failureReason && w.status !== 'success' && <p className="text-xs text-muted-foreground">Money returned to your wallet.</p>}
                  </div>
                  <Badge variant="outline" className={cn('shrink-0', STATUS_STYLE[w.status])}>
                    {STATUS_LABEL[w.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-md border p-2', strong && 'border-primary/40 bg-primary/5')}>
      <p className={cn('text-base font-semibold sm:text-lg', strong && 'text-primary')}>{value}</p>
      <p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

function BankAccountForm({ hasExisting, onSaved, onCancel }: { hasExisting: boolean; onSaved: () => void; onCancel?: () => void }) {
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/banks')
      .then((r) => r.json())
      .then((d) => (d.banks ? setBanks(d.banks) : setError(d.error ?? 'Could not load banks.')))
      .catch(() => setError('Could not load banks.'));
  }, []);

  const names = useMemo(() => banks.map((b) => b.name), [banks]);
  const bank = banks.find((b) => b.name.toLowerCase() === bankName.trim().toLowerCase());

  // Look up the account name as soon as the bank and a full account number are in.
  useEffect(() => {
    setAccountName(null);
    if (!bank || !/^\d{10}$/.test(accountNumber)) return;
    let cancelled = false;
    setResolving(true);
    setError(null);
    fetch('/api/wallet/bank-account/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankCode: bank.code, accountNumber }) })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok) setAccountName(d.accountName);
        else setError(d.error ?? "We couldn't find that account.");
      })
      .finally(() => !cancelled && setResolving(false));
    return () => {
      cancelled = true;
    };
  }, [bank, accountNumber]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!bank || !accountName) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/wallet/bank-account', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankCode: bank.code, accountNumber, password }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? 'Could not save the bank account.');
      else onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form method="post" onSubmit={save} className="space-y-3 rounded-md border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="bank-name">Bank</Label>
        <SuggestInput id="bank-name" value={bankName} onValueChange={setBankName} suggestions={names} placeholder={banks.length ? 'Start typing, e.g. Access, GTBank, Opay' : 'Loading banks…'} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acct-no">Account number</Label>
        <Input id="acct-no" inputMode="numeric" maxLength={10} placeholder="10 digits" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} />
      </div>
      {resolving && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking account…
        </p>
      )}
      {accountName && (
        <>
          <p className="rounded-md bg-muted p-2 text-sm">
            Account name: <span className="font-semibold">{accountName}</span>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="bank-pw">Your Closebuy password</Label>
            <Input id="bank-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              We ask for it to keep your earnings safe.{hasExisting ? ' After a change, withdrawals pause for 24 hours.' : ''}
            </p>
          </div>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!accountName || !password || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save bank account
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

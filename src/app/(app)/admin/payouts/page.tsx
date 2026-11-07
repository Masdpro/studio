'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Banknote, Check, Loader2, RefreshCw, X } from 'lucide-react';
import { AdminGate } from '@/components/admin/AdminGate';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Status = 'awaiting_approval' | 'awaiting_otp' | 'pending' | 'success' | 'failed' | 'reversed' | 'rejected';
type Row = {
  id: string; userId: string; user: string; email: string | null; suspended: boolean;
  amount: number; fee: number; net: number; status: Status;
  failureReason: string | null; bank: string; createdAt: number; completedAt: number | null;
};

const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const when = (ms: number) => new Date(ms).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const STYLE: Record<Status, string> = {
  awaiting_approval: 'bg-amber-100 text-amber-800 border-amber-300',
  awaiting_otp: 'bg-blue-100 text-blue-800 border-blue-300',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  reversed: 'bg-red-100 text-red-800 border-red-300',
  rejected: 'bg-muted text-muted-foreground',
};
const LABEL: Record<Status, string> = {
  awaiting_approval: 'Needs approval',
  awaiting_otp: 'Enter OTP',
  pending: 'Sending',
  success: 'Paid',
  failed: 'Failed',
  reversed: 'Reversed',
  rejected: 'Declined',
};

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [feePct, setFeePct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [otp, setOtp] = useState<Record<string, string>>({});
  const [declining, setDeclining] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts');
      if (res.ok) {
        const d = await res.json();
        setRows(d.withdrawals);
        setFeePct(d.serviceFeePercent);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function act(row: Row, body: Record<string, string>, success: string) {
    setBusy(`${row.id}:${body.action}`);
    try {
      const res = await fetch(`/api/admin/payouts/${row.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) toast({ variant: 'destructive', title: 'Not done', description: d.error ?? 'Something went wrong.' });
      else toast({ title: success });
      await load();
      return res.ok;
    } finally {
      setBusy(null);
    }
  }

  const waiting = rows.filter((r) => r.status === 'awaiting_approval' || r.status === 'awaiting_otp');
  const history = rows.filter((r) => r.status !== 'awaiting_approval' && r.status !== 'awaiting_otp');
  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.status === 'success').reduce((s, r) => s + r.net, 0);
    const toApprove = waiting.reduce((s, r) => s + r.net, 0);
    const failed = rows.filter((r) => r.status === 'failed' || r.status === 'reversed').length;
    return { paid, toApprove, failed };
  }, [rows, waiting]);

  return (
    <AdminGate>
      <div className="container mx-auto max-w-5xl space-y-4 py-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin</Link>
        </Button>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl"><Banknote className="h-6 w-6 text-primary" /> Payouts</CardTitle>
              <CardDescription>
                Approve each withdrawal, then type the OTP Paystack sends you to release it. Declined or failed ones go back to the person&apos;s wallet.
                Service fee on sales: {feePct}%. To stop someone withdrawing, suspend them under Users.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-primary/40 bg-primary/5 p-2"><p className="text-lg font-semibold">{naira(totals.toApprove)}</p><p className="text-xs text-muted-foreground">Waiting ({waiting.length})</p></div>
              <div className="rounded-md border p-2"><p className="text-lg font-semibold">{naira(totals.paid)}</p><p className="text-xs text-muted-foreground">Paid out</p></div>
              <div className="rounded-md border p-2"><p className="text-lg font-semibold">{totals.failed}</p><p className="text-xs text-muted-foreground">Failed</p></div>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Waiting for you</h3>
              {waiting.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing to approve right now.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {waiting.map((r) => (
                    <li key={r.id} className="space-y-2 p-3 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {naira(r.net)} to {r.user}
                            {r.suspended && <Badge variant="destructive" className="ml-2">Suspended</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground break-words">{r.email} · {r.bank}</p>
                          <p className="text-xs text-muted-foreground">Requested {when(r.createdAt)} · {naira(r.amount)} incl. {naira(r.fee)} transfer fee</p>
                        </div>
                        <Badge variant="outline" className={cn('self-start', STYLE[r.status])}>{LABEL[r.status]}</Badge>
                      </div>
                      {r.status === 'awaiting_approval' ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => act(r, { action: 'approve' }, 'Approved. Paystack is sending you an OTP.')} disabled={!!busy || r.suspended}>
                            {busy === `${r.id}:approve` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeclining(r)} disabled={!!busy}>
                            <X className="mr-1.5 h-4 w-4" /> Decline
                          </Button>
                        </div>
                      ) : (
                        <form
                          method="post"
                          className="flex flex-wrap items-center gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (await act(r, { action: 'otp', otp: otp[r.id] ?? '' }, 'Transfer released')) setOtp((o) => ({ ...o, [r.id]: '' }));
                          }}
                        >
                          <Input
                            className="w-36 text-center font-mono tracking-widest"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="OTP"
                            aria-label="Paystack OTP"
                            value={otp[r.id] ?? ''}
                            onChange={(e) => setOtp((o) => ({ ...o, [r.id]: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                          />
                          <Button size="sm" type="submit" disabled={!!busy || (otp[r.id] ?? '').length < 4}>
                            {busy === `${r.id}:otp` && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                            Release payment
                          </Button>
                          <Button size="sm" type="button" variant="ghost" onClick={() => act(r, { action: 'resend' }, 'OTP sent again')} disabled={!!busy}>
                            Resend OTP
                          </Button>
                          <Button size="sm" type="button" variant="ghost" className="text-destructive" onClick={() => setDeclining(r)} disabled={!!busy}>
                            Decline
                          </Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">History</h3>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payouts yet.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {history.map((r) => (
                    <li key={r.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{naira(r.net)} to {r.user}</p>
                        <p className="text-xs text-muted-foreground break-words">{r.bank}</p>
                        <p className="text-xs text-muted-foreground">{when(r.createdAt)} · {naira(r.amount)} incl. {naira(r.fee)} fee</p>
                        {r.failureReason && r.status !== 'success' && <p className="text-xs text-destructive break-words">{r.failureReason}</p>}
                      </div>
                      <Badge variant="outline" className={cn('self-start', STYLE[r.status])}>{LABEL[r.status]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>

        <ReasonDialog
          open={!!declining}
          onOpenChange={(o) => !o && setDeclining(null)}
          title="Decline this withdrawal?"
          description={declining ? `${naira(declining.amount)} goes back to ${declining.user}'s wallet. They'll see your reason.` : ''}
          confirmLabel="Decline withdrawal"
          placeholder="e.g. Customer complaint under review"
          onConfirm={async (reason) => {
            if (declining && (await act(declining, { action: 'reject', reason }, 'Withdrawal declined and refunded'))) setDeclining(null);
          }}
        />
      </div>
    </AdminGate>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Banknote, Loader2, RefreshCw } from 'lucide-react';
import { AdminGate } from '@/components/admin/AdminGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Row = {
  id: string; userId: string; user: string; email: string | null; suspended: boolean;
  amount: number; fee: number; net: number; status: 'pending' | 'success' | 'failed' | 'reversed';
  failureReason: string | null; bank: string; createdAt: number; completedAt: number | null;
};

const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const when = (ms: number) => new Date(ms).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const STYLE: Record<Row['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  reversed: 'bg-red-100 text-red-800 border-red-300',
};
const LABEL: Record<Row['status'], string> = { pending: 'Pending', success: 'Paid', failed: 'Failed', reversed: 'Reversed' };

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [feePct, setFeePct] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.status === 'success').reduce((s, r) => s + r.net, 0);
    const pending = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.net, 0);
    const failed = rows.filter((r) => r.status === 'failed' || r.status === 'reversed').length;
    return { paid, pending, failed };
  }, [rows]);

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
                Withdrawals by vendors and delivery agents, sent automatically through Paystack. Failed ones are returned to the person&apos;s wallet.
                Service fee on sales: {feePct}%. To stop someone withdrawing, suspend them under Users.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border p-2"><p className="text-lg font-semibold">{naira(totals.paid)}</p><p className="text-xs text-muted-foreground">Paid out</p></div>
              <div className="rounded-md border p-2"><p className="text-lg font-semibold">{naira(totals.pending)}</p><p className="text-xs text-muted-foreground">On the way</p></div>
              <div className="rounded-md border p-2"><p className="text-lg font-semibold">{totals.failed}</p><p className="text-xs text-muted-foreground">Failed</p></div>
            </div>
            {rows.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {r.user}
                        {r.suspended && <Badge variant="destructive" className="ml-2">Suspended</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">{r.email} · {r.bank}</p>
                      <p className="text-xs text-muted-foreground">
                        {when(r.createdAt)} · {naira(r.net)} sent ({naira(r.amount)} incl. {naira(r.fee)} fee)
                      </p>
                      {r.failureReason && <p className="text-xs text-destructive break-words">{r.failureReason}</p>}
                    </div>
                    <Badge variant="outline" className={cn('self-start', STYLE[r.status])}>{LABEL[r.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGate>
  );
}

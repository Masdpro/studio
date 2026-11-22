'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { naira, whenLabel } from '@/lib/booking-time';
import { BookingStatusBadge } from '@/components/services/BookingStatusBadge';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';
import { InfoTip } from '@/components/ui/info-tip';

const SETTLE_RULES = { reason: rules.text('a reason', 3, 300) };

type Booking = { id: string; serviceName: string; providerName: string; startsAt: string; endsAt: string; total: number; status: string; location: string; cancelReason: string | null };

/** Support's view of bookings: jobs that ended without being closed come first, to settle. */
export default function AdminBookingsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<{ bookings: Booking[]; now: number } | null>(null);
  const [settling, setSettling] = useState<{ b: Booking; action: 'complete' | 'cancel' } | null>(null);
  const [reason, setReason] = useState('');
  const checks = useFieldChecks<'reason'>(SETTLE_RULES);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/bookings', { cache: 'no-store' });
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const go = async () => {
    if (!checks.validateAll({ reason })) return;
    if (!settling) return;
    setBusy(true);
    const res = await fetch(`/api/admin/bookings/${settling.b.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: settling.action, reason }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast({ title: 'Not done', description: d.error, variant: 'destructive' }); return; }
    toast({ title: settling.action === 'complete' ? 'Vendor paid' : 'Cancelled and refunded' });
    setSettling(null);
    setReason('');
    load();
  };

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const overdue = data.bookings.filter((b) => b.status === 'Confirmed' && new Date(b.endsAt).getTime() < data.now - 3600_000);
  const rest = data.bookings.filter((b) => !overdue.includes(b));

  const table = (list: Booking[], actions: boolean) => (
    <Table>
      <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Service</TableHead><TableHead>Vendor</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead>{actions && <TableHead />}</TableRow></TableHeader>
      <TableBody>
        {list.map((b) => (
          <TableRow key={b.id}>
            <TableCell className="whitespace-nowrap">{whenLabel(new Date(b.startsAt).getTime())}</TableCell>
            <TableCell>{b.serviceName}{b.location === 'home' ? ' (home)' : ''}</TableCell>
            <TableCell>{b.providerName}</TableCell>
            <TableCell>{naira(b.total)}</TableCell>
            <TableCell><BookingStatusBadge status={b.status} />{b.cancelReason && <p className="mt-1 max-w-48 text-xs text-muted-foreground">{b.cancelReason}</p>}</TableCell>
            {actions && (
              <TableCell className="space-x-1 whitespace-nowrap">
                {b.status === 'Confirmed' && <Button size="sm" variant="outline" onClick={() => setSettling({ b, action: 'complete' })}>Pay vendor</Button>}
                {['Requested', 'Confirmed'].includes(b.status) && <Button size="sm" variant="ghost" onClick={() => setSettling({ b, action: 'cancel' })}>Refund</Button>}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarCheck className="h-6 w-6 text-primary" />Bookings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">To settle ({overdue.length})<InfoTip>Jobs that ended over an hour ago without the provider entering the code. Nothing is paid out on its own: check with both sides, then pay the provider or refund the customer.</InfoTip></CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">{overdue.length ? table(overdue, true) : <p className="text-sm text-muted-foreground">Nothing to settle.</p>}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">All bookings<InfoTip>Upcoming first, then the latest closed ones.</InfoTip></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">{rest.length ? table(rest, true) : <p className="text-sm text-muted-foreground">No bookings yet.</p>}</CardContent>
      </Card>
      {settling && (
        <Dialog open onOpenChange={(o) => !o && setSettling(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{settling.action === 'complete' ? 'Pay the provider?' : 'Cancel and refund in full?'}</DialogTitle>
              <DialogDescription>{settling.b.serviceName} · {settling.b.providerName} · {naira(settling.b.total)}</DialogDescription>
            </DialogHeader>
            <Textarea rows={3} placeholder="Reason (required), e.g. customer confirmed by phone" {...checks.field('reason', reason, (v: string) => setReason(v))} />
            <FieldError message={checks.error('reason')} />
            <DialogFooter><Button disabled={!reason.trim() || busy} onClick={go}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{settling.action === 'complete' ? 'Pay vendor' : 'Refund customer'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

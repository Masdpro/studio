'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Clock, Home, Loader2, Phone, Settings, Store, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRequireTrading } from '@/hooks/use-trading-status';
import { dayLabel, lagosDate, lagosClock, naira, whenLabel } from '@/lib/booking-time';
import { BookingStatusBadge } from '@/components/services/BookingStatusBadge';
import { MoveDialog } from '@/components/services/MoveDialog';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';

const CODE_RULES = { code: rules.digits(4, "the customer's code") };

type Booking = {
  id: string; serviceId: string; providerId: string; serviceName: string; startsAt: string; endsAt: string; location: 'shop' | 'home'; address: string | null;
  note: string | null; total: number; status: string; respondBy: string | null; customerName: string; customerPhone: string | null; cancelReason: string | null;
};

/** A service provider's bookings: requests to answer, today's and upcoming appointments by day, and past ones. */
export default function ProviderBookingsPage() {
  useRequireTrading('/provider/dashboard');
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<Booking[] | null>(null);
  const [now, setNow] = useState(Date.now());
  const [completing, setCompleting] = useState<Booking | null>(null);
  const [moving, setMoving] = useState<Booking | null>(null);
  const [confirm, setConfirm] = useState<{ b: Booking; action: 'decline' | 'cancel' | 'noshow' } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/provider/bookings', { cache: 'no-store' });
    if (res.ok) {
      const d = await res.json();
      setList(d.bookings);
      setNow(d.now);
    } else setList([]);
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => { const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  const act = async (b: Booking, action: string, extra: object = {}) => {
    setBusy(b.id + action);
    const res = await fetch(`/api/provider/bookings/${b.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { toast({ title: 'That didn\'t work', description: data.error, variant: 'destructive' }); return false; }
    const done: Record<string, string> = { accept: 'Booking accepted', decline: 'Request declined. The customer is refunded.', cancel: 'Booking cancelled. The customer is refunded.', complete: 'Job complete. The money is in your wallet.', noshow: 'Marked as a no-show. You keep 50%.' };
    toast({ title: done[action] ?? 'Done' });
    if (action === 'complete' || action === 'noshow') window.dispatchEvent(new Event('wallet:updated'));
    load();
    return true;
  };

  const groups = useMemo(() => {
    const l = list ?? [];
    const requests = l.filter((b) => b.status === 'Requested');
    const confirmed = l.filter((b) => b.status === 'Confirmed');
    const past = l.filter((b) => !['Requested', 'Confirmed'].includes(b.status)).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
    const byDay = new Map<string, Booking[]>();
    for (const b of confirmed) {
      const d = lagosDate(new Date(b.startsAt).getTime());
      byDay.set(d, [...(byDay.get(d) ?? []), b]);
    }
    return { requests, byDay: Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)), past, confirmedCount: confirmed.length };
  }, [list]);

  if (!list) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const today = lagosDate(now);

  const row = (b: Booking) => {
    const start = new Date(b.startsAt).getTime();
    const end = new Date(b.endsAt).getTime();
    return (
      <Card key={b.id}>
        <CardContent className="space-y-2 p-4 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{lagosClock(start)}–{lagosClock(end)} · {b.serviceName}</p>
              <p className="flex items-center gap-1 text-muted-foreground"><User className="h-3.5 w-3.5" />{b.customerName}{b.customerPhone && <a className="ml-2 flex items-center gap-1 underline" href={`tel:${b.customerPhone}`}><Phone className="h-3 w-3" />{b.customerPhone}</a>}</p>
            </div>
            <BookingStatusBadge status={b.status} />
          </div>
          <p className="flex items-center gap-1 text-muted-foreground">{b.location === 'home' ? <Home className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}{b.location === 'home' ? `Home visit: ${b.address}` : 'At your place of work'} · {naira(b.total)}</p>
          {b.note && <p className="rounded bg-muted px-2 py-1">&ldquo;{b.note}&rdquo;</p>}
          {b.status === 'Requested' && (
            <>
              {b.respondBy && <p className="text-xs text-amber-800">Answer by {whenLabel(new Date(b.respondBy).getTime())} or it lapses and the customer is refunded.</p>}
              <div className="flex gap-2">
                <Button size="sm" disabled={!!busy} onClick={() => act(b, 'accept')}>{busy === b.id + 'accept' && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Accept</Button>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setConfirm({ b, action: 'decline' })}>Decline</Button>
                <Button size="sm" variant="ghost" onClick={() => setMoving(b)}>Suggest another time</Button>
              </div>
            </>
          )}
          {b.status === 'Confirmed' && (
            <div className="flex flex-wrap gap-2">
              {now >= start - 30 * 60_000 && <Button size="sm" onClick={() => setCompleting(b)}>Job done: enter code</Button>}
              {now >= start + 15 * 60_000 && <Button size="sm" variant="outline" onClick={() => setConfirm({ b, action: 'noshow' })}>Customer didn&apos;t come</Button>}
              {now < start && <Button size="sm" variant="outline" onClick={() => setMoving(b)}>Move</Button>}
              {now < start && <Button size="sm" variant="ghost" onClick={() => setConfirm({ b, action: 'cancel' })}>Cancel</Button>}
            </div>
          )}
          {b.cancelReason && !['Requested', 'Confirmed'].includes(b.status) && <p className="text-xs text-muted-foreground">Reason: {b.cancelReason}</p>}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto max-w-3xl space-y-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarCheck className="h-6 w-6 text-primary" />Bookings</h1>
        <Button variant="outline" size="sm" asChild><Link href="/provider/services"><Settings className="mr-1.5 h-4 w-4" />Services &amp; portfolio</Link></Button>
      </div>
      <Tabs defaultValue={groups.requests.length ? 'requests' : 'upcoming'}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">Requests{groups.requests.length ? ` (${groups.requests.length})` : ''}</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming{groups.confirmedCount ? ` (${groups.confirmedCount})` : ''}</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="space-y-3">
          {groups.requests.length ? groups.requests.map(row) : <Empty text="No requests waiting. If you approve each booking, new requests appear here." />}
        </TabsContent>
        <TabsContent value="upcoming" className="space-y-5">
          {groups.byDay.length ? groups.byDay.map(([day, items]) => (
            <section key={day} className="space-y-2">
              <h2 className="font-semibold">{day === today ? 'Today' : dayLabel(day)}</h2>
              {items.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)).map(row)}
            </section>
          )) : <Empty text="No upcoming bookings yet." />}
        </TabsContent>
        <TabsContent value="past" className="space-y-3">
          {groups.past.length ? groups.past.slice(0, 50).map(row) : <Empty text="Finished and cancelled bookings appear here." />}
        </TabsContent>
      </Tabs>

      {completing && <CodeDialog b={completing} onClose={() => setCompleting(null)} onSubmit={async (code) => { if (await act(completing, 'complete', { code })) setCompleting(null); }} busy={!!busy} />}
      {moving && <MoveDialog as="provider" b={moving} onDone={() => { setMoving(null); load(); }} />}
      {confirm && (
        <Dialog open onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{{ decline: 'Decline this request?', cancel: 'Cancel this booking?', noshow: 'Mark as a no-show?' }[confirm.action]}</DialogTitle>
              <DialogDescription>{confirm.b.serviceName}, {whenLabel(new Date(confirm.b.startsAt).getTime())} · {confirm.b.customerName}</DialogDescription>
            </DialogHeader>
            <p className="text-sm">
              {confirm.action === 'noshow'
                ? `You keep ${naira(confirm.b.total / 2)} and the customer gets the rest back. Only do this if they really didn't come.`
                : `The customer gets the full ${naira(confirm.b.total)} back.${confirm.action === 'cancel' ? ' Cancellations are noted on your business\'s record.' : ''}`}
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>Go back</Button>
              <Button variant="destructive" disabled={!!busy} onClick={async () => { if (await act(confirm.b, confirm.action)) setConfirm(null); }}>Yes, {confirm.action === 'noshow' ? 'mark no-show' : confirm.action}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{text}</CardContent></Card>;
}

function CodeDialog({ b, onClose, onSubmit, busy }: { b: Booking; onClose: () => void; onSubmit: (code: string) => void; busy: boolean }) {
  const [code, setCode] = useState('');
  const checks = useFieldChecks<'code'>(CODE_RULES);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enter the customer&apos;s code</DialogTitle>
          <DialogDescription>Ask {b.customerName} for the 4-digit code in their Closebuy bookings. You&apos;re paid {naira(b.total)} straight away.</DialogDescription>
        </DialogHeader>
        <Input inputMode="numeric" autoFocus maxLength={4} {...checks.field('code', code, (v: string) => setCode(v.replace(/\D/g, '')))} className="text-center font-mono text-2xl tracking-[0.4em]" aria-label="Customer's code" />
        <FieldError message={checks.error('code')} />
        <DialogFooter>
          <Button disabled={code.length !== 4 || busy} onClick={() => checks.validateAll({ code }) && onSubmit(code)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm job done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

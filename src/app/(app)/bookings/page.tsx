'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Clock, Home, Loader2, MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { naira, whenLabel } from '@/lib/booking-time';
import { BookingStatusBadge } from '@/components/services/BookingStatusBadge';
import { MoveDialog } from '@/components/services/MoveDialog';

type Booking = {
  id: string; serviceId: string; providerId: string; providerName: string; providerSlug: string; providerAddress: string; serviceName: string; startsAt: string; endsAt: string; location: 'shop' | 'home';
  address: string | null; total: number; status: string; completionCode: string; canCancelFree: boolean; movedByProvider: boolean; respondBy: string | null;
};

/** A customer's bookings: upcoming first, with the code to give the provider, and cancel / move. */
export default function MyBookingsPage() {
  const { user, loading } = useAuth();
  const [list, setList] = useState<Booking[] | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [moving, setMoving] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/bookings', { cache: 'no-store' });
    setList(res.ok ? (await res.json()).bookings : []);
  }, []);
  useEffect(() => { if (user) load(); else if (!loading) setList([]); }, [user, loading, load]);

  if (!loading && !user) return <p className="py-16 text-center">Please <Link className="underline" href="/auth/login?callbackUrl=/bookings">sign in</Link> to see your bookings.</p>;
  if (!list) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const upcoming = list.filter((b) => b.status === 'Requested' || b.status === 'Confirmed').sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = list.filter((b) => !upcoming.includes(b));
  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-2">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarCheck className="h-6 w-6 text-primary" />My bookings</h1>
      {list.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No bookings yet. Services you book from a store show up here.</CardContent></Card>
      )}
      {upcoming.length > 0 && <section className="space-y-3"><h2 className="font-semibold">Upcoming</h2>{upcoming.map((b) => <Row key={b.id} b={b} onCancel={() => setCancelling(b)} onMove={() => setMoving(b)} />)}</section>}
      {past.length > 0 && <section className="space-y-3"><h2 className="font-semibold">Past</h2>{past.map((b) => <Row key={b.id} b={b} />)}</section>}
      {cancelling && <CancelDialog b={cancelling} onDone={() => { setCancelling(null); load(); }} />}
      {moving && <MoveDialog b={moving} onDone={() => { setMoving(null); load(); }} />}
    </div>
  );
}

function Row({ b, onCancel, onMove }: { b: Booking; onCancel?: () => void; onMove?: () => void }) {
  const start = new Date(b.startsAt).getTime();
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{b.serviceName}</CardTitle>
          <p className="text-sm text-muted-foreground">{b.providerName}</p>
        </div>
        <BookingStatusBadge status={b.status} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{whenLabel(start)}</span>
          <span className="flex items-center gap-1">{b.location === 'home' ? <Home className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}{b.location === 'home' ? b.address : b.providerAddress || 'At their place of work'}</span>
          <span>{naira(b.total)}</span>
        </div>
        {b.status === 'Confirmed' && b.completionCode && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Your code: give it to the provider only when the job is done</p>
            <p className="font-mono text-2xl font-bold tracking-[0.3em]">{b.completionCode}</p>
          </div>
        )}
        {b.status === 'Requested' && b.respondBy && <p className="text-xs text-muted-foreground">Waiting for the provider to accept by {whenLabel(new Date(b.respondBy).getTime())}. If they don&apos;t, you&apos;re refunded in full.</p>}
        {b.movedByProvider && b.status === 'Confirmed' && <p className="text-xs text-muted-foreground">{b.providerName} moved this booking. If the new time doesn&apos;t suit you, you can cancel for a full refund.</p>}
        {(onCancel || onMove) && (
          <div className="flex gap-2">
            {onMove && (b.canCancelFree || b.status === 'Requested') && <Button size="sm" variant="outline" onClick={onMove}>Change time</Button>}
            {onCancel && <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>}
            {b.location === 'shop' && <Button size="sm" variant="ghost" asChild><Link href={`/services/p/${b.providerSlug}`}><MapPin className="mr-1 h-3.5 w-3.5" />{b.providerName}</Link></Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CancelDialog({ b, onDone }: { b: Booking; onDone: () => void }) {
  const { toast } = useToast();
  const [terms, setTerms] = useState<{ refund: number; providerKeeps: number; late: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/bookings/${b.id}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => setTerms(d.terms)); }, [b.id]);
  const go = async () => {
    setBusy(true);
    const res = await fetch(`/api/bookings/${b.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast({ title: 'Could not cancel', description: data.error, variant: 'destructive' }); return; }
    window.dispatchEvent(new Event('wallet:updated'));
    toast({ title: 'Booking cancelled', description: `${naira(data.refund)} is back in your wallet.` });
    onDone();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>{b.serviceName}, {whenLabel(new Date(b.startsAt).getTime())}</DialogDescription>
        </DialogHeader>
        {!terms ? <Loader2 className="h-5 w-5 animate-spin" /> : terms.late ? (
          <p className="text-sm">It&apos;s less than 24 hours to your booking, so the provider keeps {naira(terms.providerKeeps)}. You get <strong>{naira(terms.refund)}</strong> back.</p>
        ) : (
          <p className="text-sm">You get the full <strong>{naira(terms.refund)}</strong> back in your wallet.</p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDone}>Keep booking</Button>
          <Button variant="destructive" disabled={!terms || busy} onClick={go}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancel booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

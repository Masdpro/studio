'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { whenLabel } from '@/lib/booking-time';
import { SlotPicker } from './SlotPicker';

/** Pick a new free time for a booking (customer or provider). */
export function MoveDialog({ b, onDone, as = 'customer' }: { b: { id: string; serviceId: string; serviceName: string }; onDone: () => void; as?: 'customer' | 'provider' }) {
  const { toast } = useToast();
  const [dates, setDates] = useState<string[] | null>(null);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/services?serviceId=${b.serviceId}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => setDates(d.dates ?? [])); }, [b.serviceId]);
  const go = async () => {
    setBusy(true);
    const res = await fetch(as === 'provider' ? `/api/provider/bookings/${b.id}` : `/api/bookings/${b.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reschedule', startsAt }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast({ title: 'Could not move the booking', description: data.error, variant: 'destructive' }); return; }
    toast({ title: 'Booking moved', description: `${b.serviceName} is now ${whenLabel(startsAt!)}.` });
    onDone();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Choose a new time</DialogTitle>
          <DialogDescription>{b.serviceName}{as === 'provider' ? '. The customer is told and can cancel for a full refund if it doesn\'t suit them.' : ''}</DialogDescription>
        </DialogHeader>
        {!dates ? <Loader2 className="h-5 w-5 animate-spin" /> : <SlotPicker serviceId={b.serviceId} dates={dates} value={startsAt} onChange={setStartsAt} movingBookingId={b.id} />}
        <DialogFooter>
          <Button disabled={!startsAt || busy} onClick={go}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{startsAt ? `Move to ${whenLabel(startsAt)}` : 'Choose a time'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

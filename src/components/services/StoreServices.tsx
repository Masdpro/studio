'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Clock, Home, Loader2, MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SafeImage } from '@/components/ui/safe-image';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { durationLabel, naira, whenLabel } from '@/lib/booking-time';
import { getSavedAddress } from '@/lib/delivery-address';
import { cn } from '@/lib/utils';
import { SlotPicker } from './SlotPicker';

export type PublicService = {
  id: string; vendorId: string; name: string; description: string | null; imageUrl: string | null; price: number; priceFrom: boolean;
  durationMin: number; location: 'shop' | 'home' | 'either'; callOutFee: number | null;
};

const placeWords = { shop: 'At the shop', home: 'Comes to you', either: 'At the shop or comes to you' };

/** A store's bookable services, with booking. Shows nothing when the store has none. */
export function StoreServices({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const [data, setData] = useState<{ services: PublicService[]; dates: string[]; instantBooking: boolean } | null>(null);
  const [booking, setBooking] = useState<PublicService | null>(null);
  const { user } = useAuth();
  const ownStore = !!user?.ownVendorId && user.ownVendorId === vendorId;

  const load = useCallback(() => {
    fetch(`/api/services?vendorId=${encodeURIComponent(vendorId)}`, { cache: 'no-store' }).then((r) => r.json()).then(setData).catch(() => setData(null));
  }, [vendorId]);
  useEffect(load, [load]);

  if (!data?.services.length) return null;
  return (
    <section className="mb-8">
      <h2 id="services" className="text-lg font-semibold mb-1 scroll-mt-20">Services</h2>
      <p className="text-sm text-muted-foreground mb-3">Book a time and pay now. Your money is held by Closebuy until the job is done.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.services.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            {s.imageUrl && (
              <div className="relative h-36 w-full bg-muted">
                <SafeImage src={s.imageUrl} alt={s.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
              </div>
            )}
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{s.name}</h3>
                <p className="shrink-0 font-bold text-primary">{s.priceFrom ? 'from ' : ''}{naira(s.price)}</p>
              </div>
              {s.description && <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{durationLabel(s.durationMin)}</span>
                <span className="flex items-center gap-1">{s.location === 'shop' ? <Store className="h-3 w-3" /> : <Home className="h-3 w-3" />}{placeWords[s.location]}</span>
                {s.location !== 'shop' && !!s.callOutFee && <span>+{naira(s.callOutFee)} call-out</span>}
              </div>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={ownStore} onClick={() => setBooking(s)} title={ownStore ? "You can't book your own services" : undefined}>
                <CalendarCheck className="mr-2 h-4 w-4" />{ownStore ? 'Your store' : 'Book'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {booking && (
        <BookDialog service={booking} vendorName={vendorName} dates={data.dates} instant={data.instantBooking} onClose={() => setBooking(null)} />
      )}
    </section>
  );
}

function BookDialog({ service, vendorName, dates, instant, onClose }: { service: PublicService; vendorName: string; dates: string[]; instant: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [place, setPlace] = useState<'shop' | 'home'>(service.location === 'home' ? 'home' : 'shop');
  const [address, setAddress] = useState(getSavedAddress()?.address ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [short, setShort] = useState<number | null>(null);
  const total = service.price + (place === 'home' ? service.callOutFee ?? 0 : 0);

  const submit = async () => {
    if (!user) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (!startsAt) return;
    setBusy(true);
    setShort(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: service.id, startsAt, location: place, address: place === 'home' ? address : undefined, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) { setShort(Math.ceil(data.shortfall ?? 0)); return; }
      if (!res.ok) throw new Error(data.error ?? 'Could not book.');
      window.dispatchEvent(new Event('wallet:updated'));
      window.dispatchEvent(new Event('notifications:updated'));
      toast({ title: data.booking.status === 'Requested' ? 'Request sent' : 'Booked!', description: `${service.name}, ${whenLabel(startsAt)}.` });
      onClose();
      router.push('/bookings');
    } catch (err) {
      toast({ title: 'Could not book', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto overflow-x-hidden">
        <DialogHeader className="min-w-0">
          <DialogTitle>Book {service.name}</DialogTitle>
          <DialogDescription>
            With {vendorName} · {durationLabel(service.durationMin)}{service.priceFrom ? ` · from ${naira(service.price)}, final price agreed with the vendor` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-4">
          {service.location === 'either' && (
            <div className="grid grid-cols-2 gap-2">
              {(['shop', 'home'] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPlace(p)} aria-pressed={place === p}
                  className={cn('flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm', place === p ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted')}>
                  {p === 'shop' ? <Store className="h-4 w-4" /> : <Home className="h-4 w-4" />}{p === 'shop' ? 'At the shop' : 'At my place'}
                </button>
              ))}
            </div>
          )}
          <SlotPicker serviceId={service.id} dates={dates} value={startsAt} onChange={setStartsAt} />
          {place === 'home' && (
            <div className="space-y-1">
              <Label htmlFor="bk-address">Where should they come?</Label>
              <Input id="bk-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos" />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="bk-note">Anything the vendor should know? (optional)</Label>
            <Textarea id="bk-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between"><span>{service.name}</span><span>{naira(service.price)}</span></div>
            {place === 'home' && !!service.callOutFee && <div className="flex justify-between"><span>Call-out fee</span><span>{naira(service.callOutFee)}</span></div>}
            <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Pay now</span><span>{naira(total)}</span></div>
            <p className="mt-2 text-xs text-muted-foreground">
              {instant ? 'Confirmed straight away.' : `${vendorName} confirms within 4 hours, or you're refunded.`} Free to cancel or move until 24 hours before; after that the vendor keeps 50%.
            </p>
          </div>
          {short !== null && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              Your wallet is {naira(short)} short.
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => window.dispatchEvent(new CustomEvent('wallet:open', { detail: { amount: short } }))}>Top up {naira(short)}</Button>
            </div>
          )}
          <Button className="w-full" size="lg" disabled={!!user && (!startsAt || busy || (place === 'home' && address.trim().length < 5))} onClick={submit}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!user ? 'Sign in to book' : startsAt ? `Pay ${naira(total)} and book ${whenLabel(startsAt)}` : 'Choose a time'}
          </Button>
          {place === 'shop' && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />At {vendorName}&apos;s shop (address on this page).</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

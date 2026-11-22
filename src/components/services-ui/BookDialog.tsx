'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Loader2, ShieldCheck, Store } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { dayLabel, durationLabel, naira, whenLabel } from '@/lib/booking-time';
import { getSavedAddress } from '@/lib/delivery-address';
import { cn } from '@/lib/utils';
import { clock12, type PublicService } from './parts';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';

const BOOK_RULES = { address: rules.streetAddress, note: rules.maxLength(500, 'the note') };

type Slot = { startsAt: number; label: string };

/**
 * Book one service: pick a day and a free time, where it happens, and pay from the wallet.
 * The money is held by Closebuy until the customer gives the provider their code at the end of the job.
 */
export function BookDialog({ provider, service, onClose }: { provider: { id: string; businessName: string; instantBooking: boolean }; service: PublicService; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [dates, setDates] = useState<string[] | null>(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [place, setPlace] = useState<'shop' | 'home'>(service.location === 'home' ? 'home' : 'shop');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const checks = useFieldChecks<'address' | 'note'>(BOOK_RULES);
  const [busy, setBusy] = useState(false);
  const [short, setShort] = useState<number | null>(null);
  const own = !!user && user.id === provider.id;
  const callOut = place === 'home' ? service.callOutFee ?? 0 : 0;
  const total = service.price + callOut;

  useEffect(() => {
    setAddress(getSavedAddress()?.address ?? '');
    fetch(`/api/services?serviceId=${service.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const list: string[] = d.dates ?? [];
        setDates(list);
        setDate(list[0] ?? '');
      })
      .catch(() => setDates([]));
  }, [service.id]);

  useEffect(() => {
    if (!date) return;
    let live = true;
    setSlots(null);
    setStartsAt(null);
    fetch(`/api/services/${service.id}/slots?date=${date}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => live && setSlots(d.slots ?? []))
      .catch(() => live && setSlots([]));
    return () => { live = false; };
  }, [date, service.id]);

  const submit = async () => {
    if (!user) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (!startsAt) return;
    if (!checks.validateAll({ address: place === 'home' ? address : '12 Not needed', note })) return;
    setBusy(true);
    setShort(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const chip = (selected: boolean) => cn('rounded-xl border text-sm transition-colors', selected ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-border hover:border-primary/50');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto overflow-x-hidden">
        <DialogHeader className="min-w-0">
          <DialogTitle className="svc-display text-xl">{service.name}</DialogTitle>
          <DialogDescription>{provider.businessName} · {durationLabel(service.durationMin)}</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-5">
          {dates === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading free days…</p>
          ) : dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No days are open for booking right now.</p>
          ) : (
            <>
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Day</p>
                <div className="svc-scroll flex max-w-full gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Day">
                  {dates.map((d) => (
                    <button key={d} type="button" role="option" aria-selected={d === date} onClick={() => setDate(d)} className={cn(chip(d === date), 'shrink-0 px-3 py-2')}>{dayLabel(d)}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Time</p>
                {slots === null ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Finding free times…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No free times that day. Try another day.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2" role="listbox" aria-label="Time">
                    {slots.map((s) => (
                      <button key={s.startsAt} type="button" role="option" aria-selected={startsAt === s.startsAt} onClick={() => setStartsAt(s.startsAt)} className={cn(chip(startsAt === s.startsAt), 'px-2 py-2 tabular-nums')}>{clock12(s.startsAt)}</button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {service.location === 'either' && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Where</p>
              <div className="grid grid-cols-2 gap-2">
                {(['shop', 'home'] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPlace(p)} aria-pressed={place === p} className={cn(chip(place === p), 'flex items-center justify-center gap-2 px-3 py-2.5')}>
                    {p === 'shop' ? <Store className="h-4 w-4" /> : <Home className="h-4 w-4" />}{p === 'shop' ? 'Their place' : `My place${service.callOutFee ? ` (+${naira(service.callOutFee)})` : ''}`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {place === 'home' && (
            <div className="space-y-1">
              <Label htmlFor="bk-address">Where should they come?</Label>
              <Input id="bk-address" {...checks.field('address', address, (v: string) => setAddress(v))} placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos" />
              <FieldError message={checks.error('address')} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="bk-note">Anything they should know? (optional)</Label>
            <Textarea id="bk-note" {...checks.field('note', note, (v: string) => setNote(v))}  rows={2} maxLength={500} />
            <FieldError message={checks.error('note')} />
          </div>

          <div className="rounded-xl border bg-card p-4 text-sm">
            <div className="flex justify-between"><span>{service.name}</span><span>{naira(service.price)}</span></div>
            {callOut > 0 && <div className="mt-1 flex justify-between text-muted-foreground"><span>Home visit</span><span>{naira(callOut)}</span></div>}
            <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Pay now, held by Closebuy</span><span className="text-primary">{naira(total)}</span></div>
            {service.priceFrom && <p className="mt-2 text-xs text-muted-foreground">This is a starting price. If the job costs more, you agree it with {provider.businessName} on the day.</p>}
            <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {provider.instantBooking ? 'Confirmed straight away.' : `${provider.businessName} confirms within 4 hours, or you're refunded.`} Free to cancel or move until 24 hours before.
            </p>
          </div>
          {short !== null && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
              Your wallet is {naira(short)} short.
              <button type="button" className="svc-accent-btn mt-2 w-full rounded-lg py-2 text-sm font-semibold" onClick={() => window.dispatchEvent(new CustomEvent('wallet:open', { detail: { amount: short } }))}>Top up {naira(short)}</button>
            </div>
          )}
          <button
            type="button"
            className="svc-accent-btn w-full rounded-xl py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            disabled={own || (!!user && (!startsAt || busy || (place === 'home' && address.trim().length < 5)))}
            onClick={submit}
          >
            {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            {own ? 'This is your business' : !user ? 'Sign in to book' : startsAt ? `Pay ${naira(total)} · ${whenLabel(startsAt)}` : 'Choose a time'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

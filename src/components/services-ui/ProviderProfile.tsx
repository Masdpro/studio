'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, CalendarCheck, Clock, Home, KeyRound, MapPin, ShieldCheck, Store, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { dayLabel, durationLabel, lagosDate, lagosMoment, naira } from '@/lib/booking-time';
import { categoryLabel, providerBySlug, where, type PreviewProvider, type PreviewService } from '@/lib/services-preview';
import { CATEGORY_ICON, PreviewNotice, ProviderAvatar, clock12, nextFree } from './parts';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const placeWord = { shop: 'At the studio', home: 'Comes to you', either: 'Studio or your place' };

export function ProviderProfile({ slug }: { slug: string }) {
  const p = providerBySlug(slug)!;
  const [now, setNow] = useState(() => Date.now());
  const [booking, setBooking] = useState<PreviewService | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  const next = nextFree(p, now);
  const Icon = CATEGORY_ICON[p.category];
  const todayDow = new Date(`${lagosDate(now)}T12:00:00Z`).getUTCDay();

  return (
    <>
      <PreviewNotice />
      <section className="relative border-b border-border/60">
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(70% 120% at 15% 0%, hsl(${p.hue} 55% 28% / 0.75), transparent 65%), radial-gradient(50% 80% at 100% 0%, hsl(220 20% 90% / 0.06), transparent 70%)` }} />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-6">
          <Link href="/services" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All services</Link>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <ProviderAvatar name={p.name} hue={p.hue} size={88} className="shadow-2xl shadow-black/50" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><Icon className="h-3 w-3" />{categoryLabel(p.category)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300"><BadgeCheck className="h-3 w-3" />Verified by Closebuy</span>
              </div>
              <h1 className="svc-display text-3xl font-semibold leading-tight sm:text-5xl">{p.name}</h1>
              <p className="mt-1 text-muted-foreground sm:text-lg">{p.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{p.area}, {p.city}</span>
                <span className="flex items-center gap-1.5">{where(p).startsWith('At') ? <Store className="h-4 w-4" /> : <Home className="h-4 w-4" />}{where(p)}</span>
                <span>Since {p.since}</span>
              </div>
            </div>
            <a href="#services" className="svc-accent-btn inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"><CalendarCheck className="h-4 w-4" />Book now</a>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <h2 className="svc-display mb-2 text-xl font-semibold">About</h2>
            <p className="text-muted-foreground">{p.about}</p>
          </section>
          <section id="services" className="scroll-mt-28">
            <h2 className="svc-display mb-4 text-xl font-semibold">Services</h2>
            <div className="space-y-3">
              {p.services.map((s) => (
                <div key={s.name} className="svc-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{durationLabel(s.durationMin)}</span>
                      <span className="flex items-center gap-1">{s.location === 'shop' ? <Store className="h-3 w-3" /> : <Home className="h-3 w-3" />}{placeWord[s.location]}</span>
                      {s.location !== 'shop' && !!s.callOutFee && <span>+{naira(s.callOutFee)} home visit</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="svc-display text-xl font-semibold text-primary">{s.priceFrom && <span className="mr-1 text-xs font-normal text-muted-foreground">from</span>}{naira(s.price)}</p>
                    <button onClick={() => setBooking(s)} className="svc-accent-btn rounded-xl px-5 py-2 text-sm font-semibold">Book</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Next free</p>
            <p className={cn('svc-display mt-1 text-2xl font-semibold', next?.today && 'text-emerald-400')}>{next ? next.label : 'Fully booked this week'}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              {p.instant ? <><Zap className="h-4 w-4 text-primary" />Bookings are confirmed instantly</> : <><Clock className="h-4 w-4" />Confirms within 4 hours, or you&apos;re refunded</>}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h3 className="mb-3 font-semibold">Opening hours</h3>
            <dl className="space-y-1.5 text-sm">
              {ORDER.map((d) => (
                <div key={d} className={cn('flex justify-between gap-4', d === todayDow ? 'text-foreground' : 'text-muted-foreground')}>
                  <dt className={cn(d === todayDow && 'font-semibold')}>{DAYS[d]}</dt>
                  <dd>{(p.hours[d] ?? []).length ? p.hours[d].map(([o, c]) => `${clock12(lagosMoment('2030-01-01', o))}–${clock12(lagosMoment('2030-01-01', c))}`).join(', ') : 'Closed'}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Booking protection</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>Your payment is held by Closebuy until the job is done.</li>
              <li className="flex gap-2"><KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />Release it with your 4-digit code when you&apos;re happy.</li>
              <li>Free to cancel or move up to 24 hours before.</li>
            </ul>
          </div>
        </aside>
      </div>
      {booking && <PreviewBookDialog p={p} s={booking} now={now} onClose={() => setBooking(null)} />}
    </>
  );
}

/** The booking step, with free times worked out from the provider's hours. Paying is switched off in the preview. */
export function PreviewBookDialog({ p, s, now, onClose }: { p: PreviewProvider; s: PreviewService; now: number; onClose: () => void }) {
  const dates = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 14; i++) {
      const date = lagosDate(now + i * 86400_000);
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
      // Only days with at least one time the service still fits into.
      const fits = (p.hours[dow] ?? []).some(([, c]) => lagosMoment(date, c) - s.durationMin * 60_000 >= Math.max(now + 3600_000, lagosMoment(date, '00:00')));
      if (fits) out.push(date);
    }
    return out;
  }, [p, s, now]);
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState<number | null>(null);
  const [place, setPlace] = useState<'shop' | 'home'>(s.location === 'home' ? 'home' : 'shop');
  const slots = useMemo(() => {
    if (!date) return [];
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    const out: number[] = [];
    for (const [o, c] of p.hours[dow] ?? []) {
      for (let t = lagosMoment(date, o); t + s.durationMin * 60_000 <= lagosMoment(date, c); t += 30 * 60_000) if (t >= now + 3600_000) out.push(t);
    }
    return out;
  }, [date, p, s, now]);
  const total = s.price + (place === 'home' ? s.callOutFee ?? 0 : 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto overflow-x-hidden rounded-2xl border-border bg-card">
        <DialogHeader className="min-w-0">
          <DialogTitle className="svc-display text-xl">{s.name}</DialogTitle>
          <DialogDescription>{p.name} · {durationLabel(s.durationMin)}</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-4">
          {s.location === 'either' && (
            <div className="grid grid-cols-2 gap-2">
              {(['shop', 'home'] as const).map((k) => (
                <button key={k} onClick={() => setPlace(k)} aria-pressed={place === k} className={cn('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm', place === k ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground')}>
                  {k === 'shop' ? <Store className="h-4 w-4" /> : <Home className="h-4 w-4" />}{k === 'shop' ? 'At the studio' : 'At my place'}
                </button>
              ))}
            </div>
          )}
          <div className="svc-scroll flex max-w-full gap-2 overflow-x-auto pb-1">
            {dates.map((d) => (
              <button key={d} onClick={() => { setDate(d); setTime(null); }} className={cn('shrink-0 rounded-xl border px-3 py-2 text-sm', d === date ? 'svc-accent-btn border-transparent font-semibold' : 'border-border text-muted-foreground hover:text-foreground')}>
                {d === lagosDate(now) ? 'Today' : dayLabel(d)}
              </button>
            ))}
          </div>
          {slots.length ? (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((t) => (
                <button key={t} onClick={() => setTime(t)} className={cn('rounded-xl border py-2 text-sm tabular-nums', time === t ? 'border-primary bg-primary/15 font-semibold text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{clock12(t)}</button>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No free times that day. Try another day.</p>}
          <div className="rounded-xl bg-muted/60 p-4 text-sm">
            <div className="flex justify-between"><span>{s.name}</span><span>{naira(s.price)}</span></div>
            {place === 'home' && !!s.callOutFee && <div className="flex justify-between text-muted-foreground"><span>Home visit</span><span>{naira(s.callOutFee)}</span></div>}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold"><span>Pay now, held by Closebuy</span><span className="text-primary">{naira(total)}</span></div>
          </div>
          <button disabled className="svc-accent-btn w-full cursor-not-allowed rounded-xl py-3 text-sm font-semibold opacity-60">
            {time ? `Book ${dayLabel(lagosDate(time))}, ${clock12(time)}` : 'Choose a time'}
          </button>
          <p className="text-center text-xs text-muted-foreground">Preview: booking opens when this provider goes live.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

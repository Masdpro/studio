'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, CalendarCheck, Clock, Home, Images, KeyRound, MapPin, ShieldCheck, Store, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { durationLabel, naira } from '@/lib/booking-time';
import { categoryLabel } from '@/lib/service-categories';
import { categoryIcon, coverStyle, hhmm12, nextFreeLabel, placeWord, ProviderAvatar, where, type PublicProvider, type PublicService } from './parts';
import { BookDialog } from './BookDialog';
import { PortfolioViewer } from './PortfolioViewer';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** A service business's public page: who they are, each service with its portfolio, and their hours. */
export function ProviderProfile({ p }: { p: PublicProvider }) {
  const [booking, setBooking] = useState<PublicService | null>(null);
  const [viewing, setViewing] = useState<PublicService | null>(null);
  const Icon = categoryIcon(p.category);
  const todayDow = new Date(Date.now() + 3600_000).getUTCDay();

  return (
    <>
      <section className="relative -mx-4 -mt-4 border-b border-border/60 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
        <div className="absolute inset-0" style={coverStyle(p.businessName, 0.75)} />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-6 md:px-6">
          <Link href="/services" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All services</Link>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <ProviderAvatar name={p.businessName} imageUrl={p.imageUrl} size={88} className="shadow-2xl shadow-black/50" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><Icon className="h-3 w-3" />{categoryLabel(p.category)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300"><BadgeCheck className="h-3 w-3" />Verified by Closebuy</span>
              </div>
              <h1 className="svc-display text-3xl font-semibold leading-tight sm:text-5xl">{p.businessName}</h1>
              {p.tagline && <p className="mt-1 text-muted-foreground sm:text-lg">{p.tagline}</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{p.area}, {p.city}</span>
                <span className="flex items-center gap-1.5">{where(p).startsWith('At their place of work') ? <Store className="h-4 w-4" /> : <Home className="h-4 w-4" />}{where(p)}</span>
                {p.since && <span>Since {p.since}</span>}
              </div>
            </div>
            <a href="#services" className="svc-accent-btn inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"><CalendarCheck className="h-4 w-4" />Book now</a>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 pt-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {p.about && (
            <section>
              <h2 className="svc-display mb-2 text-xl font-semibold">About</h2>
              <p className="whitespace-pre-line text-muted-foreground">{p.about}</p>
            </section>
          )}
          <section id="services" className="scroll-mt-28">
            <h2 className="svc-display mb-4 text-xl font-semibold">Services</h2>
            <div className="space-y-3">
              {p.services.map((s) => (
                <div key={s.id} className="svc-card flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
                  {s.cover && (
                    <button type="button" onClick={() => setViewing(s)} className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24" aria-label={`View portfolio for ${s.name}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.cover} alt="" className="h-full w-full object-cover" />
                      {s.portfolioCount > 1 && <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">+{s.portfolioCount - 1}</span>}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{durationLabel(s.durationMin)}</span>
                      <span className="flex items-center gap-1">{s.location === 'shop' ? <Store className="h-3 w-3" /> : <Home className="h-3 w-3" />}{placeWord[s.location]}</span>
                      {s.location !== 'shop' && !!s.callOutFee && <span>+{naira(s.callOutFee)} home visit</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <p className="svc-display text-xl font-semibold text-primary">{s.priceFrom && <span className="mr-1 text-xs font-normal text-muted-foreground">from</span>}{naira(s.price)}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(s)}
                        disabled={!s.portfolioCount}
                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
                        title={s.portfolioCount ? undefined : 'No photos yet'}
                      >
                        <Images className="h-4 w-4" />Portfolio{s.portfolioCount ? ` (${s.portfolioCount})` : ''}
                      </button>
                      <button type="button" onClick={() => setBooking(s)} className="svc-accent-btn rounded-xl px-5 py-2 text-sm font-semibold">Book</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Next free</p>
            <p className={cn('svc-display mt-1 text-2xl font-semibold', p.nextFree?.today && 'text-emerald-400')}>{p.nextFree ? nextFreeLabel(p.nextFree) : 'Fully booked this week'}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              {p.instantBooking ? <><Zap className="h-4 w-4 text-primary" />Bookings are confirmed instantly</> : <><Clock className="h-4 w-4" />Confirms within 4 hours, or you&apos;re refunded</>}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h3 className="mb-3 font-semibold">Opening hours</h3>
            <dl className="space-y-1.5 text-sm">
              {ORDER.map((d) => {
                const list = p.weeklyHours[String(d)] ?? [];
                return (
                  <div key={d} className={cn('flex justify-between gap-4', d === todayDow ? 'text-foreground' : 'text-muted-foreground')}>
                    <dt className={cn(d === todayDow && 'font-semibold')}>{DAYS[d]}</dt>
                    <dd className="text-right">{list.length ? list.map(([o, c]) => `${hhmm12(o)}–${hhmm12(c)}`).join(', ') : 'Closed'}</dd>
                  </div>
                );
              })}
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

      {booking && <BookDialog provider={p} service={booking} onClose={() => setBooking(null)} />}
      {viewing && <PortfolioViewer serviceId={viewing.id} onClose={() => setViewing(null)} onBook={() => { setBooking(viewing); setViewing(null); }} />}
    </>
  );
}

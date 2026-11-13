'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, KeyRound, Search, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PREVIEW_PROVIDERS, SERVICE_CATEGORIES, categoryLabel, type ServiceCategoryId } from '@/lib/services-preview';
import { CATEGORY_ICON, ProviderCard, PreviewNotice, nextFree } from './parts';

export function ServicesHome() {
  const [now, setNow] = useState(() => Date.now());
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ServiceCategoryId | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return PREVIEW_PROVIDERS.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (!words.length) return true;
      const hay = [p.name, p.tagline, p.area, categoryLabel(p.category), ...p.services.map((s) => s.name)].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, cat]);
  const today = PREVIEW_PROVIDERS.filter((p) => nextFree(p, now)?.today);
  const filtering = !!q || !!cat;

  return (
    <>
      <PreviewNotice />
      <section className="svc-hero-bg border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:pb-14 sm:pt-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />Verified professionals · Pay safely through Closebuy
          </p>
          <h1 className="svc-display max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Book trusted <span className="svc-gold-text">professionals</span> near you.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Hair, repairs, cleaning, tailoring, private chefs and more. Pick a time that suits you; your money is held until the job is done.
          </p>
          <div className="mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border border-border bg-card/80 p-2 shadow-2xl shadow-black/30 focus-within:border-primary/60">
            <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try “braids”, “screen repair” or “Lekki”"
              aria-label="Search services"
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
            />
            {q && <button onClick={() => setQ('')} aria-label="Clear search" className="rounded-full p-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
            <a href="#providers" className="svc-gold-btn hidden h-11 items-center rounded-xl px-5 text-sm font-semibold sm:flex">Search</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="svc-display text-2xl font-semibold">Browse by category</h2>
          {cat && <button onClick={() => setCat(null)} className="text-sm text-primary hover:underline">Show all</button>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SERVICE_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c.id];
            const on = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(on ? null : c.id)}
                aria-pressed={on}
                className={cn('svc-card flex items-start gap-3 rounded-2xl p-4 text-left', on && 'border-primary/70 bg-primary/10')}
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', on ? 'svc-gold-btn' : 'bg-primary/10 text-primary')}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{c.label}</span>
                  <span className="block text-xs text-muted-foreground">{c.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {!filtering && today.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <h2 className="svc-display mb-1 text-2xl font-semibold">Available today</h2>
          <p className="mb-4 text-sm text-muted-foreground">Free slots in the next few hours.</p>
          <div className="svc-scroll -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
            {today.map((p) => <div key={p.slug} className="w-72 shrink-0 snap-start"><ProviderCard p={p} now={now} /></div>)}
          </div>
        </section>
      )}

      <section id="providers" className="mx-auto max-w-6xl scroll-mt-28 px-4 pt-12">
        <h2 className="svc-display mb-4 text-2xl font-semibold">
          {cat ? categoryLabel(cat) : q ? `Results for “${q}”` : 'All professionals'}
          <span className="ml-2 text-base font-normal text-muted-foreground">{results.length}</span>
        </h2>
        {results.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => <ProviderCard key={p.slug} p={p} now={now} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No one matches that yet. Try another word or category.
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="svc-display mb-6 text-2xl font-semibold">How booking works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: CalendarCheck, title: 'Pick a time', text: 'See real free slots and book in seconds, at their place or yours.' },
            { icon: ShieldCheck, title: 'Pay safely', text: 'Your money is held by Closebuy, not the provider, until the job is done.' },
            { icon: KeyRound, title: 'Release with your code', text: 'Happy with the job? Give them your 4-digit code and they’re paid.' },
          ].map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="svc-display text-3xl font-semibold text-primary/40">0{i + 1}</span>
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Free to cancel or move up to 24 hours before. After that, the provider keeps 50%.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="svc-hero-bg relative overflow-hidden rounded-3xl border border-primary/25 p-8 sm:p-12">
          <h2 className="svc-display max-w-xl text-3xl font-semibold sm:text-4xl">Offer your services on <span className="svc-gold-text">Closebuy</span>.</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">Set your hours, take bookings, and get paid the moment a job is done. Already sell products? Add a service business to the same login.</p>
          <Link href="/auth/register/vendor" className="svc-gold-btn mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold">
            Register a service business <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

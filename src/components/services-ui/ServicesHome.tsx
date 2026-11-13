'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CalendarCheck, CalendarClock, ChevronDown, Clock, MapPin, Search, Sparkles, Users, UserRound } from 'lucide-react';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FitChips } from '@/components/home/FitChips';
import { DealsScroller } from '@/components/home/DealsScroller';
import { cn } from '@/lib/utils';
import { durationLabel, naira } from '@/lib/booking-time';
import { PREVIEW_PROVIDERS, SERVICE_CATEGORIES, categoryLabel, type PreviewProvider, type PreviewService } from '@/lib/services-preview';
import { CATEGORY_ICON, PreviewNotice, ProviderCard, nextFree } from './parts';
import { PreviewBookDialog } from './ProviderProfile';
import { parseServicesView } from './ServicesViewTabs';

type Listing = { p: PreviewProvider; s: PreviewService };
const ALL = 'All';

/**
 * The services home: laid out exactly like the shop home (filters, a "today" row, then the grid),
 * in the services colours. Each card is a service you can book, the way a shop card is an item you can buy.
 */
export function ServicesHome() {
  const view = parseServicesView(useSearchParams().get('view'));
  const [now, setNow] = useState(() => Date.now());
  const [area, setArea] = useState(ALL);
  const [provider, setProvider] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');
  const [todayOpen, setTodayOpen] = useState(true);
  const [booking, setBooking] = useState<Listing | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  const areas = useMemo(() => [ALL, ...Array.from(new Set(PREVIEW_PROVIDERS.map((p) => p.area))).sort()], []);
  const categories = useMemo(() => [ALL, ...SERVICE_CATEGORIES.map((c) => c.label)], []);

  const providers = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return PREVIEW_PROVIDERS.filter((p) => {
      if (area !== ALL && p.area !== area) return false;
      if (provider !== ALL && p.slug !== provider) return false;
      if (category !== ALL && categoryLabel(p.category) !== category) return false;
      if (!words.length) return true;
      const hay = [p.name, p.tagline, p.area, categoryLabel(p.category), ...p.services.map((s) => s.name)].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [area, provider, category, search]);

  const listings: Listing[] = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return providers.flatMap((p) => p.services
      .filter((s) => !words.length || words.every((w) => [s.name, s.description, p.name, p.tagline, p.area, categoryLabel(p.category)].join(' ').toLowerCase().includes(w)))
      .map((s) => ({ p, s })));
  }, [providers, search]);

  // The twin of the shop's Awoof row: services from professionals who still have time today.
  const today = useMemo(() => listings.filter((l) => nextFree(l.p, now)?.today), [listings, now]);
  const providerOptions = useMemo(() => PREVIEW_PROVIDERS.filter((p) => area === ALL || p.area === area), [area]);

  return (
    <div className="flex h-full flex-col">
      <div className="container mx-auto flex-1 px-4 pb-8 pt-2 md:px-6 md:pt-3">
        <div className="mb-4 overflow-hidden rounded-lg border border-primary/20 [&>div]:border-0"><PreviewNotice /></div>

        {/* Shared filter block, as on the shop */}
        <div className="mb-8 space-y-4 rounded-xl border bg-card p-4 shadow-md shadow-black/30 md:p-5">
          <div className="grid items-start gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <h3 className="mb-2 flex items-center text-sm font-semibold text-foreground"><MapPin className="mr-2 h-4 w-4 text-primary" />Filter by City/Area</h3>
              <Select value={area} onValueChange={(v) => { setArea(v); setProvider(ALL); }}>
                <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {areas.map((a) => <SelectItem key={a} value={a}>{a === ALL ? 'All Locations' : `${a}, Lagos`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <h3 className="mb-2 flex items-center text-sm font-semibold text-foreground"><UserRound className="mr-2 h-4 w-4 text-primary" />Filter by Professional</h3>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Professionals</SelectItem>
                  {providerOptions.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="mb-2 hidden text-sm md:block">&nbsp;</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant={search ? 'default' : 'outline'} aria-label="Search services and professionals" className="relative h-10 w-full rounded-lg md:w-10 md:px-0">
                    <Search className="h-4 w-4" />
                    <span className="ml-2 md:sr-only">Search</span>
                    {search && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" sideOffset={8} className="w-[min(20rem,calc(100vw-2rem))] p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input autoFocus type="search" placeholder="Braids, screen repair, Lekki..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-lg pl-9" />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <FitChips items={categories} selected={category} onSelect={setCategory} />
        </div>

        {view === 'services' ? (
          <div className="space-y-12">
            {today.length > 0 && !search && (
              <section className="relative">
                <div className={cn('flex items-center justify-between', todayOpen && 'mb-4')}>
                  <h2 className="text-2xl font-bold">
                    <button type="button" onClick={() => setTodayOpen((o) => !o)} aria-expanded={todayOpen} className="flex items-center gap-2 text-left">
                      <CalendarClock className="h-6 w-6 text-primary" />
                      Available Today
                      <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', !todayOpen && '-rotate-90')} aria-hidden />
                    </button>
                  </h2>
                  <div className="flex items-center gap-2">
                    {!todayOpen && <span className="text-xs text-muted-foreground">{today.length} open</span>}
                    <Badge variant="outline" className="border-primary text-primary">Book now</Badge>
                  </div>
                </div>
                {todayOpen && (
                  <DealsScroller>
                    {today.map((l) => (
                      <div key={`${l.p.slug}-${l.s.name}`} className="w-72 shrink-0 snap-start">
                        <ServiceCard l={l} now={now} onBook={setBooking} compact />
                      </div>
                    ))}
                  </DealsScroller>
                )}
              </section>
            )}

            {listings.length > 0 ? (
              <section>
                <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold"><Sparkles className="h-6 w-6 text-primary" />Explore Local Services</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {listings.map((l) => <ServiceCard key={`${l.p.slug}-${l.s.name}`} l={l} now={now} onBook={setBooking} />)}
                </div>
              </section>
            ) : <Empty what="services" />}
          </div>
        ) : providers.length > 0 ? (
          <section>
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold"><Users className="h-6 w-6 text-primary" />Local Professionals <span className="text-base font-normal text-muted-foreground">({providers.length})</span></h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((p) => <ProviderCard key={p.slug} p={p} now={now} />)}
            </div>
          </section>
        ) : <Empty what="professionals" />}
      </div>

      {booking && <PreviewBookDialog p={booking.p} s={booking.s} now={now} onClose={() => setBooking(null)} />}
    </div>
  );
}

function Empty({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Search className="mb-4 h-14 w-14 text-muted-foreground/40" />
      <p className="mb-2 text-xl font-semibold">No {what} found</p>
      <p className="mx-auto max-w-xs text-muted-foreground">Try adjusting your search or filters to see more results.</p>
    </div>
  );
}

/** The services twin of the shop's product card: a cover with who and where, then the service, price and a Book button. */
function ServiceCard({ l: { p, s }, now, onBook, compact }: { l: Listing; now: number; onBook: (l: Listing) => void; compact?: boolean }) {
  const Icon = CATEGORY_ICON[p.category];
  const next = nextFree(p, now);
  return (
    <Card className="flex w-full flex-col overflow-hidden rounded-lg shadow-lg shadow-black/40 transition-colors hover:border-primary/50">
      <div
        className={cn('relative w-full overflow-hidden', compact ? 'h-36' : 'h-48')}
        style={{ backgroundImage: `radial-gradient(110% 120% at 0% 0%, hsl(${p.hue} 55% 34% / 0.95), transparent 65%), radial-gradient(70% 90% at 100% 0%, hsl(39 64% 63% / 0.14), transparent 70%), linear-gradient(135deg, hsl(228 22% 13%), hsl(228 26% 8%))` }}
      >
        <Icon aria-hidden className="absolute right-4 top-4 h-16 w-16 text-white/10" strokeWidth={1.25} />
        {next?.today && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white shadow">Free today</span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2.5 pt-10 text-white">
          <Link href={`/services/p/${p.slug}`} className="flex max-w-full items-center gap-1.5 text-sm font-semibold drop-shadow hover:underline">
            <UserRound className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{p.name}</span>
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/90 drop-shadow"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{p.area}, {p.city}</span></p>
        </div>
      </div>
      <CardContent className="flex-grow p-4 pb-2">
        <CardTitle title={s.name} className="mb-2 truncate text-xl font-semibold">{s.name}</CardTitle>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold text-primary">{s.priceFrom && <span className="mr-1 text-xs font-normal text-muted-foreground">from</span>}{naira(s.price)}</p>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{durationLabel(s.durationMin)}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="svc-gold-btn w-full border-0" onClick={() => onBook({ p, s })}>
          <CalendarCheck className="mr-2 h-4 w-4" />Book
        </Button>
      </CardFooter>
    </Card>
  );
}

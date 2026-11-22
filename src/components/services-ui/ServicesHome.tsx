'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarCheck, CalendarClock, ChevronDown, Clock, Images, MapPin, Search, Sparkles, Users, UserRound } from 'lucide-react';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchWithFilters, FilterField, ChipChoice } from '@/components/home/SearchWithFilters';
import { FitChips } from '@/components/home/FitChips';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DealsScroller } from '@/components/home/DealsScroller';
import { cn } from '@/lib/utils';
import { durationLabel, naira } from '@/lib/booking-time';
import { SERVICE_CATEGORIES, categoryLabel } from '@/lib/service-categories';
import { categoryIcon, coverStyle, ProviderCard, type PublicProvider, type PublicService } from './parts';
import { BookDialog } from './BookDialog';
import { PortfolioViewer } from './PortfolioViewer';
import { parseServicesView, type ServicesView } from './ServicesViewTabs';

type Listing = { p: PublicProvider; s: PublicService };
const ALL = 'All';
const key = (l: Listing) => l.s.id;

/**
 * The services home: laid out like the shop home (filters, a "today" row, then the grid), in the
 * services colours. Each card is a service you can book, the way a shop card is an item you can buy.
 */
export function ServicesHome({ providers: all }: { providers: PublicProvider[] }) {
  const view = parseServicesView(useSearchParams().get('view'));
  const router = useRouter();
  // Services / Professionals is chosen in the filter pop-up and kept in the URL (?view=pros).
  const setView = (v: ServicesView) => router.replace(v === 'pros' ? '/services?view=pros' : '/services', { scroll: false });
  const [area, setArea] = useState(ALL);
  const [provider, setProvider] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');
  const [todayOpen, setTodayOpen] = useState(true);
  const [booking, setBooking] = useState<Listing | null>(null);
  const [viewing, setViewing] = useState<Listing | null>(null);

  const areas = useMemo(() => [ALL, ...Array.from(new Set(all.map((p) => p.area))).sort()], [all]);
  // Only the kinds of service someone actually offers.
  const categories = useMemo(() => [ALL, ...SERVICE_CATEGORIES.filter((c) => all.some((p) => p.category === c.id)).map((c) => c.label)], [all]);
  const words = useMemo(() => search.toLowerCase().split(/\s+/).filter(Boolean), [search]);

  const providers = useMemo(() => all.filter((p) => {
    if (area !== ALL && p.area !== area) return false;
    if (provider !== ALL && p.slug !== provider) return false;
    if (category !== ALL && categoryLabel(p.category) !== category) return false;
    if (!words.length) return true;
    const hay = [p.businessName, p.tagline, p.area, categoryLabel(p.category), ...p.services.map((s) => s.name)].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  }), [all, area, provider, category, words]);

  const listings: Listing[] = useMemo(() => providers.flatMap((p) => p.services
    .filter((s) => !words.length || words.every((w) => [s.name, s.description, p.businessName, p.tagline, p.area, categoryLabel(p.category)].join(' ').toLowerCase().includes(w)))
    .map((s) => ({ p, s }))), [providers, words]);

  // The twin of the shop's Awoof row: services from professionals who still have time today.
  const today = useMemo(() => listings.filter((l) => l.p.nextFree?.today), [listings]);
  const providerOptions = useMemo(() => all.filter((p) => area === ALL || p.area === area), [all, area]);

  if (all.length === 0) {
    return (
      <div className="container mx-auto max-w-xl py-20 text-center">
        <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary/60" />
        <h1 className="mb-2 text-2xl font-bold">Services are coming to your area</h1>
        <p className="mb-6 text-muted-foreground">No professionals are taking bookings yet. Are you one? List your services and be the first customers find.</p>
        <Button asChild><Link href="/auth/register/provider">Offer your services</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container mx-auto flex-1 px-4 pb-8 pt-2 md:px-6 md:pt-3">
        {/* Computers: the full filter card, as on the shop. Phones and small tablets use the search box with a filter pop-up below. */}
        <div className="mb-8 hidden space-y-4 rounded-xl border bg-card p-4 shadow-md shadow-black/30 md:block md:p-5">
          <div className="grid items-start gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <h3 className="mb-2 flex items-center text-sm font-semibold text-foreground"><MapPin className="mr-2 h-4 w-4 text-primary" />Filter by City/Area</h3>
              <Select value={area} onValueChange={(v) => { setArea(v); setProvider(ALL); }}>
                <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {areas.map((a) => <SelectItem key={a} value={a}>{a === ALL ? 'All Locations' : a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <h3 className="mb-2 flex items-center text-sm font-semibold text-foreground"><UserRound className="mr-2 h-4 w-4 text-primary" />Filter by Professional</h3>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Professionals</SelectItem>
                  {providerOptions.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.businessName}</SelectItem>)}
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
          {categories.length > 2 && <FitChips items={categories} selected={category} onSelect={setCategory} />}
        </div>

        {/* Phones and small tablets: one search box; the filter button inside it opens the other filters in a pop-up. */}
        <SearchWithFilters
          className="md:hidden"
          value={search}
          onChange={setSearch}
          label="Search services and professionals"
          placeholder="Search services…"
          activeCount={(view === 'pros' ? 1 : 0) + (area !== ALL ? 1 : 0) + (provider !== ALL ? 1 : 0) + (category !== ALL ? 1 : 0)}
          onClear={() => { setArea(ALL); setProvider(ALL); setCategory(ALL); if (view === 'pros') setView('services'); }}
          resultLabel={view === 'services' ? `Show ${listings.length} service${listings.length === 1 ? '' : 's'}` : `Show ${providers.length} professional${providers.length === 1 ? '' : 's'}`}
        >
          <FilterField icon={<Users className="h-4 w-4 text-primary" />} title="Show">
            <ChipChoice items={['Services', 'Professionals']} selected={view === 'pros' ? 'Professionals' : 'Services'} onSelect={(v) => setView(v === 'Professionals' ? 'pros' : 'services')} />
          </FilterField>
          <FilterField icon={<MapPin className="h-4 w-4 text-primary" />} title="City or area">
            <Select value={area} onValueChange={(v) => { setArea(v); setProvider(ALL); }}>
              <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {areas.map((a) => <SelectItem key={a} value={a}>{a === ALL ? 'All Locations' : a}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField icon={<UserRound className="h-4 w-4 text-primary" />} title="Professional">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-10 w-full rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Professionals</SelectItem>
                {providerOptions.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.businessName}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          {categories.length > 2 && (
            <FilterField icon={<Sparkles className="h-4 w-4 text-primary" />} title="Category">
              <ChipChoice items={categories} selected={category} onSelect={setCategory} />
            </FilterField>
          )}
        </SearchWithFilters>

        {view === 'services' ? (
          <div className="space-y-12">
            {today.length > 0 && !search && (
              <section className="relative">
                <div className={cn('flex items-center justify-between gap-2', todayOpen && 'mb-4')}>
                  <h2 className="whitespace-nowrap text-xl font-bold sm:text-2xl">
                    <button type="button" onClick={() => setTodayOpen((o) => !o)} aria-expanded={todayOpen} className="flex items-center gap-2 text-left">
                      <CalendarClock className="h-6 w-6 text-primary" />
                      Available Today
                      <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', !todayOpen && '-rotate-90')} aria-hidden />
                    </button>
                  </h2>
                  <div className="flex items-center gap-2">
                    {!todayOpen && <span className="text-xs text-muted-foreground">{today.length} open</span>}
                    <Badge variant="outline" className="whitespace-nowrap border-primary text-primary">Book now</Badge>
                  </div>
                </div>
                {todayOpen && (
                  <DealsScroller>
                    {today.map((l) => (
                      <div key={key(l)} className="w-72 shrink-0 snap-start">
                        <ServiceCard l={l} onBook={setBooking} onPortfolio={setViewing} compact />
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
                  {listings.map((l) => <ServiceCard key={key(l)} l={l} onBook={setBooking} onPortfolio={setViewing} />)}
                </div>
              </section>
            ) : <Empty what="services" />}
          </div>
        ) : providers.length > 0 ? (
          <section>
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold"><Users className="h-6 w-6 text-primary" />Local Professionals <span className="text-base font-normal text-muted-foreground">({providers.length})</span></h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((p) => <ProviderCard key={p.slug} p={p} />)}
            </div>
          </section>
        ) : <Empty what="professionals" />}
      </div>

      {booking && <BookDialog provider={booking.p} service={booking.s} onClose={() => setBooking(null)} />}
      {viewing && <PortfolioViewer serviceId={viewing.s.id} onClose={() => setViewing(null)} onBook={() => { setBooking(viewing); setViewing(null); }} />}
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

/** The services twin of the shop's product card: a cover with who and where, then the service, price, portfolio and a Book button. */
function ServiceCard({ l, onBook, onPortfolio, compact }: { l: Listing; onBook: (l: Listing) => void; onPortfolio: (l: Listing) => void; compact?: boolean }) {
  const { p, s } = l;
  const Icon = categoryIcon(p.category);
  return (
    <Card className="flex w-full flex-col overflow-hidden rounded-lg shadow-lg shadow-black/40 transition-colors hover:border-primary/50">
      <div className={cn('relative w-full overflow-hidden', compact ? 'h-36' : 'h-48')} style={s.cover ? undefined : coverStyle(p.businessName)}>
        {s.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.cover} alt={`${s.name} by ${p.businessName}`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Icon aria-hidden className="absolute right-4 top-4 h-16 w-16 text-white/10" strokeWidth={1.25} />
        )}
        {p.nextFree?.today && <span className="absolute left-2 top-2 z-10 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white shadow">Free today</span>}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2.5 pt-10 text-white">
          <Link href={`/services/p/${p.slug}`} className="flex max-w-full items-center gap-1.5 text-sm font-semibold drop-shadow hover:underline">
            <UserRound className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{p.businessName}</span>
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
      <CardFooter className="flex flex-col gap-2 p-4 pt-0">
        <Button variant="outline" className="w-full" onClick={() => onPortfolio(l)} disabled={s.portfolioCount === 0}>
          <Images className="mr-2 h-4 w-4" />{s.portfolioCount ? <>View portfolio <span className="ml-1 text-muted-foreground">({s.portfolioCount})</span></> : 'No portfolio yet'}
        </Button>
        <Button className="svc-accent-btn w-full border-0" onClick={() => onBook(l)}>
          <CalendarCheck className="mr-2 h-4 w-4" />Book
        </Button>
      </CardFooter>
    </Card>
  );
}

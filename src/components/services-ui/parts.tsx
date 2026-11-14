'use client';

import Link from 'next/link';
import { Camera, ChefHat, Clock, Dumbbell, GraduationCap, Home, MapPin, Scissors, Shirt, Smartphone, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lagosClock, naira } from '@/lib/booking-time';
import { categoryLabel, hueFor, initials } from '@/lib/service-categories';
import type { PublicProvider, PublicService } from '@/lib/services/providers';

export type { PublicProvider, PublicService };

export const CATEGORY_ICON: Record<string, typeof Scissors> = {
  beauty: Scissors, repairs: Smartphone, home: Home, tailoring: Shirt, events: ChefHat, fitness: Dumbbell, lessons: GraduationCap, photo: Camera, other: Sparkles,
};
export const categoryIcon = (id: string) => CATEGORY_ICON[id] ?? Sparkles;

/** 9:30 am style, from a timestamp (Lagos time). */
export function clock12(ms: number): string {
  const [h, m] = lagosClock(ms).split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** "09:00" -> "9:00 am" */
export function hhmm12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export const fromPrice = (p: PublicProvider) => Math.min(...p.services.map((s) => s.price));

export function where(p: Pick<PublicProvider, 'services'>): string {
  const kinds = new Set(p.services.map((s) => s.location));
  if (kinds.has('either') || (kinds.has('home') && kinds.has('shop'))) return 'At their place or yours';
  return kinds.has('home') ? 'Comes to you' : 'At their place of work';
}

export const placeWord = { shop: 'At their place of work', home: 'Comes to you', either: 'Their place or yours' } as const;

/** The business's photo, or its initials on a colour picked from its name. */
export function ProviderAvatar({ name, imageUrl, size = 48, className }: { name: string; imageUrl?: string | null; size?: number; className?: string }) {
  const hue = hueFor(name);
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" width={size} height={size} className={cn('shrink-0 rounded-2xl object-cover ring-1 ring-white/10', className)} style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-2xl font-semibold text-white ring-1 ring-white/10', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, backgroundImage: `linear-gradient(140deg, hsl(${hue} 55% 46%), hsl(${(hue + 40) % 360} 50% 28%))` }}
    >
      {initials(name)}
    </span>
  );
}

/** Background for a business's covers: its own colour, fading into the dark. */
export const coverStyle = (name: string, strength = 0.9) => {
  const hue = hueFor(name);
  return { backgroundImage: `radial-gradient(110% 120% at 0% 0%, hsl(${hue} 55% 32% / ${strength}), transparent 65%), radial-gradient(70% 90% at 100% 0%, hsl(220 20% 90% / 0.06), transparent 70%), linear-gradient(135deg, hsl(228 22% 13%), hsl(228 26% 8%))` };
};

export function ProviderCard({ p }: { p: PublicProvider }) {
  const Icon = categoryIcon(p.category);
  return (
    <Link href={`/services/p/${p.slug}`} className="svc-card group block overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="relative h-20" style={coverStyle(p.businessName)}>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur">
          <Icon className="h-3 w-3" />{categoryLabel(p.category)}
        </span>
      </div>
      <div className="relative -mt-7 space-y-3 px-4 pb-4">
        <ProviderAvatar name={p.businessName} imageUrl={p.imageUrl} size={52} className="shadow-lg shadow-black/40" />
        <div>
          <h3 className="svc-display text-lg font-semibold leading-tight">{p.businessName}</h3>
          {p.tagline && <p className="text-sm text-muted-foreground">{p.tagline}</p>}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.area}</span>
          <span>{where(p)}</span>
        </div>
        <div className="flex items-end justify-between border-t border-border/70 pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">From</p>
            <p className="font-semibold text-primary">{naira(fromPrice(p))}</p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              {p.instantBooking ? <Zap className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3" />}{p.instantBooking ? 'Instant' : 'Next free'}
            </p>
            <p className={cn('text-sm font-medium', p.nextFree?.today && 'text-emerald-400')}>{p.nextFree ? nextFreeLabel(p.nextFree) : 'Fully booked'}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** "Today, 2:30 pm" / "Tomorrow, 9:00 am" / "Sat 15 Nov, 9:00 am" */
export function nextFreeLabel(n: NonNullable<PublicProvider['nextFree']>, now = Date.now()): string {
  const day = (ms: number) => new Date(ms + 3600_000).toISOString().slice(0, 10);
  const d = day(n.at);
  const word = d === day(now) ? 'Today' : d === day(now + 86400_000) ? 'Tomorrow' : new Date(n.at + 3600_000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${word}, ${clock12(n.at)}`;
}

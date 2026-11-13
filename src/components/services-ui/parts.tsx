'use client';

import Link from 'next/link';
import { Camera, ChefHat, Clock, Dumbbell, GraduationCap, Home, MapPin, Scissors, Shirt, Smartphone, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lagosClock, lagosDate, lagosMoment, dayLabel, naira } from '@/lib/booking-time';
import { categoryLabel, fromPrice, initials, where, type PreviewProvider, type ServiceCategoryId } from '@/lib/services-preview';

export const CATEGORY_ICON: Record<ServiceCategoryId, typeof Scissors> = {
  beauty: Scissors, repairs: Smartphone, home: Home, tailoring: Shirt, events: ChefHat, fitness: Dumbbell, lessons: GraduationCap, photo: Camera,
};

export function ProviderAvatar({ name, hue, size = 48, className }: { name: string; hue: number; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('svc-display inline-flex shrink-0 items-center justify-center rounded-2xl font-semibold text-white ring-1 ring-white/10', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, backgroundImage: `linear-gradient(140deg, hsl(${hue} 55% 46%), hsl(${(hue + 40) % 360} 50% 28%))` }}
    >
      {initials(name)}
    </span>
  );
}

const DAY = 86400_000;
/** The provider's next open half-hour, at least an hour from now (Lagos time). */
export function nextFree(p: PreviewProvider, now = Date.now()): { at: number; label: string; today: boolean } | null {
  const earliest = now + 3600_000;
  for (let i = 0; i < 8; i++) {
    const date = lagosDate(now + i * DAY);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    for (const [o, c] of p.hours[dow] ?? []) {
      for (let t = lagosMoment(date, o); t + 30 * 60_000 <= lagosMoment(date, c); t += 30 * 60_000) {
        if (t >= earliest) {
          const today = date === lagosDate(now);
          const tomorrow = date === lagosDate(now + DAY);
          return { at: t, today, label: `${today ? 'Today' : tomorrow ? 'Tomorrow' : dayLabel(date)}, ${clock12(t)}` };
        }
      }
    }
  }
  return null;
}

export function clock12(ms: number): string {
  const [h, m] = lagosClock(ms).split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export function ProviderCard({ p, now }: { p: PreviewProvider; now: number }) {
  const next = nextFree(p, now);
  const Icon = CATEGORY_ICON[p.category];
  return (
    <Link href={`/services/p/${p.slug}`} className="svc-card group block overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="relative h-20" style={{ backgroundImage: `radial-gradient(120% 140% at 0% 0%, hsl(${p.hue} 55% 30% / 0.9), transparent 60%), linear-gradient(135deg, hsl(228 22% 12%), hsl(228 26% 8%))` }}>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur">
          <Icon className="h-3 w-3" />{categoryLabel(p.category)}
        </span>
      </div>
      <div className="relative -mt-7 space-y-3 px-4 pb-4">
        <ProviderAvatar name={p.name} hue={p.hue} size={52} className="shadow-lg shadow-black/40" />
        <div>
          <h3 className="svc-display text-lg font-semibold leading-tight">{p.name}</h3>
          <p className="text-sm text-muted-foreground">{p.tagline}</p>
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
              {p.instant ? <Zap className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3" />}{p.instant ? 'Instant' : 'Next free'}
            </p>
            <p className={cn('text-sm font-medium', next?.today && 'text-emerald-400')}>{next ? next.label : 'Fully booked'}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PreviewNotice() {
  return (
    <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-xs text-primary">
      Design preview: these providers are samples. Booking opens when real service businesses join.
    </div>
  );
}

'use client';

import { use, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, addMinutes } from 'date-fns';
import { ArrowLeft, Bike, Loader2, Phone, Share2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OrderTracking } from '@/lib/services/order-tracking';
import { cn } from '@/lib/utils';

const TrackingMap = dynamic(() => import('@/components/orders/TrackingMap').then((m) => m.TrackingMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-muted/40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
});

const POLL_MS = 10_000;

/** Full-screen live tracking for one order, app-style: progress, ETA, the rider, and a map. */
export default function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [t, setT] = useState<OrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not load tracking.');
      setT(data.tracking);
      setCheckedAt(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tracking.');
    }
  }, [orderId]);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const done = t?.status === 'Delivered' || t?.status === 'Cancelled';
  const share = async () => {
    const text = t?.etaMinutes ? `My Closebuy order should arrive around ${format(addMinutes(checkedAt, t.etaMinutes), 'h:mm a')}.` : 'Tracking my Closebuy order.';
    try {
      if (navigator.share) await navigator.share({ title: 'Closebuy order', text });
      else await navigator.clipboard.writeText(text);
    } catch { /* closed the share sheet */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button type="button" aria-label="Back" onClick={() => (history.length > 1 ? router.back() : router.push('/orders'))} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/contact" className="rounded-full bg-primary/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-primary">Need help?</Link>
            <button type="button" aria-label="Share" onClick={share} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Greeting, progress and ETA */}
        <div className="px-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">Hi{t?.firstName ? ` ${t.firstName}` : ''},</h1>
              <p className="mt-0.5 text-[15px] text-foreground/80">{t?.headline ?? 'Loading your order…'}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex gap-1.5" aria-label={t ? `Step ${t.step} of ${t.total}` : undefined}>
            {Array.from({ length: t?.total ?? 6 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  t && i < t.step ? (i === t.step - 1 && !done ? 'animate-pulse bg-primary' : 'bg-primary') : 'bg-muted',
                )}
              />
            ))}
          </div>
          <p className="mt-3 text-sm">
            {t?.etaMinutes ? (
              <><span className="font-bold">{format(addMinutes(checkedAt, t.etaMinutes), 'h:mm a')}</span> · Estimated arrival (about {t.etaMinutes} min)</>
            ) : t?.status === 'Delivered' ? (
              <span className="font-semibold">Delivered. Enjoy!</span>
            ) : (
              <span className="text-muted-foreground">Updated {format(checkedAt, 'h:mm a')}</span>
            )}
          </p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        {/* Rider card */}
        {t?.rider && !done && (
          <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Bike className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{t.rider.name}</p>
              <p className="text-xs text-muted-foreground">Your rider{t.live ? ' · live' : ''}</p>
            </div>
            {t.rider.whatsapp && (
              <Button asChild size="sm" className="h-10 gap-1.5 rounded-full bg-[#25D366] px-4 text-white hover:bg-[#1fb257]">
                <a href={`https://wa.me/${t.rider.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp call ${t.rider.name}`}>
                  <Phone className="h-4 w-4" /> Call
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Map */}
        <div className="relative min-h-[240px] flex-1 overflow-hidden border-t">
          {t ? (
            t.shop?.position || t.destination || t.rider?.position ? (
              <TrackingMap shop={t.shop?.position ?? null} rider={t.rider?.position ?? null} destination={t.destination} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                The map appears once we can place the shop or your address.
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          )}
          {t && !t.rider && !done && (
            <div className="pointer-events-none absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[500] rounded-xl bg-background/90 px-4 py-3 text-center text-sm shadow-md backdrop-blur">
              We&apos;ll show your rider here once one picks up your order.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Item = { id: string; imageUrl: string; caption: string | null };

/** "View portfolio": photos of this kind of job the provider has done before. Tap a photo to see it large. */
export function PortfolioViewer({ serviceId, onClose, onBook }: { serviceId: string; onClose: () => void; onBook?: () => void }) {
  const [data, setData] = useState<{ serviceName: string; providerName: string; items: Item[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/services/${serviceId}/portfolio`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setData(await r.json());
      })
      .catch(() => setFailed(true));
  }, [serviceId]);

  const items = data?.items ?? [];
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) { if (open !== null) setOpen(null); else onClose(); } }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="svc-display flex items-center gap-2 text-xl"><Images className="h-5 w-5 text-primary" />{data ? data.serviceName : 'Portfolio'}</DialogTitle>
          <DialogDescription>{data ? `Past work by ${data.providerName}` : failed ? 'This portfolio isn’t available.' : 'Loading…'}</DialogDescription>
        </DialogHeader>

        {!data && !failed && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {data && items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No photos yet for this service.</p>}

        {data && items.length > 0 && open === null && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {items.map((it, i) => (
              <button key={it.id} type="button" onClick={() => setOpen(i)} className="group relative aspect-square overflow-hidden rounded-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl} alt={it.caption ?? data.serviceName} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                {it.caption && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-left text-xs text-white">{it.caption}</span>}
              </button>
            ))}
          </div>
        )}

        {data && open !== null && items[open] && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl border bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={items[open].imageUrl} alt={items[open].caption ?? data.serviceName} className="mx-auto max-h-[60vh] w-auto object-contain" />
              {items.length > 1 && (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"><ChevronLeft className="h-5 w-5" /></button>
                  <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"><ChevronRight className="h-5 w-5" /></button>
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">{items[open].caption ?? ' '}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{open + 1} / {items.length}</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {items.map((it, i) => (
                <button key={it.id} type="button" onClick={() => setOpen(i)} aria-label={`Photo ${i + 1}`} className={cn('h-12 w-12 shrink-0 overflow-hidden rounded-md border-2', i === open ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setOpen(null)} className="text-sm text-muted-foreground underline-offset-4 hover:underline">Back to all photos</button>
          </div>
        )}

        {onBook && data && (
          <button type="button" onClick={onBook} className="svc-accent-btn w-full rounded-xl py-3 text-sm font-semibold">Book {data.serviceName}</button>
        )}
      </DialogContent>
    </Dialog>
  );
}

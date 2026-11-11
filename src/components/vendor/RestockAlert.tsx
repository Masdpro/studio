'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';

type Item = { id: string; name: string; imageUrl: string; stock: number; lowStockAt: number; emptyParts: number };

/** Dashboard card listing products that are low, sold out, or have a size/colour/branch at zero. */
export function RestockAlert() {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    fetch('/api/vendor/stock')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItems(d?.restock ?? []))
      .catch(() => setItems([]));
  }, []);
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5" /> {items.length} product{items.length === 1 ? '' : 's'} need{items.length === 1 ? 's' : ''} restocking</p>
        <Link href="/vendor/dashboard/products?filter=restock" className="flex shrink-0 items-center gap-1 text-sm font-semibold underline-offset-2 hover:underline">
          Restock <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.slice(0, 6).map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-lg bg-white/70 p-2">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
              <SafeImage src={i.imageUrl || 'https://placehold.co/40x40.png'} alt="" fill style={{ objectFit: 'cover' }} sizes="40px" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{i.name}</p>
              <p className="text-xs">
                {i.stock === 0 ? <span className="font-semibold text-destructive">Sold out</span> : `${i.stock} left`}
                {i.stock > 0 && i.emptyParts > 0 ? ` · ${i.emptyParts} option${i.emptyParts === 1 ? '' : 's'} sold out` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 6 && <p className="mt-2 text-xs">and {items.length - 6} more</p>}
    </div>
  );
}

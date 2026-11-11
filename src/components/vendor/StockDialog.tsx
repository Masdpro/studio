'use client';

import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, Minus, PackageCheck, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

export type StockRow = { location: string; color: string; size: string; quantity: number };
type HistoryEntry = { change: number; quantityAfter: number; reason: string; createdAt: string; location: string; color: string; size: string };

const REASON: Record<string, string> = {
  order: 'Order placed',
  cancelled: 'Order cancelled (put back)',
  adjusted: 'Changed by hand',
  counted: 'Stock count',
  sold_out: 'Marked sold out',
};

const keyOf = (location: string, color: string, size: string) => `${location}\u0000${color.toLowerCase()}\u0000${size.toLowerCase()}`;

/**
 * Set how a product's stock is counted (not at all / one number / per colour, size and branch),
 * the low-stock alert level, and see the history of changes.
 */
export function StockDialog({
  product,
  open,
  onOpenChange,
  locations,
  onSaved,
  startTracking,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Record<string, string>;
  onSaved: () => void;
  /** Open with tracking switched on (from a "Track stock" button). */
  startTracking?: boolean;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [track, setTrack] = useState(true);
  const [byColor, setByColor] = useState(false);
  const [bySize, setBySize] = useState(false);
  const [byBranch, setByBranch] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [lowAt, setLowAt] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const colors = product?.colors ?? [];
  const sizes = product?.sizes ?? [];
  // A branch-only product is always counted at its branch; otherwise the main shop plus any branches.
  const allLocations = useMemo(() => {
    if (product?.branchId) return [product.branchId];
    return Object.keys(locations).sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : (locations[a] ?? '').localeCompare(locations[b] ?? '')));
  }, [locations, product?.branchId]);
  const canSplitBranch = !product?.branchId && allLocations.length > 1;

  useEffect(() => {
    if (!open || !product) return;
    setLoading(true);
    setLowAt(product.lowStockAt !== undefined ? String(product.lowStockAt) : '');
    fetch(`/api/vendor/products/${product.id}/stock`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { rows: StockRow[]; history: HistoryEntry[] }) => {
        const rows = d.rows ?? [];
        setByColor(rows.some((r) => r.color !== ''));
        setBySize(rows.some((r) => r.size !== ''));
        setByBranch(new Set(rows.map((r) => r.location)).size > 1);
        setCounts(Object.fromEntries(rows.map((r) => [keyOf(r.location, r.color, r.size), String(r.quantity)])));
        setHistory(d.history ?? []);
        setTrack(rows.length > 0 || !!startTracking);
      })
      .catch(() => toast({ variant: 'destructive', title: 'Could not load stock', description: 'Please try again.' }))
      .finally(() => setLoading(false));
  }, [open, product, toast, startTracking]);

  const shownLocations = byBranch ? allLocations : [product?.branchId ?? allLocations.find((l) => l === 'main') ?? allLocations[0] ?? 'main'];
  const colorList = byColor && colors.length ? colors : [''];
  const sizeList = bySize && sizes.length ? sizes : [''];

  // When the layout changes, start each new cell from what's already known (or blank).
  const valueFor = (loc: string, c: string, s: string) => counts[keyOf(loc, c, s)] ?? '';
  const setValue = (loc: string, c: string, s: string, v: string) => setCounts((prev) => ({ ...prev, [keyOf(loc, c, s)]: v.replace(/[^0-9]/g, '').slice(0, 7) }));
  const bump = (loc: string, c: string, s: string, d: number) => setValue(loc, c, s, String(Math.max(0, (Number(valueFor(loc, c, s)) || 0) + d)));

  const total = shownLocations.reduce((n, loc) => n + colorList.reduce((m, c) => m + sizeList.reduce((k, s) => k + (Number(valueFor(loc, c, s)) || 0), 0), 0), 0);

  async function save() {
    if (!product) return;
    const rows = track
      ? shownLocations.flatMap((location) => colorList.flatMap((color) => sizeList.map((size) => ({ location, color, size, quantity: Number(valueFor(location, color, size)) || 0 }))))
      : null;
    const low = lowAt.trim() === '' ? null : Number(lowAt);
    setSaving(true);
    try {
      const res = await fetch(`/api/vendor/products/${product.id}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, lowStockAt: low }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not save stock.');
      toast({ title: 'Stock saved', description: track ? `${product.name}: ${data.stock} in stock.` : `${product.name} is always available (stock not tracked).` });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not save stock', description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  // A plain function (not a component) so inputs keep focus while typing.
  const cell = (loc: string, c: string, s: string) => (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="One less" onClick={() => bump(loc, c, s, -1)}><Minus className="h-3.5 w-3.5" /></Button>
      <Input
        inputMode="numeric"
        aria-label={`Stock ${[c, s, locations[loc]].filter(Boolean).join(' ')}`}
        className="h-8 w-16 px-2 text-center"
        placeholder="0"
        value={valueFor(loc, c, s)}
        onChange={(e) => setValue(loc, c, s, e.target.value)}
      />
      <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="One more" onClick={() => bump(loc, c, s, 1)}><Plus className="h-3.5 w-3.5" /></Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" /> Stock · {product?.name}</DialogTitle>
          <DialogDescription>Count what you have, and Closebuy takes units off as orders come in and puts them back if an order is cancelled.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <Label htmlFor="track-stock" className="text-sm font-semibold">Track stock</Label>
                <p className="text-xs text-muted-foreground">Off: always available to order. On: shoppers see &ldquo;Only 3 left&rdquo; and can&apos;t order more than you have.</p>
              </div>
              <Switch id="track-stock" checked={track} onCheckedChange={setTrack} />
            </div>

            {track && (
              <>
                {(colors.length > 0 || sizes.length > 0 || canSplitBranch) && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-semibold">Count separately for each…</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {colors.length > 0 && <label className="flex items-center gap-2 text-sm"><Switch checked={byColor} onCheckedChange={setByColor} /> Colour</label>}
                      {sizes.length > 0 && <label className="flex items-center gap-2 text-sm"><Switch checked={bySize} onCheckedChange={setBySize} /> Size</label>}
                      {canSplitBranch && <label className="flex items-center gap-2 text-sm"><Switch checked={byBranch} onCheckedChange={setByBranch} /> Branch</label>}
                    </div>
                    {canSplitBranch && !byBranch && <p className="text-xs text-muted-foreground">Off: one shared count serves your main shop and every branch.</p>}
                  </div>
                )}

                <div className="space-y-4">
                  {shownLocations.map((loc) => (
                    <div key={loc} className="space-y-2">
                      {(byBranch || product?.branchId) && <p className="text-sm font-semibold">{locations[loc] ?? 'Branch'}</p>}
                      {colorList.length > 1 && sizeList.length > 1 ? (
                        <div className="overflow-x-auto">
                          <table className="text-sm">
                            <thead>
                              <tr>
                                <th className="pr-3 text-left font-medium text-muted-foreground" />
                                {sizeList.map((s) => <th key={s} className="px-1 pb-1 text-center font-medium">{s}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {colorList.map((c) => (
                                <tr key={c}>
                                  <td className="whitespace-nowrap pr-3 font-medium">{c}</td>
                                  {sizeList.map((s) => <td key={s} className="px-1 py-1">{cell(loc, c, s)}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {colorList.flatMap((c) => sizeList.map((s) => (
                            <div key={`${c}|${s}`} className={cn('flex items-center justify-between gap-3 rounded-lg border px-3 py-2', !c && !s && 'sm:col-span-2')}>
                              <span className="text-sm font-medium">{c || s || 'Units in stock'}</span>
                              {cell(loc, c, s)}
                            </div>
                          )))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg bg-muted/50 p-3">
                  <div className="space-y-1">
                    <Label htmlFor="low-at" className="text-sm font-semibold">Alert me when stock falls to</Label>
                    <Input id="low-at" inputMode="numeric" className="h-9 w-24" placeholder="5" value={lowAt} onChange={(e) => setLowAt(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} />
                  </div>
                  <p className="text-sm">Total: <span className="font-bold">{total}</span> in stock</p>
                </div>
              </>
            )}

            {history.length > 0 && (
              <details className="rounded-lg border p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Recent changes</summary>
                <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
                  {history.map((h, i) => {
                    const what = [h.color, h.size].filter(Boolean).join(' / ');
                    const where = Object.keys(locations).length > 1 ? h.location : '';
                    return (
                      <li key={i} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{REASON[h.reason] ?? h.reason}{what || where ? <span className="font-normal text-muted-foreground"> · {[what, where].filter(Boolean).join(' · ')}</span> : null}</p>
                          <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn('font-semibold', h.change > 0 ? 'text-emerald-600' : h.change < 0 ? 'text-destructive' : '')}>{h.change > 0 ? `+${h.change}` : h.change}</p>
                          <p className="text-xs text-muted-foreground">{h.quantityAfter} left</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

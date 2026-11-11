'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Edit, EyeOff, Eye, Loader2, Minus, MoreVertical, PackageCheck, PackageX, Plus, Search, Trash2, X } from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { StockDialog, type StockRow } from '@/components/vendor/StockDialog';

type Filter = 'all' | 'restock' | 'sold_out' | 'paused' | 'untracked';
type Overview = { rows: Record<string, StockRow[]>; locations: Record<string, string>; restock: { id: string }[]; defaultLowStock: number };

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'restock', label: 'Needs restocking' },
  { id: 'sold_out', label: 'Sold out' },
  { id: 'paused', label: 'Paused' },
  { id: 'untracked', label: 'Not tracked' },
];

/**
 * The vendor's products with stock at a glance: quick +/- and type-in counts, one-tap sold out /
 * pause, filters for what needs attention, and actions on several products at once.
 */
export function StockManager({
  products,
  onChanged,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onChanged: () => void;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const params = useSearchParams();
  const initial = params.get('filter');
  const [filter, setFilter] = useState<Filter>(FILTERS.some((f) => f.id === initial) ? (initial as Filter) : 'all');
  const [query, setQuery] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [stockFor, setStockFor] = useState<{ product: Product; startTracking: boolean } | null>(null);

  const loadOverview = useCallback(async () => {
    const res = await fetch('/api/vendor/stock');
    if (res.ok) setOverview(await res.json());
  }, []);
  useEffect(() => { loadOverview(); }, [loadOverview, products]);

  const refresh = useCallback(() => { onChanged(); }, [onChanged]);
  const restockIds = useMemo(() => new Set(overview?.restock.map((r) => r.id) ?? []), [overview]);

  const counts: Record<Filter, number> = {
    all: products.length,
    restock: products.filter((p) => restockIds.has(p.id)).length,
    sold_out: products.filter((p) => p.stock === 0).length,
    paused: products.filter((p) => p.paused).length,
    untracked: products.filter((p) => p.stock === undefined).length,
  };

  const visible = products.filter((p) => {
    if (query && !`${p.name} ${p.category ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'restock') return restockIds.has(p.id);
    if (filter === 'sold_out') return p.stock === 0;
    if (filter === 'paused') return !!p.paused;
    if (filter === 'untracked') return p.stock === undefined;
    return true;
  });

  const rowsOf = (p: Product) => overview?.rows[p.id] ?? [];
  // One plain count (no colour/size/branch split): it can be changed right here in the list.
  const isSimple = (p: Product) => p.stock !== undefined && rowsOf(p).length === 1 && rowsOf(p)[0].color === '' && rowsOf(p)[0].size === '';

  function splitLabel(p: Product) {
    const rows = rowsOf(p);
    const parts = [rows.some((r) => r.color) && 'colour', rows.some((r) => r.size) && 'size', new Set(rows.map((r) => r.location)).size > 1 && 'branch'].filter(Boolean);
    return parts.length ? `by ${parts.join(', ')}` : '';
  }

  async function adjust(p: Product, delta: number) {
    setBusy(p.id);
    try {
      const res = await fetch(`/api/vendor/products/${p.id}/stock`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      refresh();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not change stock', description: err instanceof Error && err.message ? err.message : 'Please try again.' });
    } finally {
      setBusy(null);
    }
  }

  async function setCount(p: Product, value: string) {
    const n = Number(value);
    setDrafts((d) => { const { [p.id]: _, ...rest } = d; return rest; });
    if (value.trim() === '' || !Number.isInteger(n) || n < 0 || n === p.stock) return;
    const row = rowsOf(p)[0];
    setBusy(p.id);
    try {
      const res = await fetch(`/api/vendor/products/${p.id}/stock`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: [{ location: row?.location ?? 'main', quantity: n }] }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Stock updated', description: `${p.name}: ${n} in stock.` });
      refresh();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not change stock', description: err instanceof Error && err.message ? err.message : 'Please try again.' });
    } finally {
      setBusy(null);
    }
  }

  async function act(ids: string[], action: 'pause' | 'resume' | 'sold_out') {
    if (!ids.length) return;
    setBusy(ids.length === 1 ? ids[0] : 'bulk');
    try {
      const res = await fetch('/api/vendor/products/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      const n = ids.length === 1 ? (products.find((p) => p.id === ids[0])?.name ?? '1 product') : `${ids.length} products`;
      toast({
        title: action === 'pause' ? 'Paused' : action === 'resume' ? 'Showing again' : 'Marked sold out',
        description: action === 'pause' ? `${n} hidden from shoppers. Nothing is deleted.` : action === 'resume' ? `${n} can be ordered again.` : `${n} set to 0 in stock.`,
      });
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast({ variant: 'destructive', title: 'That didn’t work', description: err instanceof Error && err.message ? err.message : 'Please try again.' });
    } finally {
      setBusy(null);
    }
  }

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));

  function statusBadge(p: Product) {
    const low = (p.lowStockAt ?? overview?.defaultLowStock ?? 5);
    if (p.paused) return <Badge variant="secondary" className="gap-1"><EyeOff className="h-3 w-3" /> Paused</Badge>;
    if (p.stock === undefined) return <Badge variant="outline" className="font-normal text-muted-foreground">Not tracked</Badge>;
    if (p.stock === 0) return <Badge variant="destructive">Sold out</Badge>;
    if (p.stock <= low || restockIds.has(p.id)) return <Badge className="border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">{p.stock <= low ? 'Low stock' : 'Some options out'}</Badge>;
    return null;
  }

  if (!products.length) return <p className="py-4 text-center text-muted-foreground">You haven&apos;t added any products yet.</p>;

  return (
    <div className="space-y-4">
      {counts.restock > 0 && filter !== 'restock' && (
        <button
          type="button"
          onClick={() => setFilter('restock')}
          className="flex w-full items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span><strong>{counts.restock} product{counts.restock === 1 ? '' : 's'} need{counts.restock === 1 ? 's' : ''} restocking.</strong> Tap to see them.</span>
        </button>
      )}

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your products" className="pl-9" aria-label="Search your products" />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filter products">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
              )}
            >
              {f.label} <span className={cn('ml-1 text-xs', filter === f.id ? 'opacity-90' : 'text-muted-foreground')}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length > 0 && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={(v) => setSelected(v ? new Set([...selected, ...visible.map((p) => p.id)]) : new Set([...selected].filter((id) => !visible.some((p) => p.id === id))))}
          />
          Select all {visible.length}
        </label>
      )}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((p) => {
            const simple = isSimple(p);
            const draft = drafts[p.id];
            return (
              <li key={p.id} className={cn('flex gap-3 rounded-lg border bg-card p-3 shadow-sm', selected.has(p.id) && 'border-primary ring-1 ring-primary', p.paused && 'opacity-75')}>
                <Checkbox className="mt-1" checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} />
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  <SafeImage src={p.imageUrl || 'https://placehold.co/64x64.png'} alt={p.name} fill style={{ objectFit: 'cover' }} sizes="64px" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">₦{(p.discountPrice ?? p.price).toLocaleString()}{p.category ? ` · ${p.category}` : ''}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`More for ${p.name}`}><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStockFor({ product: p, startTracking: true })}><PackageCheck className="mr-2 h-4 w-4" /> Manage stock</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(p)}><Edit className="mr-2 h-4 w-4" /> Edit details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => act([p.id], p.paused ? 'resume' : 'pause')}>
                          {p.paused ? <><Eye className="mr-2 h-4 w-4" /> Show to shoppers</> : <><EyeOff className="mr-2 h-4 w-4" /> Pause (hide)</>}
                        </DropdownMenuItem>
                        {p.stock !== 0 && <DropdownMenuItem onClick={() => act([p.id], 'sold_out')}><PackageX className="mr-2 h-4 w-4" /> Mark sold out</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { if (window.confirm(`Delete ${p.name}? This can't be undone. To hide it for now, use Pause instead.`)) onDelete(p.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(p)}
                    {simple ? (
                      <div className="flex items-center gap-1" aria-label={`Stock for ${p.name}`}>
                        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="One less" disabled={busy === p.id || p.stock === 0} onClick={() => adjust(p, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                        <Input
                          inputMode="numeric"
                          aria-label={`Units in stock for ${p.name}`}
                          className="h-8 w-16 px-2 text-center"
                          value={draft ?? String(p.stock ?? 0)}
                          onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value.replace(/[^0-9]/g, '').slice(0, 7) }))}
                          onBlur={(e) => setCount(p, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          disabled={busy === p.id}
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="One more" disabled={busy === p.id} onClick={() => adjust(p, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                        <span className="text-xs text-muted-foreground">in stock</span>
                        {busy === p.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                    ) : p.stock !== undefined ? (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setStockFor({ product: p, startTracking: true })}>
                        {p.stock} in stock{splitLabel(p) ? ` · ${splitLabel(p)}` : ''}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setStockFor({ product: p, startTracking: true })}>
                        <PackageCheck className="mr-1 h-4 w-4" /> Track stock
                      </Button>
                    )}
                    {p.stock === 0 && !p.paused && (
                      <Button size="sm" className="h-8" onClick={() => setStockFor({ product: p, startTracking: true })}>Restock</Button>
                    )}
                    {p.paused && (
                      <Button size="sm" variant="outline" className="h-8" disabled={busy === p.id} onClick={() => act([p.id], 'resume')}><Eye className="mr-1 h-4 w-4" /> Show again</Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selected.size > 0 && (
        <div className="sticky bottom-24 z-30 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
          <span className="mr-auto text-sm font-semibold">{selected.size} selected</span>
          <Button size="sm" variant="outline" disabled={busy === 'bulk'} onClick={() => act([...selected], 'pause')}><EyeOff className="mr-1 h-4 w-4" /> Pause</Button>
          <Button size="sm" variant="outline" disabled={busy === 'bulk'} onClick={() => act([...selected], 'resume')}><Eye className="mr-1 h-4 w-4" /> Show</Button>
          <Button size="sm" variant="outline" disabled={busy === 'bulk'} onClick={() => act([...selected], 'sold_out')}><PackageX className="mr-1 h-4 w-4" /> Sold out</Button>
          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Clear selection" onClick={() => setSelected(new Set())}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <StockDialog
        product={stockFor?.product ?? null}
        startTracking={stockFor?.startTracking}
        open={!!stockFor}
        onOpenChange={(o) => { if (!o) setStockFor(null); }}
        locations={overview?.locations ?? { main: 'Main shop' }}
        onSaved={refresh}
      />
    </div>
  );
}

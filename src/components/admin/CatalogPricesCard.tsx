'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Status = { total: number; priced: number; lastRunAt: string | null; nextRunAt: string | null; running: boolean; onlineLookup: boolean; problem: string | null; bySource: Record<string, number> };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

/** Admin: the suggested prices Quick add fills in, and a button to update them now. */
export function CatalogPricesCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/catalog-prices')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d))
      .catch(() => {});
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [status?.running, load]);

  async function refresh() {
    const res = await fetch('/api/admin/catalog-prices', { method: 'POST' });
    if (!res.ok) return toast({ variant: 'destructive', title: 'Could not start the update' });
    setStatus(await res.json());
    toast({ title: 'Updating suggested prices', description: 'This takes a few minutes. You can leave this page.' });
  }

  if (!status) return null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <p className="font-medium">Suggested prices for Quick add</p>
        <p className="text-muted-foreground">
          {status.priced} of {status.total} products have a suggested price.{' '}
          {status.lastRunAt ? `Last updated ${day(status.lastRunAt)}; next update around ${day(status.nextRunAt!)}.` : 'Not updated yet.'}
          {!status.onlineLookup && ' Online prices need the Gemini key, so only Closebuy shop prices are used for now.'}
        </p>
        {status.priced > 0 && (
          <p className="text-muted-foreground">
            {[
              status.bySource.online && `${status.bySource.online} from online stores`,
              status.bySource.closebuy && `${status.bySource.closebuy} from Closebuy shops`,
              status.bySource.checked && `${status.bySource.checked} checked on Chowdeck, Glovo and Shoprite`,
              status.bySource.estimate && `${status.bySource.estimate} starting estimates (replaced by the online search)`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {status.problem && <p className="mt-1 text-amber-700">{status.problem}</p>}
      </div>
      <Button variant="outline" onClick={refresh} disabled={status.running} className="shrink-0">
        {status.running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        {status.running ? 'Updating…' : 'Update now'}
      </Button>
    </div>
  );
}

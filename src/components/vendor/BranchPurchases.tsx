'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Activity = { id: string; name: string; orders: number; spent: number; recent: { id: string; date: number; store: string; items: string; total: number; status: string }[] };
const naira = (n: number) => '₦' + Math.round(n).toLocaleString();

/** Customer activity: what each branch account owner has been buying on Closebuy. */
export function BranchPurchases() {
  const [data, setData] = useState<Activity[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/vendor/branch-activity')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load customer activity.'))))
      .then((d) => setData(d.branches))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="py-4 text-sm text-destructive">{error}</p>;
  if (!data) return <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-primary" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Customer activity</CardTitle>
        <CardDescription>What your branch account owners have been buying on Closebuy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No branch logins yet. Create one in the Branches tab and their purchases will show up here.</p>}
        {data.map((b) => (
          <div key={b.id}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{b.name}</h3>
              <span className="text-sm text-muted-foreground">{b.orders} purchase{b.orders === 1 ? '' : 's'} · {naira(b.spent)} spent</span>
            </div>
            {b.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hasn't bought anything yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 pr-4 font-medium">Date</th><th className="py-2 pr-4 font-medium">Store</th><th className="py-2 pr-4 font-medium">Items</th><th className="py-2 pr-4 font-medium">Total</th><th className="py-2 font-medium">Status</th></tr></thead>
                  <tbody>
                    {b.recent.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="whitespace-nowrap py-2 pr-4">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{r.store}</td>
                        <td className="py-2 pr-4">{r.items || '—'}</td>
                        <td className="whitespace-nowrap py-2 pr-4">{naira(r.total)}</td>
                        <td className="py-2">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

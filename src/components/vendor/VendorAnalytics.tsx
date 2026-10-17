'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Row = { id: string; name: string; orders: number; revenue: number; completed: number; cancelled: number };
type Data = { rows: Row[]; total: Omit<Row, 'id' | 'name'>; trend: Record<string, number | string>[]; series: { id: string; name: string }[] };
const COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#eab308', '#ef4444', '#14b8a6', '#6366f1'];
const naira = (n: number) => '\u20A6' + Math.round(n).toLocaleString();

/** Orders and revenue for the main store and each branch: totals, a per-branch table and a 30-day trend. */
export function VendorAnalytics({ endpoint, showBranchFilter = true }: { endpoint: string; showBranchFilter?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load analytics.'))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [endpoint]);

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>;
  if (!data) return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-primary" />;

  const shown = filter === 'all' ? data.rows : data.rows.filter((r) => r.id === filter);
  const total = filter === 'all' ? data.total : shown[0] ?? data.total;
  const series = data.series.filter((s) => filter === 'all' || s.id === filter);

  return (
    <div className="space-y-6">
      {showBranchFilter && data.rows.length > 1 && (
        <div className="max-w-xs">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {data.rows.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-4">
        {[['Orders', String(total.orders)], ['Revenue', naira(total.revenue)], ['Completed', String(total.completed)], ['Cancelled', String(total.cancelled)]].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Revenue, last 30 days</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} interval={4} />
              <YAxis fontSize={12} tickFormatter={(v: number) => (v >= 1000 ? Math.round(v / 1000) + 'k' : String(v))} width={40} />
              <Tooltip formatter={(v: number) => naira(v)} />
              {series.length > 1 && <Legend />}
              {series.map((s, i) => <Bar key={s.id} dataKey={s.id} name={s.name} stackId="rev" fill={COLORS[i % COLORS.length]} />)}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">{data.rows.length > 1 ? 'By branch' : 'Summary'}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Branch</th><th className="py-2 pr-4 font-medium">Orders</th><th className="py-2 pr-4 font-medium">Revenue</th><th className="py-2 pr-4 font-medium">Completed</th><th className="py-2 font-medium">Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{r.name}</td><td className="py-2 pr-4">{r.orders}</td><td className="py-2 pr-4">{naira(r.revenue)}</td><td className="py-2 pr-4">{r.completed}</td><td className="py-2">{r.cancelled}</td>
                </tr>
              ))}
              {shown.length > 1 && (
                <tr className="font-semibold">
                  <td className="py-2 pr-4">Total</td><td className="py-2 pr-4">{total.orders}</td><td className="py-2 pr-4">{naira(total.revenue)}</td><td className="py-2 pr-4">{total.completed}</td><td className="py-2">{total.cancelled}</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

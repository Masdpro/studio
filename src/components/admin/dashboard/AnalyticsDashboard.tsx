'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowDownRight, ArrowUpRight, Banknote, Loader2, MapPin, RefreshCw, ShoppingBag, ShoppingCart, Store, Bike,
  UserPlus, Activity, Wallet, Eye, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DashboardData } from '@/lib/services/analytics';

// Validated categorical slots 1-4 (blue, orange, aqua, violet); dark values are stepped for the dark surface.
const VIZ_CSS = `
.viz{--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#6250d6;--grid:#e4e2dc;--ink2:#52514e;--good:#0a7d4b;--bad:#c23030}
.dark .viz{--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#9085e9;--grid:#3a3a37;--ink2:#c3c2b7;--good:#3ecf8e;--bad:#f07070}
`;

const naira = (n: number) => '₦' + Math.round(n).toLocaleString();
const compact = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n)));
const nairaCompact = (n: number) => '₦' + compact(n);
const pctText = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(n < 10 ? 1 : 0) + '%');
const shortDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const label = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

function Delta({ v }: { v: number | null }) {
  if (v == null) return <span className="text-xs text-muted-foreground">no prior data</span>;
  const up = v >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium" style={{ color: up ? 'var(--good)' : 'var(--bad)' }}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {Math.min(Math.abs(v), 999).toFixed(0)}% <span className="sr-only">{up ? 'up' : 'down'}</span>
      <span className="text-muted-foreground font-normal ml-1">vs previous period</span>
    </span>
  );
}

function Tile({ title, value, change, icon: Icon, sub }: { title: string; value: string; change?: number | null; icon: typeof Banknote; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {title}
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
        <div className="mt-1 min-h-4">{change !== undefined ? <Delta v={change} /> : <span className="text-xs text-muted-foreground">{sub}</span>}</div>
      </CardContent>
    </Card>
  );
}

function Panel({ title, description, children, className = '' }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}

/** Horizontal bars with the value written at the end of each bar (direct labels, no legend needed for one series). */
function HBars({ items, color = 'var(--s1)', format = (n: number) => String(n) }: { items: { name: string; value: number; note?: string }[]; color?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <Empty>No data in this period yet.</Empty>;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.name}>
          <div className="flex justify-between text-sm gap-2">
            <span className="truncate">{i.name}</span>
            <span className="tabular-nums font-medium shrink-0">{format(i.value)}{i.note && <span className="text-muted-foreground font-normal"> · {i.note}</span>}</span>
          </div>
          <div className="h-2 mt-1 rounded-sm bg-muted overflow-hidden">
            <div className="h-full rounded-sm" style={{ width: `${(i.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Funnel({ steps }: { steps: { step: string; value: number }[] }) {
  const first = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s.step}>
          <div className="flex justify-between text-sm">
            <span>{s.step}</span>
            <span className="tabular-nums font-medium">
              {s.value.toLocaleString()}
              <span className="text-muted-foreground font-normal"> · {i === 0 ? '100%' : pctText((s.value / first) * 100)}
                {i > 0 && steps[i - 1].value > 0 && ` (${pctText((s.value / steps[i - 1].value) * 100)} of previous)`}</span>
            </span>
          </div>
          <div className="h-3 mt-1 rounded-sm bg-muted overflow-hidden">
            <div className="h-full rounded-sm" style={{ width: `${(s.value / first) * 100}%`, background: 'var(--s1)', opacity: 1 - i * 0.14 }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: (string | number | ReactNode)[][] }) {
  if (!rows.length) return <Empty>No data in this period yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            {cols.map((c, i) => <th key={c} className={`py-1.5 font-medium ${i ? 'text-right' : ''}`}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {r.map((c, i) => <td key={i} className={`py-1.5 ${i ? 'text-right tabular-nums' : 'truncate max-w-[16rem]'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tip = { contentStyle: { borderRadius: 8, fontSize: 12 }, labelFormatter: (d: any) => (typeof d === 'string' && d.includes('-') ? shortDate(d) : d) };
const axis = { tick: { fontSize: 11, fill: 'var(--ink2)' }, tickLine: false, axisLine: false } as const;

function TrendChart({ data, kind, dataKey, color, name, fmt }: { data: DashboardData['trend']; kind: 'area' | 'line' | 'bar'; dataKey: string; color: string; name: string; fmt?: (n: number) => string }) {
  const common = { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  const grid = <CartesianGrid stroke="var(--grid)" vertical={false} />;
  const x = <XAxis dataKey="date" {...axis} tickFormatter={shortDate} minTickGap={24} />;
  const y = <YAxis {...axis} width={44} tickFormatter={fmt ?? compact} allowDecimals={false} />;
  const t = <Tooltip {...tip} formatter={(v: any) => [fmt ? fmt(Number(v)) : v, name]} />;
  return (
    <div className="h-56" role="img" aria-label={`${name} per day`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'area' ? (
          <AreaChart {...common}>{grid}{x}{y}{t}<Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.12} /></AreaChart>
        ) : kind === 'line' ? (
          <LineChart {...common}>{grid}{x}{y}{t}<Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} /></LineChart>
        ) : (
          <BarChart {...common}>{grid}{x}{y}{t}<Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={22} /></BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not load analytics.');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(days); }, [days, load]);

  if (!data) {
    return (
      <div className="py-16 text-center">
        {error ? <p className="text-destructive">{error}</p> : <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />}
      </div>
    );
  }

  const k = data.kpis, ev = data.events, u = data.users, dl = data.delivery;
  const noEvents = ev.totals.every((t) => t.count === 0);

  return (
    <div className="viz space-y-6">
      <style>{VIZ_CSS}</style>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Marketplace performance, people and platform activity across Closebuy.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Date range">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} aria-pressed={days === d}
                className={`px-3 py-1 text-sm rounded ${days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {d}d
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => load(days)} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {data.totals.pendingApprovals > 0 && (
        <Link href="/admin/verifications" className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {data.totals.pendingApprovals} vendor/agent account{data.totals.pendingApprovals > 1 ? 's' : ''} waiting for verification review.
          <span className="ml-auto underline">Review</span>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Tile title="Revenue (GMV)" value={nairaCompact(k.gmv.value)} change={k.gmv.change} icon={Banknote} />
        <Tile title="Orders" value={k.orders.value.toLocaleString()} change={k.orders.change} icon={ShoppingBag} />
        <Tile title="Avg order value" value={naira(k.aov.value)} change={k.aov.change} icon={ShoppingCart} />
        <Tile title="New users" value={k.signups.value.toLocaleString()} change={k.signups.change} icon={UserPlus} />
        <Tile title="Sessions" value={k.sessions.value.toLocaleString()} change={k.sessions.change} icon={Activity} />
        <Tile title="Wallet funded" value={nairaCompact(k.walletFunded.value)} change={k.walletFunded.change} icon={Wallet} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="users">Users &amp; verification</TabsTrigger>
          <TabsTrigger value="delivery">Delivery &amp; errands</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Revenue per day"><TrendChart data={data.trend} kind="area" dataKey="revenue" color="var(--s1)" name="Revenue" fmt={nairaCompact} /></Panel>
            <Panel title="Orders per day"><TrendChart data={data.trend} kind="line" dataKey="orders" color="var(--s2)" name="Orders" /></Panel>
            <Panel title="Signups per day"><TrendChart data={data.trend} kind="bar" dataKey="signups" color="var(--s3)" name="Signups" /></Panel>
            <Panel title="Sessions per day" description="Distinct visitors with tracked activity."><TrendChart data={data.trend} kind="line" dataKey="sessions" color="var(--s4)" name="Sessions" /></Panel>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Panel title="Order status" description="Orders created in this period.">
              <HBars items={data.orderStatus.map((s) => ({ name: label(s.status), value: s.count }))} />
            </Panel>
            <Panel title="Delivery vs pickup">
              {data.fulfilment[0].value + data.fulfilment[1].value === 0 ? <Empty>No orders in this period yet.</Empty> : (
                <HBars items={data.fulfilment.map((f) => ({ name: f.name, value: f.value }))} color="var(--s2)" />
              )}
            </Panel>
            <Panel title="Recent activity">
              {data.activity.length === 0 ? <Empty>Nothing yet.</Empty> : (
                <ul className="space-y-2 text-sm">
                  {data.activity.map((a, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="truncate">{a.text}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">{new Date(a.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Top products by revenue">
              <Table cols={['Product', 'Units', 'Revenue']} rows={data.topProducts.map((p) => [p.name, p.units, naira(p.revenue)])} />
            </Panel>
            <Panel title="Revenue by category"><HBars items={data.categories.map((c) => ({ name: c.name, value: c.revenue, note: `${c.units} units` }))} format={nairaCompact} /></Panel>
            <Panel title="Top vendors"><HBars items={data.topVendors.map((v) => ({ name: v.name, value: v.revenue, note: `${v.orders} orders` }))} format={nairaCompact} color="var(--s3)" /></Panel>
            <Panel title="Top markets"><HBars items={data.topMarkets.map((m) => ({ name: m.name, value: m.revenue, note: `${m.orders} orders` }))} format={nairaCompact} color="var(--s4)" /></Panel>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Tile title="Markets" value={String(data.totals.markets)} icon={MapPin} sub="listed" />
            <Tile title="Vendors" value={String(data.totals.vendors)} icon={Store} sub="stalls" />
            <Tile title="Products" value={String(data.totals.products)} icon={ShoppingBag} sub="in catalogue" />
            <Tile title="Delivery agents" value={String(data.totals.agents)} icon={Bike} sub="registered" />
            <Tile title="Awoof deal share" value={pctText(data.awoofShare)} icon={Banknote} sub="of units sold" />
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Panel title="Signups by role" description={`New in the last ${days} days · all-time total.`}>
              <HBars items={u.signupsByRole.map((r) => ({ name: label(r.role), value: r.count, note: `${r.total} total` }))} color="var(--s3)" />
            </Panel>
            <Panel title="Verification funnel" description="All customer, vendor and agent accounts."><Funnel steps={u.verification} /></Panel>
            <Panel title="Vendor & agent approvals">
              <HBars items={u.approval.map((a) => ({ name: a.name, value: a.value }))} color="var(--s4)" />
              <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/admin/verifications"><ShieldCheck className="h-4 w-4 mr-1" />Open review queue</Link></Button>
            </Panel>
          </div>
          <Panel title="New signups per day"><TrendChart data={data.trend} kind="bar" dataKey="signups" color="var(--s3)" name="Signups" /></Panel>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile title="Out for delivery now" value={String(dl.activeDeliveries)} icon={Bike} sub="in progress" />
            <Tile title="Awaiting an agent" value={String(dl.awaitingAgent)} icon={AlertTriangle} sub="ready, unclaimed" />
            <Tile title="Delivered rate" value={pctText(dl.deliveredRate)} icon={ShoppingBag} sub="of orders this period" />
            <Tile title="Positive ratings" value={pctText(dl.satisfaction)} icon={Eye} sub="vendor + agent reviews" />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Delivery agents" description="All-time deliveries and share of positive reviews.">
              <Table cols={['Agent', 'Delivered', 'Positive']} rows={data.agents.map((a) => [a.name, a.deliveries, pctText(a.positive)])} />
            </Panel>
            <Panel title="Errands" description={`${dl.errands} requested · ${dl.quotesPerErrand.toFixed(1)} quotes each · ${pctText(dl.errandAcceptRate)} accepted · avg ${naira(dl.avgErrandValue)}`}>
              <HBars items={data.errandStatus.map((s) => ({ name: label(s.status), value: s.count }))} color="var(--s2)" />
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {noEvents && (
            <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              No usage events recorded in this period yet. Tracking started {ev.trackedSince ? new Date(ev.trackedSince).toLocaleDateString() : 'with this release'};
              browse the storefront, search, add to cart and this tab fills in. For a populated preview run <code>npm run seed-analytics</code>.
            </p>
          )}
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Shopper funnel" description={`Visit → order conversion: ${pctText(ev.conversion)} · counted by browser session.`}><Funnel steps={ev.funnel} /></Panel>
            <Panel title="Events recorded"><HBars items={ev.totals.map((t) => ({ name: label(t.type), value: t.count }))} color="var(--s4)" format={(n) => n.toLocaleString()} /></Panel>
            <Panel title="Page views per day"><TrendChart data={data.trend} kind="area" dataKey="pageViews" color="var(--s1)" name="Page views" /></Panel>
            <Panel title="Activity by hour of day" description="Events by local hour of day.">
              <div className="h-56" role="img" aria-label="Events by hour">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ev.hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--grid)" vertical={false} />
                    <XAxis dataKey="hour" {...axis} tickFormatter={(h) => `${h}h`} interval={2} />
                    <YAxis {...axis} width={36} allowDecimals={false} />
                    <Tooltip contentStyle={tip.contentStyle} labelFormatter={(h) => `${h}:00`} formatter={(v: any) => [v, 'Events']} />
                    <Bar dataKey="events" fill="var(--s2)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Top searches"><Table cols={['Search', 'Searches', 'People']} rows={ev.topSearches.map((s) => [s.term, s.searches, s.people])} /></Panel>
            <Panel title="Most viewed products" description="Views vs add-to-cart actions."><Table cols={['Product', 'Views', 'Added to cart']} rows={ev.productInterest.map((p) => [p.name, p.views, p.carts])} /></Panel>
            <Panel title="Top pages" className="lg:col-span-2"><Table cols={['Page', 'Views']} rows={ev.topPages.map((p) => [p.path, p.views])} /></Panel>
          </div>
        </TabsContent>
      </Tabs>

      <div>
        <h2 className="text-lg font-semibold mb-2">Manage</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { href: '/admin/markets', label: 'Markets', n: data.totals.markets, icon: MapPin },
            { href: '/admin/vendors', label: 'Vendors', n: data.totals.vendors, icon: Store },
            { href: '/admin/products', label: 'Products', n: data.totals.products, icon: ShoppingBag },
            { href: '/admin/agents', label: 'Delivery agents', n: data.totals.agents, icon: Bike },
            { href: '/admin/verifications', label: 'Verifications', n: data.totals.pendingApprovals, icon: ShieldCheck },
          ].map((m) => (
            <Link key={m.href} href={m.href}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <m.icon className="h-5 w-5 text-primary" aria-hidden />
                  <div><div className="font-semibold tabular-nums">{m.n}</div><div className="text-sm text-muted-foreground">{m.label}{m.href.endsWith('verifications') ? ' pending' : ''}</div></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

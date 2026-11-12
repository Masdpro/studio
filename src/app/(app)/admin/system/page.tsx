'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, CircleSlash, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { AdminGate } from '@/components/admin/AdminGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Status = 'ok' | 'warn' | 'off' | 'fail';
type Check = { id: string; label: string; status: Status; detail: string };
type Counts = Record<string, { warn: number; error: number }>;
type Event = { id: number; at: string; level: 'warn' | 'error'; area: string; message: string; details: unknown; requestId: string | null };
type Data = {
  overall: Status;
  checks: Check[];
  counts: { day: Counts; week: Counts };
  server: { environment: string; release: string | null; node: string; region: string | null; upSince: string; memory: string };
  events: Event[];
};

const AREAS: { id: string; label: string }[] = [
  { id: 'payments', label: 'Payments' },
  { id: 'sms', label: 'SMS' },
  { id: 'email', label: 'Email' },
  { id: 'jobs', label: 'Background jobs' },
  { id: 'stock', label: 'Stock' },
  { id: 'security', label: 'Security' },
  { id: 'app', label: 'App errors' },
];

const STATUS: Record<Status, { icon: React.ComponentType<{ className?: string }>; cls: string; word: string }> = {
  ok: { icon: CheckCircle2, cls: 'text-green-600', word: 'Working' },
  warn: { icon: AlertTriangle, cls: 'text-amber-600', word: 'Needs a look' },
  fail: { icon: XCircle, cls: 'text-red-600', word: 'Problem' },
  off: { icon: CircleSlash, cls: 'text-muted-foreground', word: 'Not set up' },
};

const when = (iso: string) => new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function SystemHealthPage() {
  const [data, setData] = useState<Data | null>(null);
  const [area, setArea] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/system${area ? `?area=${area}` : ''}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .finally(() => setLoading(false));
  }, [area]);
  useEffect(load, [load]);
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const overall = data ? STATUS[data.overall === 'off' ? 'ok' : data.overall] : null;

  return (
    <AdminGate>
      <div className="container mx-auto max-w-5xl space-y-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Activity className="h-6 w-6" /> System health
            </h1>
            <p className="text-muted-foreground">Whether the app and the services it relies on are working, and recent problems. Refreshes every minute.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Refresh
          </Button>
        </div>

        {!data ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {overall && (
              <div className={cn('flex items-center gap-2 rounded-lg border p-4 font-medium', overall.cls)}>
                <overall.icon className="h-5 w-5" />
                {data.overall === 'fail' ? 'Something needs fixing.' : data.overall === 'warn' ? 'Mostly fine, but some things need a look.' : 'Everything is working.'}
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {data.server.environment} · Node {data.server.node}
                  {data.server.region ? ` · ${data.server.region}` : ''} · up since {when(data.server.upSince)} · {data.server.memory}
                </span>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Checks</CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {data.checks.map((c) => {
                  const s = STATUS[c.status];
                  return (
                    <div key={c.id} className="flex items-start gap-3 px-6 py-3">
                      <s.icon className={cn('mt-0.5 h-5 w-5 shrink-0', s.cls)} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{c.label}</p>
                        <p className="text-sm text-muted-foreground">{c.detail}</p>
                      </div>
                      <span className={cn('shrink-0 text-xs font-medium', s.cls)}>{s.word}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Problems by area</CardTitle>
                <CardDescription>Errors and warnings in the last 24 hours (and 7 days). Tap an area to see its problems.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {AREAS.map((a) => {
                  const d = data.counts.day[a.id] ?? { warn: 0, error: 0 };
                  const w = data.counts.week[a.id] ?? { warn: 0, error: 0 };
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setArea(area === a.id ? '' : a.id)}
                      className={cn('rounded-lg border p-3 text-left transition hover:bg-accent', area === a.id && 'border-primary ring-1 ring-primary')}
                    >
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className={cn('text-2xl font-bold', d.error ? 'text-red-600' : d.warn ? 'text-amber-600' : 'text-muted-foreground')}>{d.error + d.warn}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.error} errors · {w.error + w.warn} this week
                      </p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent problems{area ? `: ${AREAS.find((a) => a.id === area)?.label}` : ''}</CardTitle>
                <CardDescription>Kept for 30 days. The request ID matches the server logs and Sentry.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.events.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">Nothing recorded.</p>
                ) : (
                  <ul className="divide-y">
                    {data.events.map((e) => (
                      <li key={e.id} className="px-6 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', e.level === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800')}>
                            {e.level === 'error' ? 'Error' : 'Warning'}
                          </span>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">{AREAS.find((a) => a.id === e.area)?.label ?? e.area}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{when(e.at)}</span>
                        </div>
                        <p className="mt-1 font-medium">{e.message}</p>
                        {(e.details || e.requestId) && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-muted-foreground">Details{e.requestId ? ` · request ${e.requestId.slice(0, 12)}` : ''}</summary>
                            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">{JSON.stringify({ requestId: e.requestId, ...(e.details as object) }, null, 2)}</pre>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminGate>
  );
}

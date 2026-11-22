'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Clock, Home, Images, Loader2, Pencil, Plus, Store, Trash2, X } from 'lucide-react';
import { PortfolioDialog, type PortfolioItem } from '@/components/services/PortfolioDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRequireTrading } from '@/hooks/use-trading-status';
import { dayLabel, durationLabel, naira } from '@/lib/booking-time';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';

// Same limits as the server.
const SERVICE_RULES = {
  name: rules.text('the service name', 2, 80),
  description: rules.maxLength(1000, 'the description'),
  price: rules.naira('the price', 100, 10_000_000),
  callOutFee: rules.optional(rules.naira('the call-out fee', 0, 1_000_000)),
};
type ServiceField = keyof typeof SERVICE_RULES;

type Interval = [string, string];
type Settings = { weeklyHours: Record<string, Interval[]>; capacity: number; instantBooking: boolean; daysOff: string[] };
type Service = { id: string; name: string; description: string | null; imageUrl: string | null; price: number; priceFrom: boolean; durationMin: number; location: 'shop' | 'home' | 'either'; callOutFee: number | null; paused: boolean; portfolio: PortfolioItem[] };

const DAYS = [['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday'], ['6', 'Saturday'], ['0', 'Sunday']] as const;
const DURATIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];
const PLACES = { shop: 'At my place of work', home: 'At the customer\'s place', either: 'Either (customer chooses)' };

/** Splits the last period around a 13:00–14:00 lunch break, or adds an afternoon period. */
function addBreak(list: Interval[]): Interval[] {
  const last = list[list.length - 1];
  if (last && last[0] < '13:00' && last[1] > '14:00') return [...list.slice(0, -1), [last[0], '13:00'], ['14:00', last[1]]];
  const from = last ? last[1] : '09:00';
  return [...list, [from, from < '20:00' ? '21:00' : '23:45']];
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
  return data;
}

/** Where a provider sets up booked services: the services, opening hours, days off and how bookings are confirmed. */
export default function ProviderServicesPage() {
  useRequireTrading('/provider/dashboard');
  const { toast } = useToast();
  const [services, setServices] = useState<Service[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [portfolioOf, setPortfolioOf] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, st] = await Promise.all([fetch('/api/provider/services', { cache: 'no-store' }), fetch('/api/provider/settings', { cache: 'no-store' })]);
    if (s.ok) setServices((await s.json()).services);
    if (st.ok) setSettings((await st.json()).settings);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (s: Service) => {
    try {
      const r = await send(`/api/provider/services/${s.id}`, 'DELETE');
      toast({ title: r.paused ? 'Service paused' : 'Service removed', description: r.paused ? 'It has bookings still to come, so it\'s paused: customers can\'t book it, and existing bookings go ahead.' : undefined });
      load();
    } catch (err) {
      toast({ title: 'Could not remove it', description: (err as Error).message, variant: 'destructive' });
    }
  };
  const togglePause = async (s: Service) => {
    try {
      await send(`/api/provider/services/${s.id}`, 'PATCH', { paused: !s.paused });
      load();
    } catch (err) {
      toast({ title: 'Could not update it', description: (err as Error).message, variant: 'destructive' });
    }
  };

  if (!services || !settings) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Services, portfolio &amp; hours</h1>
        <Button variant="outline" size="sm" asChild><Link href="/provider/bookings"><CalendarCheck className="mr-1.5 h-4 w-4" />Bookings</Link></Button>
      </div>
      <p className="text-sm text-muted-foreground">Services are booked for a time, not bought. Customers pay when they book; you&apos;re paid when they give you their code at the end of the job.</p>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Your services</CardTitle>
            <CardDescription>Shown on your business page with a Book button. Add photos of past work to each one.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setEditing('new')}><Plus className="mr-1 h-4 w-4" />Add a service</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {services.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No services yet. Add one, like &ldquo;Haircut&rdquo; or &ldquo;Phone screen repair&rdquo;.</p>}
          {services.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name} {s.paused && <Badge variant="outline" className="ml-1">Paused</Badge>}</p>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>{s.priceFrom ? 'from ' : ''}{naira(s.price)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{durationLabel(s.durationMin)}</span>
                  <span className="flex items-center gap-1">{s.location === 'shop' ? <Store className="h-3 w-3" /> : <Home className="h-3 w-3" />}{PLACES[s.location]}{s.location !== 'shop' && s.callOutFee ? ` (+${naira(s.callOutFee)})` : ''}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="outline" className="h-8" onClick={() => setPortfolioOf(s.id)} aria-label={`Portfolio for ${s.name}`}>
                  <Images className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Portfolio</span><span className="ml-1 text-xs text-muted-foreground">{s.portfolio.length}</span>
                </Button>
                <Switch checked={!s.paused} onCheckedChange={() => togglePause(s)} aria-label={s.paused ? `Resume ${s.name}` : `Pause ${s.name}`} />
                <Button size="icon" variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(s)} aria-label={`Remove ${s.name}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <HoursCard settings={settings} onSaved={setSettings} />
      {portfolioOf && (() => {
        const svc = services.find((x) => x.id === portfolioOf);
        return svc ? <PortfolioDialog serviceId={svc.id} serviceName={svc.name} items={svc.portfolio} onClose={() => setPortfolioOf(null)} onChanged={load} /> : null;
      })()}
      {editing && <ServiceDialog service={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function HoursCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Settings>(settings);
  const [dayOff, setDayOff] = useState('');
  const [busy, setBusy] = useState(false);
  const setDay = (d: string, list: Interval[]) => setDraft((s) => ({ ...s, weeklyHours: { ...s.weeklyHours, [d]: list } }));
  const save = async () => {
    setBusy(true);
    try {
      const { settings: saved } = await send('/api/provider/settings', 'PUT', draft);
      setDraft(saved);
      onSaved(saved);
      toast({ title: 'Booking settings saved' });
    } catch (err) {
      toast({ title: 'Not saved', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Hours and booking settings</CardTitle>
        <CardDescription>Customers can book from 1 hour to 30 days ahead, only inside these hours.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="instant">Confirm bookings automatically</Label>
            <p className="text-xs text-muted-foreground">{draft.instantBooking ? 'Any free time is booked straight away.' : 'You accept each request. Requests you don\'t answer within 4 hours (or 1 hour before the time) lapse and are refunded.'}</p>
          </div>
          <Switch id="instant" checked={draft.instantBooking} onCheckedChange={(v) => setDraft((s) => ({ ...s, instantBooking: v }))} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="capacity">Customers you can serve at the same time</Label>
            <p className="text-xs text-muted-foreground">For example, the number of chairs or staff.</p>
          </div>
          <Input id="capacity" type="number" min={1} max={50} className="w-20" value={draft.capacity} onChange={(e) => setDraft((s) => ({ ...s, capacity: Number(e.target.value) }))} />
        </div>

        <div className="space-y-2">
          <Label>Opening hours</Label>
          {DAYS.map(([d, name]) => {
            const list = draft.weeklyHours[d] ?? [];
            const open = list.length > 0;
            return (
              <div key={d} className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
                <label className="flex w-32 items-center gap-2 text-sm">
                  <Checkbox checked={open} onCheckedChange={(v) => setDay(d, v ? [['09:00', '18:00']] : [])} />{name}
                </label>
                {!open && <span className="text-sm text-muted-foreground">Closed</span>}
                {list.map((iv, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <Input type="time" step={900} className="h-8 w-[6.5rem]" value={iv[0]} aria-label={`${name} opens`} onChange={(e) => setDay(d, list.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                    <span className="text-xs">to</span>
                    <Input type="time" step={900} className="h-8 w-[6.5rem]" value={iv[1]} aria-label={`${name} closes`} onChange={(e) => setDay(d, list.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                    {list.length > 1 && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDay(d, list.filter((_, j) => j !== i))} aria-label="Remove this period"><X className="h-3.5 w-3.5" /></Button>}
                  </span>
                ))}
                {open && list.length < 3 && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setDay(d, addBreak(list))}>
                    {list[list.length - 1][0] < '13:00' && list[list.length - 1][1] > '14:00' ? '+ Lunch break' : '+ More hours'}
                  </Button>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">To add a break (e.g. lunch), split the day into two periods, like 09:00–13:00 and 14:00–18:00.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dayoff">Days off</Label>
          <div className="flex gap-2">
            <Input id="dayoff" type="date" className="w-44" value={dayOff} onChange={(e) => setDayOff(e.target.value)} />
            <Button variant="outline" disabled={!dayOff} onClick={() => { setDraft((s) => ({ ...s, daysOff: Array.from(new Set([...s.daysOff, dayOff])).sort() })); setDayOff(''); }}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.daysOff.map((d) => (
              <Badge key={d} variant="secondary" className="gap-1">{dayLabel(d)}<button onClick={() => setDraft((s) => ({ ...s, daysOff: s.daysOff.filter((x) => x !== d) }))} aria-label={`Remove ${d}`}><X className="h-3 w-3" /></button></Badge>
            ))}
            {!draft.daysOff.length && <span className="text-xs text-muted-foreground">None. Existing bookings on a new day off aren&apos;t cancelled; move or cancel them from Bookings.</span>}
          </div>
        </div>

        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save hours and settings</Button>
      </CardContent>
    </Card>
  );
}

function ServiceDialog({ service, onClose, onSaved }: { service: Service | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [f, setF] = useState({
    name: service?.name ?? '', description: service?.description ?? '', price: service ? String(service.price) : '', priceFrom: service?.priceFrom ?? false,
    durationMin: String(service?.durationMin ?? 60), location: service?.location ?? 'shop', callOutFee: service?.callOutFee ? String(service.callOutFee) : '',
  });
  const [busy, setBusy] = useState(false);
  const checks = useFieldChecks<ServiceField>(SERVICE_RULES);
  const bind = (k: ServiceField) => ({
    value: f[k],
    onChange: (e: { target: { value: string } }) => {
      setF({ ...f, [k]: e.target.value });
      checks.changed(k, e.target.value);
    },
    onBlur: () => checks.blur(k, f[k]),
    'aria-invalid': checks.error(k) ? true : undefined,
  });
  const save = async () => {
    if (!checks.validateAll({ ...f, callOutFee: f.location === 'shop' ? '' : f.callOutFee })) return;
    setBusy(true);
    try {
      const body = { ...f, price: Number(f.price), durationMin: Number(f.durationMin), callOutFee: f.location === 'shop' ? null : Number(f.callOutFee || 0) };
      await send(service ? `/api/provider/services/${service.id}` : '/api/provider/services', service ? 'PATCH' : 'POST', body);
      toast({ title: service ? 'Service updated' : 'Service added', description: service ? undefined : 'Customers can now book it. Add photos of your past work so they can see what to expect.' });
      onSaved();
    } catch (err) {
      toast({ title: 'Not saved', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? 'Edit service' : 'Add a service'}</DialogTitle>
          <DialogDescription>Price, how long it takes and where it&apos;s done.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="sv-name">Name</Label><Input id="sv-name" {...bind('name')} placeholder="e.g. Haircut, Box braids, Phone screen repair" /><FieldError message={checks.error('name')} /></div>
          <div className="space-y-1"><Label htmlFor="sv-desc">Description (optional)</Label><Textarea id="sv-desc" rows={2} {...bind('description')} /><FieldError message={checks.error('description')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="sv-price">Price (₦)</Label><Input id="sv-price" type="number" min={100} {...bind('price')} /><FieldError message={checks.error('price')} /></div>
            <div className="space-y-1">
              <Label>How long it takes</Label>
              <Select value={f.durationMin} onValueChange={(v) => setF({ ...f, durationMin: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{durationLabel(d)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.priceFrom} onCheckedChange={(v) => setF({ ...f, priceFrom: !!v })} />Show as &ldquo;from&rdquo; this price (the job can cost more)</label>
          {f.priceFrom && <p className="text-xs text-muted-foreground">Customers pay this price when booking. Price-on-quote services, where you agree the price first, are coming next.</p>}
          <div className="space-y-1">
            <Label>Where it&apos;s done</Label>
            <Select value={f.location} onValueChange={(v) => setF({ ...f, location: v as Service['location'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PLACES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {f.location !== 'shop' && <div className="space-y-1"><Label htmlFor="sv-callout">Call-out fee for home visits (₦)</Label><Input id="sv-callout" type="number" min={0} {...bind('callOutFee')} placeholder="0" /><FieldError message={checks.error('callOutFee')} /></div>}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy || !f.name.trim() || !f.price}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{service ? 'Save' : 'Add service'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

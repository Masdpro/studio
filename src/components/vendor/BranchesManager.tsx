'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Pencil, Plus, Trash2, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { VendorBranch } from '@/lib/types';

const STATUSES = ['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable'] as const;
const NO_MARKET = 'none';
type Form = { name: string; streetAddress: string; city: string; country: string; locationTag: string; marketId: string; phone: string; operatingHours: string; status: string };
const EMPTY: Form = { name: '', streetAddress: '', city: '', country: 'Nigeria', locationTag: '', marketId: NO_MARKET, phone: '', operatingHours: '', status: 'Open' };

export function BranchesManager({ vendorName, mainAddress }: { vendorName?: string; mainAddress?: string }) {
  const { toast } = useToast();
  const [branches, setBranches] = useState<VendorBranch[]>([]);
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<VendorBranch | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/branches');
    if (res.ok) {
      const d = await res.json();
      setBranches(d.branches); setMarkets(d.markets); setTags(d.tags);
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const open = (b: VendorBranch | 'new') => {
    setEditing(b);
    setForm(b === 'new' ? EMPTY : {
      name: b.name, streetAddress: b.streetAddress, city: b.city, country: b.country, locationTag: b.locationTag ?? '',
      marketId: b.marketId ?? NO_MARKET, phone: b.phone ?? '', operatingHours: b.operatingHours ?? '', status: b.status ?? 'Open',
    });
  };
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, marketId: form.marketId === NO_MARKET ? '' : form.marketId };
      const res = await fetch(editing === 'new' ? '/api/vendor/branches' : `/api/vendor/branches/${(editing as VendorBranch).id}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not save the branch.');
      toast({ title: editing === 'new' ? 'Branch added' : 'Branch updated' });
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: VendorBranch) => {
    if (!window.confirm(`Remove the "${b.name}" branch? Past orders keep their pickup address.`)) return;
    const res = await fetch(`/api/vendor/branches/${b.id}`, { method: 'DELETE' });
    if (res.ok) { toast({ title: 'Branch removed' }); await load(); }
    else toast({ title: 'Could not remove branch', variant: 'destructive' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-2xl flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" />Branches</CardTitle>
          <CardDescription>
            Your products are shared across all branches. Customers see every branch on your store page and choose where to collect from at checkout.
          </CardDescription>
        </div>
        <Button onClick={() => open('new')}><Plus className="h-4 w-4 mr-1" />Add branch</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <span className="font-medium">Main branch</span>{vendorName ? ` · ${vendorName}` : ''}
          <p className="text-muted-foreground">{mainAddress || 'Set your main address in the Profile tab.'}</p>
        </div>
        {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto my-6" /> : branches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No additional branches yet.</p>
        ) : branches.map((b) => (
          <div key={b.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{b.name}</span>
                {b.status && <Badge variant={b.status === 'Open' ? 'default' : 'secondary'}>{b.status}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{b.streetAddress}, {b.city}, {b.country}</p>
              <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                {b.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.phone}</span>}
                {b.operatingHours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.operatingHours}</span>}
                {b.marketId && <span>In {markets.find((m) => m.id === b.marketId)?.name ?? 'a local market'}</span>}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => open(b)} aria-label={`Edit ${b.name}`}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(b)} aria-label={`Remove ${b.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Add a branch' : 'Edit branch'}</DialogTitle>
            <DialogDescription>We place the branch on the map from its address automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label htmlFor="b-name">Branch name</Label><Input id="b-name" value={form.name} onChange={set('name')} placeholder="e.g. Wuse 2 branch" /></div>
            <div><Label htmlFor="b-street">Street address</Label><Input id="b-street" value={form.streetAddress} onChange={set('streetAddress')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="b-city">City</Label><Input id="b-city" value={form.city} onChange={set('city')} /></div>
              <div><Label htmlFor="b-country">Country</Label><Input id="b-country" value={form.country} onChange={set('country')} /></div>
            </div>
            <div>
              <Label htmlFor="b-tag">Area (used by the city/area filter)</Label>
              <Input id="b-tag" list="branch-tags" value={form.locationTag} onChange={set('locationTag')} placeholder="e.g. Abuja" />
              <datalist id="branch-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div>
              <Label>Local market (optional)</Label>
              <Select value={form.marketId} onValueChange={(v) => setForm((f) => ({ ...f, marketId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MARKET}>Not inside a market</SelectItem>
                  {markets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="b-phone">Branch phone</Label><Input id="b-phone" value={form.phone} onChange={set('phone')} /></div>
              <div><Label htmlFor="b-hours">Opening hours</Label><Input id="b-hours" value={form.operatingHours} onChange={set('operatingHours')} placeholder="9 AM - 6 PM, Mon-Sat" /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

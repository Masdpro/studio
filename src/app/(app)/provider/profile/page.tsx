'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { useToast } from '@/hooks/use-toast';
import { SERVICE_CATEGORIES } from '@/lib/service-categories';
import { FieldError } from '@/components/forms/FieldError';
import { useFieldChecks } from '@/hooks/use-field-checks';
import { rules } from '@/lib/field-rules';
import { InfoTip } from '@/components/ui/info-tip';

type Checked = 'businessName' | 'tagline' | 'since' | 'contactEmail' | 'phone' | 'streetAddress' | 'area' | 'city';
const PROFILE_RULES = {
  businessName: rules.businessName,
  tagline: rules.maxLength(120, 'the short description'),
  since: rules.optionalYear,
  contactEmail: rules.email,
  phone: rules.phone,
  streetAddress: rules.streetAddress,
  area: rules.place,
  city: rules.place,
};

type Profile = {
  businessName: string; slug: string; category: string; tagline: string | null; about: string | null; contactEmail: string; phone: string;
  streetAddress: string; area: string; city: string; imageUrl: string | null; since: number | null;
};

/** The service business's public details: name, what it does, where, and the story customers read. */
export default function ProviderProfilePage() {
  const { toast } = useToast();
  const [f, setF] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const checks = useFieldChecks<Checked>(PROFILE_RULES);

  useEffect(() => {
    fetch('/api/provider/profile', { cache: 'no-store' }).then((r) => r.json()).then((d) => setF(d.provider ?? null));
  }, []);

  if (!f) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const set = (patch: Partial<Profile>) => setF((x) => (x ? { ...x, ...patch } : x));

  const text = (k: Checked) => String(f[k] ?? '');
  const save = async () => {
    const values = Object.fromEntries((Object.keys(PROFILE_RULES) as Checked[]).map((k) => [k, text(k)])) as Record<Checked, string>;
    if (!checks.validateAll(values)) {
      toast({ title: 'Check the highlighted fields', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/provider/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, since: f.since ?? '' }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Not saved.');
      setF(d.provider);
      toast({ title: 'Profile saved' });
    } catch (err) {
      toast({ title: 'Not saved', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof Profile, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`pf-${key}`}>{label}</Label>
      <Input
        id={`pf-${key}`}
        value={(f[key] as string | number | null) ?? ''}
        onChange={(e) => {
          set({ [key]: e.target.value } as Partial<Profile>);
          if (key in PROFILE_RULES) checks.changed(key as Checked, e.target.value);
        }}
        {...(key in PROFILE_RULES ? checks.bind(key as Checked, String(f[key] ?? '')) : {})}
        {...props}
      />
      {key in PROFILE_RULES ? <FieldError message={checks.error(key as Checked)} /> : null}
    </div>
  );

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-2">
      <Button variant="ghost" size="sm" asChild className="-ml-2"><Link href="/provider/dashboard"><ArrowLeft className="mr-1 h-4 w-4" />Dashboard</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle>Business profile<InfoTip>What customers see on your page: closebuy.ng/services/p/{f.slug}</InfoTip></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Business photo or logo</Label>
            <ImageUploadField value={f.imageUrl ?? ''} onChange={(v: string) => set({ imageUrl: v || null })} endpoint="/api/provider/upload" />
          </div>
          {field('businessName', 'Business name')}
          <div className="space-y-1">
            <Label>Kind of service</Label>
            <Select value={f.category} onValueChange={(v) => set({ category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {field('tagline', 'Short description', { placeholder: 'e.g. Braids, silk press & bridal glam', maxLength: 120 })}
          <div className="space-y-1">
            <Label htmlFor="pf-about">About your business</Label>
            <Textarea id="pf-about" rows={4} maxLength={1500} value={f.about ?? ''} onChange={(e) => set({ about: e.target.value })} placeholder="What you do, your experience, what customers can expect." />
          </div>
          {field('since', 'Year you started (optional)', { type: 'number', min: 1950, max: new Date().getFullYear(), placeholder: 'e.g. 2018' })}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('contactEmail', 'Contact email', { type: 'email' })}
            {field('phone', 'Mobile number', { type: 'tel' })}
          </div>
          {field('streetAddress', 'Business address')}
          <p className="-mt-2 text-xs text-muted-foreground">Only customers who book with you see the street address. Everyone else sees your area.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('area', 'Area')}
            {field('city', 'City')}
          </div>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}

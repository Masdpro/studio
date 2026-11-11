'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ALL_CATALOG_ITEMS, BUSINESS_TYPES, catalogImageFor, getBusinessType, type BusinessType } from '@/lib/product-catalog';
import {
  ArrowLeft, Baby, Check, ImageIcon, X, CupSoda, Loader2, Pill, Plus, Search, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, Trash2, UtensilsCrossed,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed, CupSoda, ShoppingBasket, Shirt, Smartphone, Sparkles, Pill, Sofa, Baby,
};

/** priceFrom: 'suggested' while the price box holds our suggested price, 'own' once the vendor types. */
type Picked = { key: string; name: string; description: string; category: string; price: string; priceFrom?: 'suggested' | 'own'; imageUrl: string; catalogImage?: string };
type Step = 'type' | 'groups' | 'items' | 'details';

const keyOf = (category: string, name: string) => `${category}::${name}`.toLowerCase();

/** Extra words people use for each kind of business, so the search box can find business types too. */
const TYPE_WORDS: Record<string, string> = {
  food: 'food restaurant buka canteen caterer catering eatery kitchen bakery cafe fast food chops',
  drinks: 'drinks beverage bar lounge juice drink shop wine liquor beer',
  groceries: 'grocery groceries supermarket provision store market stall shop foodstuff mini mart',
  fashion: 'fashion clothing clothes boutique tailor tailoring fabric shoes bags wears',
  electronics: 'phone phones electronics gadgets gadget accessories computer laptop repairs repair solar',
  beauty: 'beauty cosmetics hair salon barber barbing makeup skincare spa nails personal care',
  health: 'pharmacy chemist drugs medicine patent medicine health store',
  home: 'home kitchen furniture household appliances bedding',
  kids: 'baby kids children toys school supplies stationery',
};

/**
 * Quick add: choose the kind of business, the groups of products, tick the products,
 * then give each one a price and a photo. Only complete products are listed.
 */
export function QuickAddProducts({ existingNames, onAdded }: { existingNames: string[]; onAdded: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<BusinessType | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [custom, setCustom] = useState('');
  const [finder, setFinder] = useState('');
  const [saving, setSaving] = useState(false);
  // Suggested prices for catalog products, by lower-cased name (kept up to date every quarter).
  const [suggested, setSuggested] = useState<Record<string, number>>({});

  const existing = useMemo(() => new Set(existingNames.map((n) => n.trim().toLowerCase())), [existingNames]);

  useEffect(() => {
    fetch('/api/vendor/catalog-prices')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.prices && setSuggested(d.prices))
      .catch(() => {});
  }, []);

  // Fill in the suggested price for picked products the vendor hasn't priced yet.
  useEffect(() => {
    if (!Object.keys(suggested).length) return;
    setPicked((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        const s = suggested[p.name.trim().toLowerCase().replace(/\s+/g, ' ')];
        if (p.priceFrom === 'own' || (p.price && p.priceFrom !== 'suggested')) return p;
        if (s && p.price !== String(s)) return (changed = true), { ...p, price: String(s), priceFrom: 'suggested' as const };
        if (!s && p.priceFrom === 'suggested') return (changed = true), { ...p, price: '', priceFrom: undefined };
        return p;
      });
      return changed ? next : prev;
    });
  }, [suggested, picked]);

  // Start from the business type the vendor chose last time.
  useEffect(() => {
    fetch('/api/vendor/business-type')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const t = getBusinessType(d?.businessType);
        if (t) {
          setType(t);
          setStep('groups');
        }
      })
      .catch(() => {});
  }, []);

  function chooseType(t: BusinessType) {
    setType(t);
    setGroupIds([]);
    setStep('groups');
    fetch('/api/vendor/business-type', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessType: t.id }) }).catch(() => {});
  }

  const groups = useMemo(() => (type ? type.groups.filter((g) => groupIds.includes(g.id)) : []), [type, groupIds]);
  const pickedKeys = useMemo(() => new Set(picked.map((p) => p.key)), [picked]);

  const make = (category: string, name: string, description: string, image?: string): Picked => ({
    key: keyOf(category, name),
    name,
    description,
    category,
    price: '',
    imageUrl: image ?? '',
    catalogImage: image,
  });

  function toggle(category: string, name: string, description: string, image?: string) {
    const key = keyOf(category, name);
    setPicked((prev) => (prev.some((p) => p.key === key) ? prev.filter((p) => p.key !== key) : [...prev, make(category, name, description, image)]));
  }

  function addCustomName(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (name.length < 2) return;
    const category = groups[0]?.label ?? type?.groups[0]?.label ?? 'Other';
    const key = keyOf(category, name);
    if (!pickedKeys.has(key)) setPicked((prev) => [...prev, make(category, name, name, catalogImageFor(name))]);
  }

  function addCustom() {
    addCustomName(custom);
    setCustom('');
  }

  // Search box at the top: finds any catalog product (all business types) or adds what was typed.
  const fq = finder.trim().toLowerCase();
  const finderHits = useMemo(() => {
    if (fq.length < 2) return [];
    const words = fq.split(/\s+/);
    const seen = new Set<string>();
    return ALL_CATALOG_ITEMS.filter((i) => {
      const hay = `${i.name} ${i.groupLabel}`.toLowerCase();
      if (!words.every((w) => hay.includes(w)) || seen.has(i.name.toLowerCase())) return false;
      seen.add(i.name.toLowerCase());
      return true;
    })
      .sort((a, b) => Number(b.typeId === type?.id) - Number(a.typeId === type?.id) || Number(!!b.image) - Number(!!a.image))
      .slice(0, 30);
  }, [fq, type]);
  const exactHit = finderHits.some((i) => i.name.toLowerCase() === fq);
  const typeHits = useMemo(() => {
    if (fq.length < 2) return [];
    const words = fq.split(/\s+/);
    return BUSINESS_TYPES.filter((t) => {
      const hay = `${t.label} ${t.blurb} ${TYPE_WORDS[t.id] ?? ''} ${t.groups.map((g) => g.label).join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [fq]);

  const update = (key: string, patch: Partial<Picked>) => setPicked((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const complete = (p: Picked) => p.name.trim().length >= 2 && Number(p.price.replace(/,/g, '')) > 0 && !!p.imageUrl;
  const pickedNames = useMemo(() => new Set(picked.map((p) => p.name.toLowerCase())), [picked]);
  const ready = picked.filter(complete);

  async function save() {
    if (!ready.length) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: ready.map((p) => ({ name: p.name.trim(), description: p.description, category: p.category, price: Number(p.price.replace(/,/g, '')), imageUrl: p.imageUrl })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Could not add products', description: d.error ?? 'Please try again.' });
        return;
      }
      const done = new Set(ready.map((p) => p.key));
      const left = picked.filter((p) => !done.has(p.key));
      setPicked(left);
      toast({
        title: `${d.created} product${d.created === 1 ? '' : 's'} listed`,
        description: left.length ? `${left.length} still need a price or photo.` : 'They are now live in your shop.',
      });
      if (!left.length) setStep('items');
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  const Thumb = ({ src, alt }: { src?: string; alt: string }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="lazy" className="h-10 w-10 shrink-0 rounded object-cover" />
    ) : (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      </span>
    );

  const onTypeStep = step === 'type' || !type;
  const finderBox = (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        className="pl-8 pr-8"
        placeholder={onTypeStep ? 'Your business or a product, e.g. pharmacy' : 'Type a product, e.g. Indomie, jollof, iPhone 13'}
        aria-label={onTypeStep ? 'Find your business type or a product' : 'Find or add a product'}
        value={finder}
        onChange={(e) => setFinder(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (onTypeStep && typeHits.length === 1) {
              chooseType(typeHits[0]);
            } else if (!exactHit) {
              addCustomName(finder);
            }
            setFinder('');
          }
        }}
      />
      {finder && (
        <button type="button" aria-label="Clear search" onClick={() => setFinder('')} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const pickedBar =
    picked.length > 0 && step !== 'details' ? (
      <Button className="w-full" onClick={() => { setFinder(''); setStep('details'); }}>
        Next: set prices ({picked.length})
      </Button>
    ) : null;

  // ---- Search results (shown over any step while the vendor is typing) ----
  if (fq.length >= 2) {
    return (
      <div className="space-y-3">
        {finderBox}
        <ul className="max-h-[55vh] divide-y overflow-y-auto rounded-md border">
          {typeHits.map((t) => {
            const Icon = ICONS[t.icon] ?? ShoppingBasket;
            return (
              <li key={`type-${t.id}`}>
                <button
                  type="button"
                  onClick={() => { chooseType(t); setFinder(''); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <span>
                    <span className="block font-medium">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">Business type · {t.blurb}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {!exactHit && (
            <li>
              <button
                type="button"
                onClick={() => { addCustomName(finder); setFinder(''); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10">
                  <Plus className="h-4 w-4 text-primary" />
                </span>
                <span>
                  Add <span className="font-medium">“{finder.trim()}”</span> as a new product
                </span>
              </button>
            </li>
          )}
          {finderHits.map((i) => {
            const listed = existing.has(i.name.toLowerCase());
            const on = pickedNames.has(i.name.toLowerCase());
            const id = `qf-${i.typeId}-${i.slug}`;
            return (
              <li key={id} className={cn('flex items-center gap-3 px-3 py-2', listed && 'opacity-60')}>
                <Checkbox
                  id={id}
                  disabled={listed}
                  checked={on}
                  onCheckedChange={() =>
                    on ? setPicked((prev) => prev.filter((p) => p.name.toLowerCase() !== i.name.toLowerCase())) : toggle(i.groupLabel, i.name, i.description, i.image)
                  }
                />
                <Thumb src={i.image} alt={i.name} />
                <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">
                  {i.name}
                  <span className="block text-xs text-muted-foreground">{listed ? 'Already in your shop' : i.groupLabel}</span>
                </Label>
              </li>
            );
          })}
        </ul>
        {pickedBar}
      </div>
    );
  }

  // ---- Step 1: business type ----
  if (step === 'type' || !type) {
    return (
      <div className="space-y-3">
        {finderBox}
        <p className="text-sm text-muted-foreground">What kind of business do you run? Pick one below, or type it in the box above.</p>
        <div className="grid grid-cols-2 gap-2">
          {BUSINESS_TYPES.map((t) => {
            const Icon = ICONS[t.icon] ?? ShoppingBasket;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => chooseType(t)}
                className={cn('flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5', type?.id === t.id && 'border-primary bg-primary/5')}
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium leading-tight">{t.label}</span>
                <span className="text-xs leading-tight text-muted-foreground">{t.blurb}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const Back = ({ to, label }: { to: Step; label: string }) => (
    <button type="button" onClick={() => setStep(to)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </button>
  );

  // ---- Step 2: groups ----
  if (step === 'groups') {
    return (
      <div className="space-y-3">
        {finderBox}
        <Back to="type" label="Change business type" />
        <p className="text-sm">
          <span className="font-medium">{type.label}.</span> <span className="text-muted-foreground">What do you sell? Pick all that apply.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {type.groups.map((g) => {
            const on = groupIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => setGroupIds((ids) => (on ? ids.filter((i) => i !== g.id) : [...ids, g.id]))}
                className={cn('flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {g.label}
              </button>
            );
          })}
        </div>
        <Button className="w-full" disabled={!groupIds.length} onClick={() => setStep('items')}>
          Next: choose products
        </Button>
        {pickedBar}
      </div>
    );
  }

  // ---- Step 3: tick products ----
  if (step === 'items') {
    return (
      <div className="space-y-3">
        {finderBox}
        <Back to="groups" label="Change groups" />
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {groups.map((g) => {
            const items = g.items;
            if (!items.length) return null;
            const selectable = items.filter((i) => !existing.has(i.name.toLowerCase()));
            const allOn = selectable.length > 0 && selectable.every((i) => pickedKeys.has(keyOf(g.label, i.name)));
            return (
              <div key={g.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{g.label}</h4>
                  {selectable.length > 0 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        if (allOn) {
                          const keys = new Set(selectable.map((i) => keyOf(g.label, i.name)));
                          setPicked((prev) => prev.filter((p) => !keys.has(p.key)));
                        } else {
                          setPicked((prev) => [
                            ...prev,
                            ...selectable
                              .filter((i) => !pickedKeys.has(keyOf(g.label, i.name)))
                              .map((i) => make(g.label, i.name, i.description, i.image)),
                          ]);
                        }
                      }}
                    >
                      {allOn ? 'Clear' : 'Select all'}
                    </button>
                  )}
                </div>
                <ul className="divide-y rounded-md border">
                  {items.map((i) => {
                    const listed = existing.has(i.name.toLowerCase());
                    const id = `qa-${g.id}-${i.name}`;
                    return (
                      <li key={i.name} className={cn('flex items-center gap-3 px-3 py-2', listed && 'opacity-60')}>
                        <Checkbox id={id} disabled={listed} checked={pickedKeys.has(keyOf(g.label, i.name))} onCheckedChange={() => toggle(g.label, i.name, i.description, i.image)} />
                        <Thumb src={i.image} alt={i.name} />
                        <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">
                          {i.name}
                          {listed && <span className="ml-2 text-xs text-muted-foreground">Already in your shop</span>}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Something not listed? Type it here" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())} />
          <Button type="button" variant="outline" onClick={addCustom} disabled={custom.trim().length < 2} aria-label="Add product">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button className="w-full" disabled={!picked.length} onClick={() => setStep('details')}>
          Next: set prices ({picked.length})
        </Button>
      </div>
    );
  }

  // ---- Step 4: price and photo for each ----
  return (
    <div className="space-y-3">
      <Back to="items" label="Choose more products" />
      <p className="text-sm text-muted-foreground">
        Add a price for each product. Where we have one, we&apos;ve filled in a suggested price; change it to your own if yours is different. Most come with a photo you can use straight away; tap the photo to use your own instead. Products without a photo need one before they can be listed.{' '}
        <a href="/credits" target="_blank" rel="noopener noreferrer" className="underline">
          Photo credits
        </a>
      </p>
      <ul className="space-y-3">
        {picked.map((p) => (
          <li key={p.key} className={cn('min-w-0 space-y-2 rounded-md border p-3', complete(p) && 'border-green-300 bg-green-50/40')}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Input aria-label="Product name" value={p.name} onChange={(e) => update(p.key, { name: e.target.value })} className="h-8 font-medium" />
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Remove ${p.name}`} onClick={() => setPicked((prev) => prev.filter((x) => x.key !== p.key))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₦</span>
              <Input aria-label={`Price for ${p.name}`} inputMode="decimal" placeholder="Price" value={p.price} onChange={(e) => update(p.key, { price: e.target.value.replace(/[^\d.,]/g, ''), priceFrom: 'own' })} className="h-9" />
            </div>
            {p.priceFrom === 'suggested' && <p className="text-xs text-muted-foreground">Suggested price. Enter your own if yours is different.</p>}
            <ImageUploadField value={p.imageUrl} onChange={(url) => update(p.key, { imageUrl: url })} endpoint="/api/vendor/upload" emptyLabel="Photo required" />
            {p.catalogImage && p.imageUrl === p.catalogImage && (
              <p className="text-xs text-muted-foreground">Sample photo. Upload your own anytime to show exactly what you sell.</p>
            )}
            {p.catalogImage && p.imageUrl !== p.catalogImage && (
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => update(p.key, { imageUrl: p.catalogImage! })}>
                Use the sample photo instead
              </button>
            )}
          </li>
        ))}
      </ul>
      <Button className="w-full" disabled={!ready.length || saving} onClick={save}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {ready.length === picked.length ? `List ${ready.length} product${ready.length === 1 ? '' : 's'}` : `List ${ready.length} of ${picked.length} (${picked.length - ready.length} need a price or photo)`}
      </Button>
    </div>
  );
}

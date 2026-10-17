'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, ExternalLink, MapPin, Navigation, Phone, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SafeImage } from '@/components/ui/safe-image';
import { ProductCard } from '@/components/product/ProductCard';
import { getBranchChoice, setBranchChoice } from '@/lib/branch-choice';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { Market, Product, Vendor, VendorBranch } from '@/lib/types';

type Place = {
  key: string;
  image?: string;
  title: string;
  address: string;
  phone?: string;
  hours?: string;
  status?: Vendor['status'];
  market?: Market;
  lat?: number;
  lon?: number;
  main?: boolean;
};

const mapsLink = (p: Place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.lat && p.lon ? `${p.lat},${p.lon}` : p.address)}`;

/** A vendor's store page: who they are, every branch they trade from, and their products. */
export function VendorStorefront({
  vendor, branches, products: allProducts, markets, back,
}: {
  vendor: Vendor; branches: VendorBranch[]; products: Product[]; markets: Market[]; back: { href: string; label: string };
}) {
  const marketOf = (id?: string) => markets.find((m) => m.id === id);
  const places: Place[] = [
    {
      key: 'main', main: true, image: vendor.imageUrl, title: 'Main branch', address: `${vendor.streetAddress}, ${vendor.city}, ${vendor.country}`,
      phone: vendor.phone, hours: vendor.operatingHours, status: vendor.status, market: marketOf(vendor.marketId), lat: vendor.latitude, lon: vendor.longitude,
    },
    ...branches.map((b) => ({
      key: b.id, image: b.imageUrl, title: b.name, address: `${b.streetAddress}, ${b.city}, ${b.country}`, phone: b.phone, hours: b.operatingHours,
      status: b.status, market: marketOf(b.marketId), lat: b.latitude, lon: b.longitude,
    })),
  ];

  const unavailable = (p: Place) => p.status === 'Closed' || p.status === 'Temporarily Unavailable';
  const [selected, setSelected] = useState('main');
  const products = allProducts.filter((p) => !p.branchId || p.branchId === selected);
  useEffect(() => {
    const saved = getBranchChoice()[vendor.id];
    const place = places.find((p) => p.key === saved);
    if (place && !unavailable(place)) setSelected(place.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor.id]);
  const choose = (p: Place) => {
    if (unavailable(p)) return;
    setSelected(p.key);
    setBranchChoice(vendor.id, p.key);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const current = places.find((p) => p.key === selected) ?? places[0];
  const multi = places.length > 1;

  return (
    <div className="container mx-auto max-w-6xl py-2">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={back.href}><ArrowLeft className="h-4 w-4 mr-2" />{back.label}</Link>
      </Button>

      {vendor.imageUrl && (
        <div className="relative mb-6 h-44 w-full overflow-hidden rounded-xl bg-muted sm:h-64">
          <SafeImage src={vendor.imageUrl} alt={`${vendor.businessName} storefront`} fill priority sizes="(max-width: 1152px) 100vw, 1152px" className="object-cover" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />{vendor.businessName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {places.length > 1 ? `${places.length} branches` : '1 location'} · {products.length} product{products.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href={`/vendor/${vendor.id}/profile`}>Vendor profile</Link></Button>
        </div>
      </div>

      <section className="mb-10" aria-label="Branches">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />{places.length > 1 ? 'Branches' : 'Location'}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((p) => (
            <Card key={p.key} className={cn('overflow-hidden', multi && p.key === selected && 'border-primary ring-2 ring-primary/30')}>
              <div className="relative aspect-[16/9] bg-muted">
                {p.image ? (
                  <SafeImage src={p.image} alt={`${p.title} storefront`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10"><Store className="h-12 w-12 text-primary/60" aria-hidden /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 space-y-1 p-4 text-white">
                  <h3 className="text-lg font-bold leading-tight">{p.title}</h3>
                  {p.hours && <p className="flex items-center gap-1.5 text-xs"><Clock className="h-3.5 w-3.5 shrink-0" />{p.hours}</p>}
                  <p className="flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="line-clamp-1">{p.address}</span></p>
                </div>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-end gap-2">
                  {p.status === 'Open' ? (
                    <Button size="sm" className="h-7 px-3" variant={p.key === selected ? 'secondary' : 'default'} onClick={() => choose(p)} aria-pressed={p.key === selected}>
                      {p.key === selected && multi && <Check className="h-3.5 w-3.5 mr-1" />}Open
                    </Button>
                  ) : p.status ? <Badge variant="secondary">{p.status}</Badge> : null}
                </div>
                {p.market && (
                  <p className="text-sm">In <Link className="underline text-primary" href={`/market/${p.market.id}`}>{p.market.name}</Link></p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                </div>
                <div className="pt-1">
                <Button variant="outline" size="sm" asChild>
                  <a href={mapsLink(p)} target="_blank" rel="noopener noreferrer"><Navigation className="h-3.5 w-3.5 mr-1.5" />Directions</a>
                </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <h2 id="products" className="text-lg font-semibold mb-3 scroll-mt-20">Products</h2>
      {multi && (
        <p className="text-sm mb-4 rounded-md bg-muted px-3 py-2">
          Ordering from <span className="font-semibold">{current.title}</span> · {current.address}
        </p>
      )}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              vendorName={vendor.businessName}
              vendorStreetAddress={vendor.streetAddress}
              vendorCity={vendor.city}
              vendorCountry={vendor.country}
              orderBranch={multi ? { branchId: current.key, name: current.title, unavailable: unavailable(current) } : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-lg font-semibold mb-1">No products yet</p>
          <p className="text-muted-foreground">{vendor.businessName} hasn&apos;t listed any products yet.</p>
        </div>
      )}
    </div>
  );
}

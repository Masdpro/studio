import Link from 'next/link';
import { ArrowLeft, Clock, ExternalLink, MapPin, Navigation, Phone, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from '@/components/product/ProductCard';
import type { Market, Product, Vendor, VendorBranch } from '@/lib/types';

type Place = {
  key: string;
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
  vendor, branches, products, markets, back,
}: {
  vendor: Vendor; branches: VendorBranch[]; products: Product[]; markets: Market[]; back: { href: string; label: string };
}) {
  const marketOf = (id?: string) => markets.find((m) => m.id === id);
  const places: Place[] = [
    {
      key: 'main', main: true, title: 'Main branch', address: `${vendor.streetAddress}, ${vendor.city}, ${vendor.country}`,
      phone: vendor.phone, hours: vendor.operatingHours, status: vendor.status, market: marketOf(vendor.marketId), lat: vendor.latitude, lon: vendor.longitude,
    },
    ...branches.map((b) => ({
      key: b.id, title: b.name, address: `${b.streetAddress}, ${b.city}, ${b.country}`, phone: b.phone, hours: b.operatingHours,
      status: b.status, market: marketOf(b.marketId), lat: b.latitude, lon: b.longitude,
    })),
  ];

  return (
    <div className="container mx-auto max-w-6xl py-2">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={back.href}><ArrowLeft className="h-4 w-4 mr-2" />{back.label}</Link>
      </Button>

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
          {vendor.externalStoreUrl && (
            <Button variant="outline" asChild><Link href={`/vendor/${vendor.id}/store`}><ExternalLink className="h-4 w-4 mr-2" />Website</Link></Button>
          )}
          <Button variant="outline" asChild><Link href={`/vendor/${vendor.id}/profile`}>Vendor profile</Link></Button>
        </div>
      </div>

      <section className="mb-10" aria-label="Branches">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />{places.length > 1 ? 'Branches' : 'Location'}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((p) => (
            <Card key={p.key}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.title}</span>
                  {p.status && <Badge variant={p.status === 'Open' ? 'default' : 'secondary'}>{p.status}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{p.address}</p>
                {p.market && (
                  <p className="text-sm">In <Link className="underline text-primary" href={`/market/${p.market.id}`}>{p.market.name}</Link></p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                  {p.hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.hours}</span>}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={mapsLink(p)} target="_blank" rel="noopener noreferrer"><Navigation className="h-3.5 w-3.5 mr-1.5" />Directions</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <h2 className="text-lg font-semibold mb-3">Products</h2>
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

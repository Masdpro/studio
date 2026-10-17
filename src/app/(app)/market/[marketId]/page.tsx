import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMarketById } from '@/lib/services/markets';
import { getVendorsByMarketId, getVendorById } from '@/lib/services/vendors';
import { getBranchesByMarketId } from '@/lib/services/branches';
import { SafeImage } from '@/components/ui/safe-image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, Clock, MapPin, Store } from 'lucide-react';

export default async function MarketPage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await params;
  const market = await getMarketById(marketId);
  if (!market) notFound();

  const [vendorsHere, branchesHere] = await Promise.all([getVendorsByMarketId(marketId), getBranchesByMarketId(marketId)]);
  const owners = new Map<string, Awaited<ReturnType<typeof getVendorById>>>();
  for (const id of new Set(branchesHere.map((b) => b.vendorId))) owners.set(id, await getVendorById(id));
  // Main stores and branches that trade in this market, each shown as a photo tile.
  const stores = [
    ...vendorsHere.map((s) => ({
      key: s.id, href: `/market/${marketId}/vendor/${s.id}`, name: s.businessName, image: s.imageUrl, hours: s.operatingHours,
      address: [s.streetAddress, s.city].filter(Boolean).join(', '),
    })),
    ...branchesHere.filter((b) => owners.get(b.vendorId)).map((b) => ({
      key: `branch-${b.id}`, href: `/market/${marketId}/vendor/${b.vendorId}`, name: `${owners.get(b.vendorId)!.businessName} · ${b.name}`,
      image: b.imageUrl, hours: b.operatingHours, address: [b.streetAddress, b.city].filter(Boolean).join(', '),
    })),
  ];

  return (
    <div className="container mx-auto max-w-5xl py-2">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/?view=markets">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Local Markets
        </Link>
      </Button>

      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl mb-6">
        <SafeImage
          src={market.imageUrl}
          alt={market.name}
          fill
          className="object-cover"
          data-ai-hint={market.aiHint || 'local market'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-90">Local Market</p>
            <h1 className="text-2xl md:text-4xl font-bold">{market.name}</h1>
            <div className="flex items-center gap-1.5 text-sm mt-2 opacity-90">
              <MapPin className="h-4 w-4" />
              <span>{market.locationTag}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mb-8">{market.description}</p>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Store className="h-6 w-6 text-primary" />
        Stores in {market.name}
      </h2>

      {stores.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {stores.map((store) => (
            <Link key={store.key} href={store.href} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted transition-all group-hover:border-primary group-hover:shadow-lg">
                {store.image ? (
                  <SafeImage
                    src={store.image}
                    alt={`${store.name} storefront`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                    <Store className="h-14 w-14 text-primary/60" aria-hidden />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <ChevronRight className="absolute right-3 top-3 h-5 w-5 rounded-full bg-black/40 p-0.5 text-white" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 space-y-1 p-4 text-white">
                  <h3 className="text-lg font-bold leading-tight break-words">{store.name}</h3>
                  {store.hours && (
                    <p className="flex items-center gap-1.5 text-xs opacity-95">
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="line-clamp-1">{store.hours}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs opacity-95">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="line-clamp-1">{store.address}</span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-lg font-semibold mb-1">No stores yet</p>
          <p className="text-muted-foreground">Check back soon — new stalls are being added to {market.name}.</p>
        </div>
      )}
    </div>
  );
}

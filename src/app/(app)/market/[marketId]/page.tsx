import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMarketById } from '@/lib/services/markets';
import { getVendorsByMarketId } from '@/lib/services/vendors';
import { SafeImage } from '@/components/ui/safe-image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, MapPin, Store } from 'lucide-react';

export default async function MarketPage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await params;
  const market = await getMarketById(marketId);
  if (!market) notFound();

  const stores = await getVendorsByMarketId(marketId);

  return (
    <div className="container mx-auto max-w-5xl py-2">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/">
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
            <Link key={store.id} href={`/market/${marketId}/vendor/${store.id}`}>
              <div className="h-full p-6 flex flex-col items-start gap-2 text-left border rounded-lg hover:border-primary hover:shadow-md transition-all">
                <div className="w-full flex justify-between items-center">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{store.businessName}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{store.operatingHours}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                  <MapPin className="h-3 w-3" />
                  <span>{store.streetAddress}</span>
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

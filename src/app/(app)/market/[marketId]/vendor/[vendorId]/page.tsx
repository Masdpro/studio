import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMarketById } from '@/lib/services/markets';
import { getVendorById } from '@/lib/services/vendors';
import { getProductsByVendor } from '@/lib/services/products';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Store } from 'lucide-react';

export default async function MarketVendorPage({
  params,
}: {
  params: Promise<{ marketId: string; vendorId: string }>;
}) {
  const { marketId, vendorId } = await params;
  const [market, vendor] = await Promise.all([getMarketById(marketId), getVendorById(vendorId)]);
  if (!market || !vendor) notFound();

  const products = await getProductsByVendor(vendorId);

  return (
    <div className="container mx-auto max-w-6xl py-2">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/market/${marketId}`}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to {market.name}
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            {vendor.businessName}
          </h1>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
            <MapPin className="h-4 w-4" />
            {vendor.streetAddress}, {vendor.city}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/vendor/${vendor.id}/profile`}>View Full Vendor Profile</Link>
        </Button>
      </div>

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
          <p className="text-muted-foreground">{vendor.businessName} hasn't listed any products yet.</p>
        </div>
      )}
    </div>
  );
}

import { notFound } from 'next/navigation';
import { getMarketById, getMarkets } from '@/lib/services/markets';
import { getVendorById } from '@/lib/services/vendors';
import { getProductsByVendor } from '@/lib/services/products';
import { getBranchesByVendor } from '@/lib/services/branches';
import { VendorStorefront } from '@/components/vendor/VendorStorefront';

export default async function MarketVendorPage({
  params,
}: {
  params: Promise<{ marketId: string; vendorId: string }>;
}) {
  const { marketId, vendorId } = await params;
  const [market, vendor] = await Promise.all([getMarketById(marketId), getVendorById(vendorId)]);
  if (!market || !vendor) notFound();
  const [products, branches, markets] = await Promise.all([getProductsByVendor(vendorId), getBranchesByVendor(vendorId), getMarkets()]);
  return (
    <VendorStorefront vendor={vendor} branches={branches} products={products} markets={markets} back={{ href: `/market/${marketId}`, label: `Back to ${market.name}` }} />
  );
}

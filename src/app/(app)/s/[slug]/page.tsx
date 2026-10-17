import { notFound } from 'next/navigation';
import { getVendorBySlug } from '@/lib/services/vendors';
import { getProductsByVendor } from '@/lib/services/products';
import { getBranchesByVendor } from '@/lib/services/branches';
import { getMarkets } from '@/lib/services/markets';
import { tradingBlockReason } from '@/lib/verification';
import { VendorStorefront } from '@/components/vendor/VendorStorefront';

/** A vendor's own Closebuy link (/s/<name>): shows only that vendor's products. */
export default async function VendorLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug.toLowerCase());
  if (!vendor) notFound();
  // Stores that haven't been approved yet aren't public.
  if (tradingBlockReason(vendor.id)) notFound();
  const [products, branches, markets] = await Promise.all([getProductsByVendor(vendor.id), getBranchesByVendor(vendor.id), getMarkets()]);
  return <VendorStorefront vendor={vendor} branches={branches} products={products} markets={markets} back={{ href: '/', label: 'Browse all Closebuy stores' }} />;
}

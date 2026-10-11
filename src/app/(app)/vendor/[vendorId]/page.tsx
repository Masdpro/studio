import { notFound } from 'next/navigation';
import { getVendorById } from '@/lib/services/vendors';
import { getProductsByVendor } from '@/lib/services/products';
import { getBranchesByVendor } from '@/lib/services/branches';
import { getMarkets } from '@/lib/services/markets';
import { VendorStorefront } from '@/components/vendor/VendorStorefront';

export default async function VendorPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const vendor = await getVendorById(vendorId);
  if (!vendor) notFound();
  const [products, branches, markets] = await Promise.all([getProductsByVendor(vendorId), getBranchesByVendor(vendorId), getMarkets()]);
  return <VendorStorefront vendor={vendor} branches={branches} products={products} markets={markets} back={{ href: '/', label: 'Back to home' }} />;
}

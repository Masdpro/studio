import { notFound, redirect } from 'next/navigation';
import { getVendorById } from '@/lib/services/vendors';

/** Vendors are shown inside Closebuy only: this old address goes to the vendor's Closebuy store page. */
export default async function VendorStoreRedirect({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const vendor = await getVendorById(vendorId);
  if (!vendor) notFound();
  redirect(vendor.slug ? `/s/${vendor.slug}` : `/vendor/${vendor.id}/profile`);
}

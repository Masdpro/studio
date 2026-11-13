/** Which side of Closebuy a page belongs to: shopping for products, or booking services. */
export type Side = 'products' | 'services';

const SERVICE_PATHS = ['/services', '/bookings', '/vendor/bookings', '/vendor/dashboard/services'];

export function sideForPath(pathname: string | null | undefined): Side {
  if (!pathname) return 'products';
  return SERVICE_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`)) ? 'services' : 'products';
}

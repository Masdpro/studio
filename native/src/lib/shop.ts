import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useCatalog } from './query';
import type { Branch, Product, Vendor } from './types';

export type ShopPage = { vendor: Vendor; products: Product[]; branches: Branch[] };

/** One shop's page: the shop, its branches and every product (branch-only ones included). */
export const useShop = (vendorId?: string) =>
  useQuery({ queryKey: ['shop', vendorId], queryFn: () => api<ShopPage>(`/api/mobile/catalog?vendor=${encodeURIComponent(vendorId!)}`), enabled: !!vendorId });

/** A product, from the home catalog or (for branch-only products) its shop's page. */
export function useProduct(id: string, vendorId?: string) {
  const cat = useCatalog();
  const fromCat = cat.data?.products.find((p) => p.id === id);
  const shop = useShop(fromCat ? undefined : vendorId);
  const product = fromCat ?? shop.data?.products.find((p) => p.id === id);
  const vendor = cat.data?.vendors.find((v) => v.id === (product?.vendorId ?? vendorId)) ?? shop.data?.vendor;
  return { product, vendor, loading: cat.isLoading || shop.isLoading, error: cat.error ?? shop.error };
}

/** Units left for a colour/size choice (undefined = not counted). */
export function stockFor(p: Product, color?: string, size?: string): number | undefined {
  if (p.variantStock?.length && (p.colors?.length || p.sizes?.length)) {
    const rows = p.variantStock.filter((r) => (!p.colors?.length || r.color === color) && (!p.sizes?.length || r.size === size));
    if ((p.colors?.length && !color) || (p.sizes?.length && !size)) return p.stock;
    return rows.reduce((s, r) => s + r.quantity, 0);
  }
  return p.stock;
}

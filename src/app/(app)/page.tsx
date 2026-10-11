import { Suspense } from 'react';
import HomePageClient from './HomePageClient';
import { getProducts } from '@/lib/services/products';
import { getVendors } from '@/lib/services/vendors';
import { getMarkets } from '@/lib/services/markets';
import { getAllBranches } from '@/lib/services/branches';

// Server component: fetches from the database (falling back to bundled
// sample data if the tables are empty) and hands the results to the
// client component, which owns all the interactive filtering/search state.
export default async function HomePage() {
  const [products, vendors, markets, branches] = await Promise.all([
    getProducts(),
    getVendors(),
    getMarkets(),
    getAllBranches(),
  ]);

  return (
    <Suspense>
      <HomePageClient initialProducts={products} initialVendors={vendors} initialMarkets={markets} initialBranches={branches} />
    </Suspense>
  );
}

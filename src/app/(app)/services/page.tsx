import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ServicesHome } from '@/components/services-ui/ServicesHome';
import { listedProviders } from '@/lib/services/providers';

export const metadata: Metadata = { title: 'Closebuy: book trusted professionals near you' };

// Always read the latest businesses, services and free times from the database.
export const dynamic = 'force-dynamic';

export default function ServicesPage() {
  const providers = listedProviders();
  return (
    <Suspense>
      <ServicesHome providers={providers} />
    </Suspense>
  );
}

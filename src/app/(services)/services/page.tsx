import type { Metadata } from 'next';
import { ServicesHome } from '@/components/services-ui/ServicesHome';

export const metadata: Metadata = { title: 'Closebuy Services: book trusted professionals near you' };

export default function ServicesPage() {
  return <ServicesHome />;
}

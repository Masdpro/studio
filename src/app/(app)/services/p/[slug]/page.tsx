import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { providerBySlug } from '@/lib/services-preview';
import { ProviderProfile } from '@/components/services-ui/ProviderProfile';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = providerBySlug((await params).slug);
  return { title: p ? `${p.name} · Closebuy Services` : 'Closebuy Services' };
}

export default async function ProviderPage({ params }: Props) {
  const p = providerBySlug((await params).slug);
  if (!p) notFound();
  return <ProviderProfile slug={p.slug} />;
}
